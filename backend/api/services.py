"""Cache and background refresh for external Steam data.

Stale-while-revalidate: a catalog request never waits for Steam. It gets
whatever is already stored in ``SteamSnapshot``; if the snapshot is stale,
a background thread refreshes it. This keeps the first page load independent
of the speed and availability of external services.
"""

import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.core.exceptions import ObjectDoesNotExist
from django.db import connections
from django.utils import timezone

from . import steam
from .models import Game, SteamSnapshot

logger = logging.getLogger(__name__)

#: How long a snapshot stays fresh before going to background refresh.
STEAM_TTL = timedelta(minutes=15)

#: How many snapshots one background pass refreshes in parallel.
MAX_WORKERS = 6

#: How many genre-based recommendations to return per game.
RECOMMENDATIONS_LIMIT = 4

#: appids that are being refreshed right now (dedupe guard).
_in_flight_lock = threading.Lock()
_in_flight_appids: set[int] = set()


def store_url(appid: int) -> str:
    return f"https://store.steampowered.com/app/{appid}/"


def get_snapshot(game: Game) -> SteamSnapshot | None:
    """Return the game's snapshot without an extra query when absent."""
    try:
        return game.steam_snapshot
    except ObjectDoesNotExist:
        return None


def is_stale(snapshot: SteamSnapshot | None) -> bool:
    if snapshot is None:
        return True
    return snapshot.refreshed_at < timezone.now() - STEAM_TTL


def needs_refresh(game: Game) -> bool:
    return bool(game.steam_appid) and is_stale(get_snapshot(game))


def _claim(appid: int) -> bool:
    with _in_flight_lock:
        if appid in _in_flight_appids:
            return False
        _in_flight_appids.add(appid)
        return True


def _release(appid: int) -> None:
    with _in_flight_lock:
        _in_flight_appids.discard(appid)


def ensure_snapshots_async(games) -> None:
    """Start a background refresh of stale snapshots and return immediately.

    While the refresh runs, the API serves the previous data (even if old);
    the ``is_stale`` flag in the response tells the client it is updating.
    """
    appids = []
    for game in games:
        if needs_refresh(game) and _claim(game.steam_appid):
            appids.append(game.steam_appid)

    if not appids:
        return

    thread = threading.Thread(
        target=_refresh_appids,
        args=(appids,),
        name="steam-refresh",
        daemon=True,
    )
    try:
        thread.start()
    except Exception:  # noqa: BLE001 - never leave appids claimed forever
        logger.exception("Failed to start the background Steam refresh")
        for appid in appids:
            _release(appid)


def _refresh_worker(appid: int) -> None:
    """Refresh a snapshot in a pool thread and close that thread's connection."""
    try:
        refresh_appid(appid)
    finally:
        connections.close_all()


def _refresh_appids(appids: list[int]) -> None:
    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS, thread_name_prefix="steam"
    ) as pool:
        list(pool.map(_refresh_worker, appids))


def _fetch_payload(appid: int) -> dict | None:
    """Collect Steam responses; any partial successes are merged."""
    payload: dict = {}
    succeeded = False

    for fetcher in (
        steam.fetch_current_players,
        steam.fetch_rating,
        steam.fetch_last_updated,
    ):
        result = fetcher(appid)
        if result is not None:
            payload.update(result)
            succeeded = True

    return payload if succeeded else None


def refresh_appid(appid: int) -> None:
    """Refresh one appid's snapshot. Network errors are only logged.

    If every external request failed, the snapshot is not saved: the old
    ``refreshed_at`` stays, so the data keeps being treated as stale.
    """
    try:
        payload = _fetch_payload(appid)
        if payload is None:
            return

        game = Game.objects.filter(steam_appid=appid).first()
        if game is None:
            return

        snapshot, _ = SteamSnapshot.objects.get_or_create(game=game)
        for field, value in payload.items():
            setattr(snapshot, field, value)
        # refreshed_at is updated automatically (auto_now).
        snapshot.save()
    except Exception:  # noqa: BLE001 - a background task must not kill the process
        logger.exception("Failed to refresh Steam data for appid=%s", appid)
    finally:
        _release(appid)


def refresh_games_sync(games) -> None:
    """Synchronous refresh (for the management command and cache pre-warming)."""
    appids = [game.steam_appid for game in games if game.steam_appid]
    if not appids:
        return

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS, thread_name_prefix="steam"
    ) as pool:
        list(pool.map(_refresh_worker, appids))


def recommendations_for(
    games, limit: int = RECOMMENDATIONS_LIMIT
) -> dict[int, list[Game]]:
    """Genre-based recommendations for a set of games (usually a catalog page).

    Returns ``{game_id: [Game, ...]}``. Computed with one query for the whole
    page: candidates are fetched at once and genre intersections are done in
    Python.
    """
    games = list(games)
    if not games:
        return {}

    page_genres: dict[int, set[int]] = {}
    genre_ids: set[int] = set()

    for game in games:
        own = {genre.id for genre in game.genres.all()}
        page_genres[game.id] = own
        genre_ids.update(own)

    if not genre_ids:
        return {game.id: [] for game in games}

    candidates = {}
    for candidate in (
        Game.objects.filter(genres__in=genre_ids)
        .prefetch_related("genres")
        .distinct()
    ):
        candidates[candidate.id] = (
            candidate,
            {genre.id for genre in candidate.genres.all()},
        )

    result: dict[int, list[Game]] = {}
    for game in games:
        own = page_genres[game.id]
        scored = [
            (len(own & candidate_genres), candidate.title.casefold(), candidate)
            for candidate_id, (candidate, candidate_genres) in candidates.items()
            if candidate_id != game.id and own & candidate_genres
        ]
        # More shared genres first, then by title - a stable order.
        scored.sort(key=lambda item: (-item[0], item[1]))
        result[game.id] = [item[2] for item in scored[:limit]]

    return result
