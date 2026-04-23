import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Tuple

import anthropic
from app.models.schemas import ProbabilityEstimate
from app.services.database import save_estimate, get_recent_estimates
from app.services.agent_logger import log as agent_log

logger = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
ESTIMATE_CACHE_TTL = 86400  # Cache estimates for 24 hours

# In-memory cache: market_id -> (monotonic_timestamp, estimate)
_estimate_cache: Dict[str, Tuple[float, ProbabilityEstimate]] = {}


def _warm_cache_from_db() -> None:
    """Populate the in-memory cache from SQLite on startup.

    Loads all estimates written within the last ESTIMATE_CACHE_TTL seconds so
    that a backend restart does not trigger a full re-estimation of all markets.
    Rows are returned newest-first; the first row seen for each market_id is
    kept, ensuring the most recent estimate wins.
    """
    now_wall = datetime.now(timezone.utc)
    now_mono = time.monotonic()
    loaded = 0
    for row in get_recent_estimates(limit=10_000):
        try:
            age = (now_wall - datetime.fromisoformat(row["created_at"])).total_seconds()
        except (ValueError, KeyError) as exc:
            logger.warning("Skipping malformed DB row during cache warm: %s", exc)
            continue
        if age >= ESTIMATE_CACHE_TTL:
            break  # rows are newest-first; once one is expired, the rest are too
        if row["market_id"] in _estimate_cache:
            continue  # already have a newer entry for this market
        try:
            estimate = ProbabilityEstimate(
                market_id=row["market_id"],
                question=row["question"],
                estimated_probability=row["estimated_probability"],
                confidence=row["confidence"],
                reasoning=row["reasoning"],
                key_factors=row["key_factors"],
            )
            _estimate_cache[row["market_id"]] = (now_mono - age, estimate)
            loaded += 1
        except Exception as exc:
            logger.warning("Skipping invalid DB row during cache warm: %s", exc)
    if loaded:
        logger.info("Warmed estimate cache from DB: %d entries loaded", loaded)


_warm_cache_from_db()


SYSTEM_PROMPT = """\
You are a calibrated forecasting engine. Your job is to estimate the probability \
that a prediction-market question resolves YES.

CALIBRATION RULES — follow these strictly:
1. **Base rates first.** Before considering any question-specific evidence, \
identify the appropriate reference class and its historical base rate. State it explicitly.
2. **Update from evidence.** Adjust the base rate using specific, verifiable \
factors — polls, schedules, precedent, expert consensus. Each factor should \
push the probability in a stated direction by a stated amount.
3. **Account for overconfidence.** Humans and LLMs are systematically \
overconfident. After forming your estimate, regress it toward 50% by 5-15% \
(more regression when evidence is thin).
4. **Respect extremes.** Only output probabilities below 0.05 or above 0.95 \
when the outcome is nearly certain with strong, concrete evidence — not \
merely "very likely."
5. **State uncertainty honestly.** If you have little relevant knowledge about \
this question, say so. A wider confidence band (lower confidence) is better \
than false precision.
7. **Respect mutually exclusive constraints.** If this question is one outcome \
among N mutually exclusive candidates (e.g. election nominees, award winners, \
sports brackets), your probability estimate must reflect that constraint. If \
there are N candidates, the average probability must be approximately 1/N. Do \
not estimate any single candidate above 50% unless there is overwhelming \
evidence they are the clear frontrunner. Adjust your base rate accordingly \
before updating from evidence.
8. **Flag limited knowledge.** If the market question involves a specific person, \
team, or entity you have limited knowledge about, set confidence to "low" \
regardless of your probability estimate. Low confidence signals should be \
weighted less heavily by the edge calculator.

OUTPUT FORMAT — respond with **only** a JSON object, no markdown fences:
{
  "estimated_probability": <float 0.01-0.99>,
  "confidence": "<low|medium|high>",
  "reasoning": "<2-4 sentence explanation referencing search findings>",
  "key_factors": ["<factor 1>", "<factor 2>", ...]
}

Rules for the fields:
- estimated_probability: your best calibrated estimate that YES resolves.
- confidence: "low" = little data even after searching or ambiguous question; \
"medium" = reasonable evidence but notable uncertainty; "high" = strong \
evidence from multiple sources and clear resolution criteria.
- reasoning: show your work — state the base rate, key evidence from your \
knowledge, your updates, and the overconfidence adjustment you applied.
- key_factors: 3-6 concrete factors that most influenced your estimate."""

RETRY_PROMPT_TEMPLATE = (
    "Return only a JSON object with these fields: "
    "estimated_probability (float 0-1), confidence (low/medium/high), "
    "reasoning (string), key_factors (list of strings). "
    "Question: {question}"
)

