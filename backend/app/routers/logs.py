from fastapi import APIRouter, Query
from app.services.agent_logger import get_logs, clear_logs

router = APIRouter()


@router.get("/")
async def list_logs(limit: int = Query(50, ge=1, le=200)):
    entries = get_logs(limit=limit)
    return {"logs": [e.model_dump() for e in entries]}


@router.delete("/")
async def delete_logs():
    clear_logs()
    return {"status": "cleared"}
