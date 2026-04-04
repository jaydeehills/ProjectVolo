from fastapi import APIRouter, HTTPException
from app.services.polymarket import fetch_markets, fetch_market_by_id
from app.services.agent_logger import log

router = APIRouter()


@router.get("/")
async def list_markets():
    """Return all open markets that pass volume and close-date filters."""
    log("info", "markets", "Fetching filtered markets from Polymarket")
    try:
        markets = await fetch_markets()
    except Exception as exc:
        log("error", "markets", f"Failed to fetch markets: {exc}")
        raise HTTPException(status_code=502, detail="Failed to fetch markets from Polymarket")
    log("info", "markets", f"Returning {len(markets)} markets")
    return {"markets": [m.model_dump(mode="json") for m in markets]}


@router.get("/{market_id}")
async def get_market(market_id: str):
    """Return a single market by ID."""
    log("info", "markets", f"Fetching market {market_id}")
    try:
        market = await fetch_market_by_id(market_id)
    except Exception as exc:
        log("error", "markets", f"Failed to fetch market {market_id}: {exc}")
        raise HTTPException(status_code=502, detail="Failed to fetch market from Polymarket")
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    return market.model_dump(mode="json")
