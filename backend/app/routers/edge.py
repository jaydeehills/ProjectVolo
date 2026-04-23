import asyncio
import time
from typing import List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from app.services.polymarket import fetch_markets
from app.services.probability_estimator import estimate_probability
from app.services.edge_calculator import calculate_edge
from app.services.agent_logger import log
from app.services.kill_switch import check_agent_enabled
from app.models.schemas import EdgeResult

router = APIRouter()

SCAN_CACHE_TTL = 300  # Return cached scan results for 5 minutes

# Scan-level cache: (monotonic_timestamp, results)
_scan_cache: Optional[Tuple[float, List[EdgeResult]]] = None
_scan_lock = asyncio.Lock()


@router.get("/scan")
async def scan_for_edges():
    """Scan markets and return edge calculations ranked by expected value."""
    check_agent_enabled()
    global _scan_cache

    # Return cached scan if still fresh
    if _scan_cache is not None:
        cached_at, cached_results = _scan_cache
        if (time.monotonic() - cached_at) < SCAN_CACHE_TTL:
            log("info", "edge", f"Returning cached scan ({len(cached_results)} results)")
            return {"edges": [r.model_dump(mode="json") for r in cached_results]}

    # If a scan is already running, return last cached result (or wait if none yet)
    if _scan_lock.locked():
        log("info", "edge", "Scan already in progress — returning last cached result")
        if _scan_cache is not None:
            _, cached_results = _scan_cache
            return {"edges": [r.model_dump(mode="json") for r in cached_results]}
        # No cache yet and scan running — wait for the lock to finish
        async with _scan_lock:
            _, cached_results = _scan_cache
            return {"edges": [r.model_dump(mode="json") for r in cached_results]}

    async with _scan_lock:
        log("info", "edge", "Starting edge scan")
        try:
            markets = await fetch_markets()
        except Exception as exc:
            log("error", "edge", f"Failed to fetch markets: {exc}")
            raise HTTPException(status_code=502, detail="Failed to fetch markets")

        results = []
        for market in markets:
            try:
                estimate = await estimate_probability(
                    market_id=market.market_id,
                    question=market.question,
                    category=market.category,
                    yes_price=market.yes_price,
                )
                edge_result = calculate_edge(market, estimate)
                results.append(edge_result)
                if edge_result.signal != "HOLD":
                    log(
                        "signal",
                        "edge",
                        f"{edge_result.signal} on '{market.question[:60]}' "
                        f"(edge: {edge_result.edge:+.1%}, EV: {edge_result.expected_value:.4f})",
                        {"market_id": market.market_id, "signal": edge_result.signal},
                    )
            except Exception as exc:
                log("error", "edge", f"Error analyzing market {market.market_id}: {exc}")

        results.sort(key=lambda r: r.expected_value, reverse=True)
        log("info", "edge", f"Scan complete. {sum(1 for r in results if r.signal != 'HOLD')} signals found")
        _scan_cache = (time.monotonic(), results)
        return {"edges": [r.model_dump(mode="json") for r in results]}
