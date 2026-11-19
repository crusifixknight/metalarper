"""Кэш и фоновое обновление внешних данных Steam.

Стратегия stale-while-revalidate: запрос к каталогу никогда не ждёт Steam.
Он получает то, что уже лежит в ``SteamSnapshot``, а если снимок устарел,
обновление запускается в фоновом потоке. Так первая загрузка страницы не
зависит от скорости и доступности внешних сервисов.
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

#: Через сколько снимок считается устаревшим и уходит в фоновое обновление.
STEAM_TTL = timedelta(minutes=15)

#: Сколько снимков обновляем параллельно в одном фоновом проходе.
MAX_WORKERS = 6

#: Сколько рекомендаций по жанрам отдаём для одной игры.
RECOMMENDATIONS_LIMIT = 4

#: appid, которые прямо сейчас обновляются (защита от дублирующих запросов).
_in_flight_lock = threading.Lock()
_in_flight_appids: set[int] = set()


def store_url(appid: int) -> str:
    return f"https://store.steampowered.com/app/{appid}/"


def get_snapshot(game: Game) -> SteamSnapshot | None:
    """Снимок игры без лишнего запроса при отсутствии строки."""
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
    """Запускает фоновое обновление устаревших снимков и сразу возвращает управление.

    Пока фон работает, API отдаёт предыдущие данные (даже если они старые);
    признак ``is_stale`` в ответе сообщает клиенту, что данные обновляются.
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
    except Exception:  # noqa: BLE001 — не оставляем appid «занятыми» навсегда
        logger.exception("Не удалось запустить фоновое обновление Steam")
        for appid in appids:
            _release(appid)


def _refresh_worker(appid: int) -> None:
    """Обновляет снимок в потоке пула и закрывает соединение этого потока."""
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
    """Собирает ответы Steam; любые частичные успехи объединяются."""
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
    """Обновляет снимок одного appid. Сетевые ошибки только логируются.

    Если все внешние запросы упали, снимок не сохраняется — старое значение
    ``refreshed_at`` останется, и данные продолжат считаться устаревшими.
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
        # refreshed_at обновляется автоматически (auto_now).
        snapshot.save()
    except Exception:  # noqa: BLE001 — фон не должен ронять процесс
        logger.exception("Не удалось обновить Steam-данные для appid=%s", appid)
    finally:
        _release(appid)


def refresh_games_sync(games) -> None:
    """Синхронное обновление (для management-команды и прогрева кэша)."""
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
    """Рекомендации по жанрам для набора игр (обычно — страницы каталога).

    Возвращает ``{game_id: [Game, ...]}``. Считается одним запросом на всю
    страницу: кандидаты вычитываются целиком, пересечение жанров — в Python.
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
        # Сначала больше общих жанров, затем по названию — стабильный порядок.
        scored.sort(key=lambda item: (-item[0], item[1]))
        result[game.id] = [item[2] for item in scored[:limit]]

    return result
