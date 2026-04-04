import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import markets, estimator, edge, signals, logs

app = FastAPI(
    title="Polymarket Trading AI Agent",
    description="AI-powered research and signal generation for Polymarket",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(markets.router, prefix="/api/markets", tags=["markets"])
app.include_router(estimator.router, prefix="/api/estimator", tags=["estimator"])
app.include_router(edge.router, prefix="/api/edge", tags=["edge"])
app.include_router(signals.router, prefix="/api/signals", tags=["signals"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])


@app.get("/api/health")
async def health():
    agent_enabled = os.environ.get("AGENT_ENABLED", "true").strip().lower() != "false"
    return {"status": "ok", "version": "0.1.0", "agent_enabled": agent_enabled}
