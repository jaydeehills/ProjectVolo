from fastapi import APIRouter, HTTPException
from app.services.polymarket import fetch_markets
from app.services.probability_estimator import estimate_probability
from app.services.edge_calculator import calculate_edge
from app.services.agent_logger import log
from app.services.kill_switch import check_agent_enabled

router = APIRouter()


@router.get("/scan")
async def scan_for_edges():
    """Scan markets and return edge calculations ranked by expected value."""
    check_agent_enabled()
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
    return {"edges": [r.model_dump(mode="json") for r in results]}
