from typing import Optional, List
from datetime import datetime, timezone
from collections import deque
from app.models.schemas import AgentLogEntry

# In-memory log buffer (replace with persistent store in production)
_log_buffer: deque = deque(maxlen=500)


def log(level: str, module: str, message: str, details: Optional[dict] = None) -> AgentLogEntry:
    entry = AgentLogEntry(
        timestamp=datetime.now(timezone.utc),
        level=level,
        module=module,
        message=message,
        details=details,
    )
    _log_buffer.append(entry)
    return entry


def get_logs(limit: int = 50) -> List[AgentLogEntry]:
    """Return the most recent log entries."""
    entries = list(_log_buffer)
    return entries[-limit:]


def clear_logs() -> None:
    _log_buffer.clear()
