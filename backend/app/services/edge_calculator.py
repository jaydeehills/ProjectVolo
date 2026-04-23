from datetime import datetime, timezone
from app.models.schemas import EdgeResult, Market, ProbabilityEstimate

EDGE_THRESHOLD_BUY_YES = 0.08  # Minimum edge for BUY YES signal
EDGE_THRESHOLD_BUY_NO  = 0.08  # Minimum edge for BUY NO signal (price must be 8% above estimate)
PRICE_FLOOR = 0.03             # Skip signals when market is near-certain NO (<3¢)
PRICE_CEILING = 0.97           # Skip signals when market is near-certain YES (>97¢)

CONFIDENCE_WEIGHTS = {
    "low": 0.15,
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

    # Near-certain markets — AI estimates are unreliable at extremes; force HOLD
    extreme_price = market_price_yes < PRICE_FLOOR or market_price_yes > PRICE_CEILING

    edge = est_prob - market_price_yes
    edge_pct = (edge / market_price_yes * 100) if market_price_yes > 0 else 0

    # Determine signal — require sufficient edge, confidence, and non-extreme price
    if not extreme_price and edge > EDGE_THRESHOLD_BUY_YES and conf_weight >= 0.5:
        signal = "BUY_YES"
    elif not extreme_price and edge < -EDGE_THRESHOLD_BUY_NO and conf_weight >= 0.5:
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
