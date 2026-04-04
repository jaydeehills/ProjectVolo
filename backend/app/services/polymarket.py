import time
import logging
from typing import Optional, List, Tuple
from datetime import datetime, timezone, timedelta

import httpx
from app.models.schemas import Market

logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/markets"
POLYMARKET_BASE_URL = "https://polymarket.com/event"

MIN_VOLUME = 10_000          # $10k minimum volume
MIN_DAYS_TO_CLOSE = 7        # Must close > 7 days from now
CACHE_TTL_SECONDS = 60       # Cache results for 60s
FETCH_LIMIT = 100            # Max per page from Gamma API

# --- In-memory cache ---
_cache: Optional[Tuple[float, List[Market]]] = None


def _cache_is_valid() -> bool:
    if _cache is None:
        return False
    cached_at, _ = _cache
    return (time.monotonic() - cached_at) < CACHE_TTL_SECONDS


def _parse_datetime(raw: Optional[str]) -> Optional[datetime]:
    """Parse an ISO-8601 date string from the Gamma API."""
    if not raw:
        return None
    try:
        # Handle trailing Z and various ISO formats
        cleaned = raw.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except (ValueError, TypeError):
        return None


def _normalize_market(raw: dict) -> Optional[Market]:
    """Convert a raw Gamma API market dict into our clean Market schema.

    Returns None if the market doesn't meet our filters.
    """
    # --- Parse close date and apply minimum-days filter ---
    close_date = _parse_datetime(raw.get("endDate"))
    if close_date is None:
        return None
    now = datetime.now(timezone.utc)
    if close_date <= now + timedelta(days=MIN_DAYS_TO_CLOSE):
        return None

    # --- Volume filter ---
    try:
        volume = float(raw.get("volume", 0) or 0)
    except (ValueError, TypeError):
        volume = 0.0
    if volume < MIN_VOLUME:
        return None

    # --- Extract yes/no prices from the tokens array ---
    tokens = raw.get("tokens", [])
    yes_price = 0.5
    no_price = 0.5
    for token in tokens:
        outcome = (token.get("outcome") or "").lower()
        price = float(token.get("price", 0) or 0)
        if outcome == "yes":
            yes_price = price
        elif outcome == "no":
            no_price = price

    # If there are exactly 2 tokens but no explicit "yes"/"no" labels,
    # treat the first as yes and second as no
    if len(tokens) == 2 and yes_price == 0.5 and no_price == 0.5:
        yes_price = float(tokens[0].get("price", 0.5) or 0.5)
        no_price = float(tokens[1].get("price", 0.5) or 0.5)

    # --- Build the slug-based URL ---
    slug = raw.get("slug", "")
    condition_id = raw.get("conditionId", raw.get("id", ""))
    url = f"{POLYMARKET_BASE_URL}/{slug}" if slug else f"{POLYMARKET_BASE_URL}/{condition_id}"

    return Market(
        market_id=str(raw.get("id", "")),
        question=raw.get("question", ""),
        category=raw.get("category", "Unknown"),
        yes_price=round(yes_price, 4),
        no_price=round(no_price, 4),
        volume=round(volume, 2),
        close_date=close_date,
        url=url,
    )


async def fetch_markets() -> List[Market]:
    """Fetch, filter, and normalize open markets from Polymarket.

    Results are cached for 60 seconds.
    """
    global _cache

    if _cache_is_valid():
        _, cached_markets = _cache
        logger.info("Returning %d cached markets", len(cached_markets))
        return cached_markets

    logger.info("Cache miss — fetching markets from Gamma API")
    all_markets: List[Market] = []
    offset = 0

    async with httpx.AsyncClient(timeout=20.0) as client:
        while True:
            params = {
                "limit": FETCH_LIMIT,
                "offset": offset,
                "active": True,
                "closed": False,
                "order": "volume",
                "ascending": False,
            }
            try:
                resp = await client.get(GAMMA_API_URL, params=params)
                resp.raise_for_status()
            except httpx.TimeoutException:
                logger.error("Gamma API request timed out (offset=%d)", offset)
                break
            except httpx.HTTPStatusError as exc:
                logger.error(
                    "Gamma API returned %d: %s",
                    exc.response.status_code,
                    exc.response.text[:200],
                )
                break

            raw_markets = resp.json()
            if not raw_markets:
                break

            for raw in raw_markets:
                market = _normalize_market(raw)
                if market is not None:
                    all_markets.append(market)

            # The Gamma API sorts by volume desc. Once we see a page where
            # every market is below our volume floor, stop paginating.
            page_volumes = [float(m.get("volume", 0) or 0) for m in raw_markets]
            if all(v < MIN_VOLUME for v in page_volumes):
                logger.info("All markets on page below volume floor, stopping pagination")
                break

            offset += FETCH_LIMIT

            # Safety cap — don't paginate forever
            if offset >= 500:
                break

    logger.info(
        "Fetched %d markets after filtering (volume>$%s, closes>%dd)",
        len(all_markets),
        f"{MIN_VOLUME:,}",
        MIN_DAYS_TO_CLOSE,
    )

    _cache = (time.monotonic(), all_markets)
    return all_markets


async def fetch_market_by_id(market_id: str) -> Optional[Market]:
    """Fetch a single market by ID and normalize it (no caching)."""
    logger.info("Fetching single market: %s", market_id)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{GAMMA_API_URL}/{market_id}")
            if resp.status_code == 404:
                logger.warning("Market %s not found", market_id)
                return None
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("Error fetching market %s: %d", market_id, exc.response.status_code)
        return None
    except httpx.TimeoutException:
        logger.error("Timeout fetching market %s", market_id)
        return None

    return _normalize_market(resp.json())
