from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import EstimateRequest
from app.services.probability_estimator import estimate_probability
from app.services.database import get_estimates_for_market, get_recent_estimates
from app.services.agent_logger import log
from app.services.rate_limiter import estimator_limiter
from app.services.kill_switch import check_agent_enabled

router = APIRouter()


@router.post("/estimate")
async def create_estimate(req: EstimateRequest):
    """Run the AI probability estimator on a market question."""
    check_agent_enabled()
    estimator_limiter.check()

    log("analysis", "estimator", f"Estimating probability for: {req.question}")
    try:
        estimate = await estimate_probability(
            market_id=req.market_id,
            question=req.question,
            context=req.context,
            category=req.category,
            force_refresh=req.force_refresh,
        )
    except RuntimeError as exc:
        log("error", "estimator", f"Estimation failed: {exc}")
        raise HTTPException(status_code=502, detail=str(exc))

    log(
        "analysis",
        "estimator",
        f"Estimate: {estimate.estimated_probability:.1%} "
        f"(confidence: {estimate.confidence})",
        {"market_id": req.market_id},
    )
    return estimate.model_dump(mode="json")


@router.get("/history/{market_id}")
async def get_market_history(market_id: str):
    """Return all historical estimates for a market."""
    rows = get_estimates_for_market(market_id)
    return {"market_id": market_id, "estimates": rows}


@router.get("/history")
async def get_all_history(limit: int = Query(50, ge=1, le=500)):
    """Return recent estimates across all markets."""
    rows = get_recent_estimates(limit)
    return {"estimates": rows}
