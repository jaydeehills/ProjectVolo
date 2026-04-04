import json
import logging
import os
import time
from typing import Optional, Dict, Tuple

import anthropic
from app.models.schemas import ProbabilityEstimate
from app.services.database import save_estimate

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"
ESTIMATE_CACHE_TTL = 3600  # Cache estimates for 60 minutes

# In-memory cache: market_id -> (monotonic_timestamp, estimate)
_estimate_cache: Dict[str, Tuple[float, ProbabilityEstimate]] = {}

SYSTEM_PROMPT = """\
You are a calibrated forecasting engine. Your job is to estimate the probability \
that a prediction-market question resolves YES.

CALIBRATION RULES — follow these strictly:
1. **Base rates first.** Before considering any question-specific evidence, \
identify the appropriate reference class and its historical base rate. State it explicitly.
2. **Update from evidence.** Adjust the base rate using specific, verifiable \
factors (polls, schedules, precedent, expert consensus). Each factor should \
push the probability in a stated direction by a stated amount.
3. **Account for overconfidence.** Humans and LLMs are systematically \
overconfident. After forming your estimate, regress it toward 50% by 5-15% \
(more regression when evidence is thin).
4. **Respect extremes.** Only output probabilities below 0.05 or above 0.95 \
when the outcome is nearly certain with strong, concrete evidence — not \
merely "very likely."
5. **News recency.** Your training data has a cutoff. If the question depends \
on events after your knowledge cutoff, express extra uncertainty and note that \
your information may be outdated.
6. **State uncertainty honestly.** If you have little relevant knowledge, say \
so. A wider confidence band (lower confidence) is better than a false precision.

OUTPUT FORMAT — respond with **only** a JSON object, no markdown fences:
{
  "estimated_probability": <float 0.01-0.99>,
  "confidence": "<low|medium|high>",
  "reasoning": "<2-4 sentence explanation of your reasoning chain>",
  "key_factors": ["<factor 1>", "<factor 2>", ...]
}

Rules for the fields:
- estimated_probability: your best calibrated estimate that YES resolves.
- confidence: "low" = you have little data or the question is ambiguous; \
"medium" = reasonable evidence but notable uncertainty; "high" = strong \
evidence and clear resolution criteria.
- reasoning: show your work — state the base rate, your key evidence updates, \
and the overconfidence adjustment you applied.
- key_factors: 3-6 concrete factors that most influenced your estimate."""

USER_PROMPT_TEMPLATE = """\
Prediction market question: {question}

Category: {category}

Additional context: {context}

Estimate the probability that this resolves YES."""


def _build_user_prompt(question: str, category: str, context: str) -> str:
    return USER_PROMPT_TEMPLATE.format(
        question=question,
        category=category or "Unknown",
        context=context or "None provided.",
    )


def _parse_response(text: str) -> dict:
    """Parse the JSON response from Claude, handling minor formatting issues."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n")
        last_fence = cleaned.rfind("```")
        cleaned = cleaned[first_newline + 1 : last_fence].strip()
    return json.loads(cleaned)


def _clamp(value: float, lo: float = 0.01, hi: float = 0.99) -> float:
    return max(lo, min(hi, value))


def _get_cached(market_id: str) -> Optional[ProbabilityEstimate]:
    """Return a cached estimate if it exists and hasn't expired."""
    entry = _estimate_cache.get(market_id)
    if entry is None:
        return None
    cached_at, estimate = entry
    if (time.monotonic() - cached_at) > ESTIMATE_CACHE_TTL:
        del _estimate_cache[market_id]
        return None
    return estimate


async def estimate_probability(
    market_id: str,
    question: str,
    context: str = "",
    category: str = "",
) -> ProbabilityEstimate:
    """Call Claude to estimate the probability of a market question resolving YES.

    Returns a cached result if one exists within the TTL window.
    Persists new results to SQLite.
    """
    cached = _get_cached(market_id)
    if cached is not None:
        logger.debug("Cache hit for market %s", market_id)
        return cached

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set — returning stub estimate")
        est = _stub_estimate(market_id, question)
        _estimate_cache[market_id] = (time.monotonic(), est)
        return est

    client = anthropic.AsyncAnthropic(api_key=api_key)

    user_prompt = _build_user_prompt(question, category, context)
    logger.info("Requesting estimate from %s for: %s", MODEL, question[:80])

    try:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        raise RuntimeError(f"Anthropic API error: {exc}") from exc

    raw_text = message.content[0].text
    logger.debug("Raw Claude response: %s", raw_text[:500])

    try:
        parsed = _parse_response(raw_text)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse Claude response: %s — raw: %s", exc, raw_text[:300])
        raise RuntimeError("Failed to parse probability estimate from Claude") from exc

    confidence = parsed.get("confidence", "medium")
    if confidence not in ("low", "medium", "high"):
        confidence = "medium"

    key_factors = parsed.get("key_factors", [])
    if not isinstance(key_factors, list):
        key_factors = [str(key_factors)]

    estimate = ProbabilityEstimate(
        market_id=market_id,
        question=question,
        estimated_probability=_clamp(float(parsed["estimated_probability"])),
        confidence=confidence,
        reasoning=str(parsed.get("reasoning", "")),
        key_factors=key_factors,
    )

    save_estimate(estimate)
    _estimate_cache[market_id] = (time.monotonic(), estimate)
    logger.info(
        "Estimate for %s: prob=%.3f confidence=%s",
        market_id,
        estimate.estimated_probability,
        estimate.confidence,
    )
    return estimate


def _stub_estimate(market_id: str, question: str) -> ProbabilityEstimate:
    """Fallback when no API key is configured."""
    import random

    estimate = ProbabilityEstimate(
        market_id=market_id,
        question=question,
        estimated_probability=round(random.uniform(0.2, 0.8), 3),
        confidence="low",
        reasoning=(
            "[STUB] No ANTHROPIC_API_KEY configured. "
            "This is a random placeholder. Set the key in backend/.env "
            "to enable real AI estimates."
        ),
        key_factors=["No API key configured — stub response"],
    )
    save_estimate(estimate)
    return estimate
