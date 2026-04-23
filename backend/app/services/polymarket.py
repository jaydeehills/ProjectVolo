import json
import time
import logging
from typing import Optional, List, Tuple
from datetime import datetime, timezone, timedelta

import httpx
from app.models.schemas import Market

logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/events"
POLYMARKET_BASE_URL = "https://polymarket.com/event"

MIN_VOLUME = 500_000         # $500k minimum volume (applied at event level)
MIN_DAYS_TO_CLOSE = 7        # Must close > 7 days from now
CACHE_TTL_SECONDS = 60       # Cache results for 60s
FETCH_LIMIT = 100            # Max per page from Gamma API

# --- Category inference from event ticker ---
# The /events endpoint carries no category field; we derive one from the
# URL-safe ticker slug using keyword matching. Order matters — first match wins.
_TICKER_CATEGORIES: List[Tuple[List[str], str]] = [
    (
        ["nba", "nfl", "nhl", "mlb", "nascar", "soccer", "football",
         "cricket", "rugby", "tennis", "golf", "ufc", "boxing",
         "esports", "playoff", "championship", "tournament", "league",
         "sports", "olympic"],
        "Sports",
    ),
    (
        ["bitcoin", "btc", "ethereum", "eth", "crypto", "defi",
         "nft", "solana", "sol", "doge", "xrp", "coinbase"],
        "Crypto",
    ),
    (
        ["president", "election", "senate", "congress", "democrat",
         "republican", "gop", "vote", "ballot", "nominee", "political",
         "trump", "biden", "harris", "primary", "inaugurate"],
        "Politics",
    ),
    (
        ["fed", "gdp", "inflation", "interest-rate", "recession",
         "unemployment", "economy", "economic", "stock", "nasdaq",
         "dow", "sp500", "market-cap", "rate-cut", "rate-hike"],
        "Economics",
    ),
    (
        ["oscar", "emmy", "grammy", "award", "movie", "film", "box-office",
         "music", "album", "celebrity", "entertainment", "tv", "streaming"],
        "Entertainment",
    ),
    (
        ["weather", "temperature", "hurricane", "earthquake", "flood",
         "wildfire", "climate", "disaster"],
        "Weather",
    ),
    (
        ["spacex", "nasa", "launch", "rocket", "satellite", "iss",
         "moon", "mars", "asteroid"],
        "Science",
    ),
]


def _category_from_ticker(ticker: str) -> str:
    """Infer a display category from a Gamma API event ticker/slug."""
    t = ticker.lower()
    for keywords, label in _TICKER_CATEGORIES:
        if any(k in t for k in keywords):
            return label
    return "Other"


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


