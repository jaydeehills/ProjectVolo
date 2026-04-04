import os

from fastapi import HTTPException


def check_agent_enabled() -> None:
    """Raise 503 if AGENT_ENABLED is set to 'false'.

    This pauses all signal generation without stopping the server.
    """
    val = os.environ.get("AGENT_ENABLED", "true").strip().lower()
    if val == "false":
        raise HTTPException(
            status_code=503,
            detail="Agent is paused (AGENT_ENABLED=false). Set AGENT_ENABLED=true to resume.",
        )
