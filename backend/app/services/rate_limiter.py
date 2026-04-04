import time
from collections import deque
from typing import Deque, Tuple

from fastapi import HTTPException


class RateLimiter:
    """Simple in-memory sliding-window rate limiter.

    Note: this is per-process. If running uvicorn with --workers N,
    the effective limit is max_calls * N. Use Redis-backed limiting
    for strict multi-worker enforcement.
    """

    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._timestamps: Deque[float] = deque()

    def check(self) -> None:
        """Raise 429 if the rate limit is exceeded."""
        now = time.monotonic()
        # Evict expired entries
        while self._timestamps and (now - self._timestamps[0]) > self.window_seconds:
            self._timestamps.popleft()

        if len(self._timestamps) >= self.max_calls:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: max {self.max_calls} calls per {self.window_seconds}s",
            )
        self._timestamps.append(now)


# Shared instance: 10 calls per 60 seconds
estimator_limiter = RateLimiter(max_calls=10, window_seconds=60)
