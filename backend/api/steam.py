"""Client for public Steam endpoints (no API key required).

Every fetch function returns a dict of ``SteamSnapshot`` fields or ``None``
when the request failed. Exceptions never propagate: an unavailable external
service must not break the catalog.
"""

import json
import logging
import urllib.parse
import urllib.request
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 5
USER_AGENT = "Metalarper/1.0"

STEAM_API = "https://api.steampowered.com"
STEAM_STORE = "https://store.steampowered.com"


def stars_from_reviews(positive: int, negative: int) -> float | None:
    """Convert positive/negative review counts into a 0-5 star rating."""
    total = positive + negative
    if total <= 0:
        return None
    return round(5 * positive / total, 1)


def stars_from_percent(percent: int) -> float | None:
    """Convert the share of positive reviews into a 0-5 star rating."""
    if percent < 0 or percent > 100:
        return None
    return round(5 * percent / 100, 1)


def _get_json(url: str):
    """GET request with a timeout; returns parsed JSON."""
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_current_players(appid: int) -> dict | None:
    """How many people are playing right now (public endpoint, no key)."""
    url = (
        f"{STEAM_API}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/"
        f"?appid={appid}"
    )
    try:
        data = _get_json(url)
        response = data.get("response") or {}
        count = response.get("player_count")
        if response.get("result") != 1 or count is None:
            return None
        return {"current_players": int(count)}
    except Exception as exc:  # noqa: BLE001 - external service, any error = no data
        logger.warning("Steam players fetch failed for appid=%s: %s", appid, exc)
        return None


def _rating_from_store_browse(appid: int) -> dict | None:
    """Review summary via IStoreBrowseService (public, no key).

    Returns Steam's global summary: review count and the percentage of
    positive reviews. Returns None for an unavailable game or service.
    """
    payload = {
        "ids": [{"appid": appid}],
        "context": {"language": "english", "country_code": "US"},
        "data_request": {"include_reviews": True},
    }
    url = (
        f"{STEAM_API}/IStoreBrowseService/GetItems/v1/"
        f"?input_json={urllib.parse.quote(json.dumps(payload))}"
    )
    try:
        data = _get_json(url)
        items = (data.get("response") or {}).get("store_items") or []
        if not items:
            return None

        summary = (items[0].get("reviews") or {}).get("summary_filtered") or {}
        count = int(summary.get("review_count") or 0)
        percent = summary.get("percent_positive")

        if percent is None:
            return {"rating_stars": None, "rating_votes": count}

        return {
            "rating_stars": stars_from_percent(int(percent)) if count else None,
            "rating_votes": count,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Steam store reviews fetch failed for appid=%s: %s", appid, exc
        )
        return None


def _rating_from_appreviews(appid: int) -> dict | None:
    """Fallback source: the classic store reviews endpoint."""
    url = (
        f"{STEAM_STORE}/appreviews/{appid}"
        "?json=1&language=all&purchase_type=all&num_per_page=0"
    )
    try:
        data = _get_json(url)
        if data.get("success") != 1:
            return None
        summary = data.get("query_summary") or {}
        positive = int(summary.get("total_positive", 0))
        negative = int(summary.get("total_negative", 0))
        return {
            "rating_stars": stars_from_reviews(positive, negative),
            "rating_votes": positive + negative,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Steam appreviews fetch failed for appid=%s: %s", appid, exc
        )
        return None


def fetch_rating(appid: int) -> dict | None:
    """Steam review rating: stars plus the number of reviews."""
    return _rating_from_store_browse(appid) or _rating_from_appreviews(appid)


def fetch_last_updated(appid: int) -> dict | None:
    """Date of the latest news item / patch note from Steam News.

    Steam does not expose patch dates as a separate field, so the game's last
    update date is taken from the most recent entry in its news feed.
    """
    url = (
        f"{STEAM_API}/ISteamNews/GetNewsForApp/v2/"
        f"?appid={appid}&count=1&maxlength=0&format=json"
    )
    try:
        data = _get_json(url)
        items = (data.get("appnews") or {}).get("newsitems") or []
        if not items or items[0].get("date") is None:
            return {"last_updated": None}
        timestamp = int(items[0]["date"])
        return {"last_updated": datetime.fromtimestamp(timestamp, tz=timezone.utc)}
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Steam news fetch failed for appid=%s: %s", appid, exc
        )
        return None
