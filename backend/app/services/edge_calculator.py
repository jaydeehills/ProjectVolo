from datetime import datetime, timezone
from app.models.schemas import EdgeResult, Market, ProbabilityEstimate

EDGE_THRESHOLD = 0.05  # Minimum edge to generate a signal

CONFIDENCE_WEIGHTS = {
    "low": 0.3,
    "medium": 0.6,
    "high": 0.85,
}


def calculate_edge(market: Market, estimate: ProbabilityEstimate) -> EdgeResult:
    """
    Compare our estimated probability against the market price
    to find mispriced markets.
    """
    market_price_yes = market.yes_price
    est_prob = estimate.estimated_probability
    conf_weight = CONFIDENCE_WEIGHTS.get(estimate.confidence, 0.5)

    edge = est_prob - market_price_yes
    edge_pct = (edge / market_price_yes * 100) if market_price_yes > 0 else 0

    # Determine signal — require both sufficient edge and confidence
    if edge > EDGE_THRESHOLD and conf_weight >= 0.5:
        signal = "BUY_YES"
    elif edge < -EDGE_THRESHOLD and conf_weight >= 0.5:
        signal = "BUY_NO"
    else:
        signal = "HOLD"

    # Expected value = |edge| * confidence weight
    expected_value = abs(edge) * conf_weight

    return EdgeResult(
        market_id=market.market_id,
        question=market.question,
        category=market.category,
        market_price=market_price_yes,
        estimated_probability=est_prob,
        edge=round(edge, 4),
        edge_percentage=round(edge_pct, 2),
        confidence=estimate.confidence,
        signal=signal,
        expected_value=round(expected_value, 4),
        reasoning=estimate.reasoning,
        key_factors=estimate.key_factors,
        estimated_at=datetime.now(timezone.utc).isoformat(),
    )
