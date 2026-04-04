from fastapi import APIRouter, HTTPException
from app.services.polymarket import fetch_markets
from app.services.probability_estimator import estimate_probability
from app.services.edge_calculator import calculate_edge
from app.services.agent_logger import log
from app.services.kill_switch import check_agent_enabled

router = APIRouter()


@router.get("/")
async def get_trade_signals():
    """Return only actionable trade signals (non-HOLD only), ranked by EV."""
    check_agent_enabled()
    log("info", "signals", "Generating trade signals")
    try:
        markets = await fetch_markets()
    except Exception as exc:
        log("error", "signals", f"Failed to fetch markets: {exc}")
        raise HTTPException(status_code=502, detail="Failed to fetch markets")

    signals = []
    for market in markets:
        try:
            estimate = await estimate_probability(
                market_id=market.market_id,
                question=market.question,
                category=market.category,
            )
            edge_result = calculate_edge(market, estimate)
            if edge_result.signal != "HOLD":
                signals.append(edge_result)
        except Exception as exc:
            log("error", "signals", f"Error analyzing market {market.market_id}: {exc}")

    signals.sort(key=lambda s: s.expected_value, reverse=True)
    log("info", "signals", f"Generated {len(signals)} actionable signals")
    return {"signals": [s.model_dump(mode="json") for s in signals]}