def _normalize_event(raw_event: dict, raw_market: dict) -> Optional[Market]:
    """Convert a Gamma event + one of its nested markets into our Market schema.

    The Gamma /events endpoint is used instead of /markets so we get the
    event-level slug, which is what Polymarket's /event/ URL route requires.
    Using the market-level slug in that route produces a 404.

    Returns None if the market doesn't meet our filters.
    """
    # --- Event-level status filters ---
    if raw_event.get("closed") is True:
        return None
    if raw_event.get("archived") is True:
        return None

    # --- Market-level status filters ---
    if raw_market.get("closed") is True:
        return None
    if raw_market.get("archived") is True:
        return None

    # --- endDate filters (event and market level) ---
    now = datetime.now(timezone.utc)
    close_date = _parse_datetime(raw_event.get("endDate"))
    if close_date is None:
        return None
    if close_date <= now + timedelta(days=MIN_DAYS_TO_CLOSE):
        return None
    # Market-level endDate may differ from event's; apply same gate if present
    market_end = _parse_datetime(raw_market.get("endDate"))
    if market_end is not None and market_end <= now:
        return None

    # --- Volume filter at event level ---
    try:
        volume = float(raw_event.get("volume", 0) or 0)
    except (ValueError, TypeError):
        volume = 0.0
    if volume < MIN_VOLUME:
        return None

    # --- Extract yes/no prices from the market's parallel outcomes arrays ---
    # The Gamma API returns outcomes and outcomePrices as JSON-encoded strings,
    # e.g. "[\"Yes\", \"No\"]" — parse them before use.
    outcomes_raw = raw_market.get("outcomes") or "[]"
    outcome_prices_raw = raw_market.get("outcomePrices") or "[]"
    try:
        outcomes = json.loads(outcomes_raw) if isinstance(outcomes_raw, str) else (outcomes_raw or [])
        outcome_prices = json.loads(outcome_prices_raw) if isinstance(outcome_prices_raw, str) else (outcome_prices_raw or [])
    except (json.JSONDecodeError, TypeError):
        outcomes = []
        outcome_prices = []
    if not isinstance(outcome_prices, list):
        logger.warning(
            "Market %s has non-list outcomePrices (%r) — skipping",
            raw_market.get("id"),
            outcome_prices,
        )
        return None
    yes_price = 0.5
    no_price = 0.5
    for outcome, price_str in zip(outcomes, outcome_prices):
        try:
            price = float(price_str or 0)
        except (ValueError, TypeError):
            price = 0.0
        if outcome.lower() == "yes":
            yes_price = price
        elif outcome.lower() == "no":
            no_price = price

    # If outcomes aren't labelled "yes"/"no" but there are exactly 2,
    # treat the first as yes and second as no.
    if yes_price == 0.5 and no_price == 0.5 and len(outcome_prices) == 2:
        try:
            yes_price = float(outcome_prices[0] or 0.5)
            no_price = float(outcome_prices[1] or 0.5)
        except (ValueError, TypeError):
            pass

    # --- Build URL from the EVENT slug (not the market slug) ---
    # polymarket.com/event/{event-slug} is the correct format.
    event_slug = raw_event.get("slug", "")
    event_id = str(raw_event.get("id", ""))
    url = (
        f"{POLYMARKET_BASE_URL}/{event_slug}"
        if event_slug
        else f"{POLYMARKET_BASE_URL}/{event_id}"
    )

    return Market(
        market_id=str(raw_market.get("id", "")),  # market-level ID for per-market caching
        question=raw_market.get("question", raw_event.get("title", "")),
        category=_category_from_ticker(raw_event.get("ticker", "")),
        event_title=raw_event.get("title", ""),
        yes_price=round(yes_price, 4),
        no_price=round(no_price, 4),
        volume=round(volume, 2),
        close_date=close_date,
        url=url,
    )


async def fetch_markets() -> List[Market]:
    """Fetch, filter, and normalize open markets from Polymarket.

    Calls the Gamma /events endpoint (not /markets) to obtain event-level
    slugs for correct URL construction. Each event may contain multiple
    nested markets; one Market entry is created per nested market.

    Results are cached for 60 seconds.
    """
    global _cache

    if _cache_is_valid():
        _, cached_markets = _cache
        logger.info("Returning %d cached markets", len(cached_markets))
        return cached_markets

    logger.info("Cache miss — fetching events from Gamma API")
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

            raw_events = resp.json()
            if not raw_events:
                break

            for raw_event in raw_events:
                for raw_market in raw_event.get("markets", []):
                    market = _normalize_event(raw_event, raw_market)
                    if market is not None:
                        all_markets.append(market)

            # Events are sorted by volume desc. Stop once a full page is
            # below the volume floor.
            page_volumes = [float(e.get("volume", 0) or 0) for e in raw_events]
            if all(v < MIN_VOLUME for v in page_volumes):
                logger.info("All events on page below volume floor, stopping pagination")
                break

            offset += FETCH_LIMIT

            # Safety cap — don't paginate forever
            if offset >= 500:
                break

    logger.info(
        "Fetched %d markets after filtering (event volume>$%s, closes>%dd)",
        len(all_markets),
        f"{MIN_VOLUME:,}",
        MIN_DAYS_TO_CLOSE,
    )

    _cache = (time.monotonic(), all_markets)
    return all_markets


async def fetch_market_by_id(market_id: str) -> Optional[Market]:
    """Fetch a single market by ID from the events endpoint (no caching).

    Searches events that contain a nested market with the given ID.
    """
    logger.info("Fetching single market: %s", market_id)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # The events endpoint supports filtering by nested market ID
            resp = await client.get(GAMMA_API_URL, params={"markets": market_id})
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

    raw_events = resp.json()
    if not raw_events:
        return None

    # Find the specific nested market within the returned events
    for raw_event in raw_events:
        for raw_market in raw_event.get("markets", []):
            if str(raw_market.get("id", "")) == str(market_id):
                return _normalize_event(raw_event, raw_market)

    return None