USER_PROMPT_TEMPLATE = """\
Prediction market question: {question}

Category: {category}

Current market price (what traders are currently pricing this at): {yes_price:.1%}

Additional context: {context}

Estimate the probability that this question resolves YES."""


def _build_user_prompt(question: str, category: str, context: str, yes_price: float = 0.5) -> str:
    return USER_PROMPT_TEMPLATE.format(
        question=question,
        category=category or "Unknown",
        context=context or "None provided.",
        yes_price=yes_price,
    )


def _parse_response(text: str) -> dict:
    """Parse the JSON response from the model, handling common formatting
    issues: markdown fences, preamble text, single quotes.
    """
    cleaned = text.strip()

    # 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
    if cleaned.startswith("```"):
        first_newline = cleaned.find("\n")
        last_fence = cleaned.rfind("```")
        if first_newline != -1 and last_fence > first_newline:
            cleaned = cleaned[first_newline + 1 : last_fence].strip()

    # 2. Extract the JSON object — discard any text before { and after }
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in response: {cleaned[:200]!r}")
    cleaned = cleaned[start : end + 1]

    # 3. Try standard parse first; fall back to single-quote replacement
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return json.loads(cleaned.replace("'", '"'))


def _clamp(value: float, lo: float = 0.01, hi: float = 0.99) -> float:
    return max(lo, min(hi, value))


async def _call_anthropic(client: anthropic.AsyncAnthropic, system: str, user: str) -> str:
    """Single Anthropic API call with one 429 retry; returns raw text or raises RuntimeError."""
    for attempt in range(2):
        try:
            message = await client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            break  # success — exit retry loop
        except anthropic.RateLimitError as exc:
            if attempt == 0:
                logger.warning("Rate limited by Anthropic (429) — waiting 10s before retry")
                await asyncio.sleep(10.0)
            else:
                logger.error("Rate limited again after retry — giving up: %s", exc)
                raise RuntimeError(f"Anthropic rate limit error: {exc}") from exc
        except anthropic.APIError as exc:
            logger.error("Anthropic API error: %s", exc)
            raise RuntimeError(f"Anthropic API error: {exc}") from exc
    raw_text = message.content[0].text if message.content else ""
    if not raw_text:
        raise RuntimeError("Anthropic returned an empty response")
    await asyncio.sleep(3.0)
    return raw_text


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
    force_refresh: bool = False,
    yes_price: float = 0.5,
) -> ProbabilityEstimate:
    """Call the Anthropic API to estimate the probability of a market question.

    Returns a cached result if one exists within the TTL window (unless force_refresh=True).
    Persists new results to SQLite.
    """
    if not force_refresh:
        cached = _get_cached(market_id)
        if cached is not None:
            logger.debug("Cache hit for market %s", market_id)
            return cached
    else:
        _estimate_cache.pop(market_id, None)
        logger.info("Force refresh requested for market %s — bypassing cache", market_id)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")

    user_prompt = _build_user_prompt(question, category, context, yes_price)
    logger.info("Requesting estimate from Anthropic (%s) for: %s", MODEL, question[:80])
    agent_log("analysis", "estimator", f"Estimating: {question[:80]}")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    raw_text = await _call_anthropic(client, SYSTEM_PROMPT, user_prompt)
    logger.debug("Raw model response: %s", raw_text[:500])

    try:
        parsed = _parse_response(raw_text)
    except (json.JSONDecodeError, ValueError) as first_exc:
        logger.warning(
            "Failed to parse first response for market %s (%s) — retrying with simplified prompt",
            market_id, first_exc,
        )
        retry_prompt = RETRY_PROMPT_TEMPLATE.format(question=question)
        retry_text = await _call_anthropic(client, "You are a JSON-only response bot.", retry_prompt)
        logger.debug("Retry response: %s", retry_text[:500])
        try:
            parsed = _parse_response(retry_text)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error(
                "Failed to parse retry response for market %s: %s — raw: %s",
                market_id, exc, retry_text[:300],
            )
            raise RuntimeError("Failed to parse probability estimate from model output") from exc

    confidence = parsed.get("confidence", "medium")
    if confidence not in ("low", "medium", "high"):
        confidence = "medium"

    key_factors = parsed.get("key_factors", [])
    if not isinstance(key_factors, list):
        key_factors = [str(key_factors)]

    estimate = ProbabilityEstimate(
        market_id=market_id,
        question=question,
        estimated_probability=_clamp(float(parsed.get("estimated_probability") or 0.5)),
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
    agent_log(
        "analysis",
        "estimator",
        f"Estimate: {estimate.estimated_probability:.1%} ({estimate.confidence} confidence)",
        {"market_id": market_id},
    )
    return estimate
