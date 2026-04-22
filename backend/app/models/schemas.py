from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class Market(BaseModel):
    market_id: str
    question: str
    category: str
    event_title: Optional[str] = None
    yes_price: float = Field(ge=0, le=1)
    no_price: float = Field(ge=0, le=1)
    volume: float = Field(ge=0)
    close_date: Optional[datetime] = None
    url: str


class ProbabilityEstimate(BaseModel):
    market_id: str
    question: str
    estimated_probability: float = Field(ge=0.0, le=1.0)
    confidence: Literal["low", "medium", "high"]
    reasoning: str
    key_factors: List[str]


class EdgeResult(BaseModel):
    market_id: str
    question: str
    category: str
    market_price: float = Field(ge=0, le=1)
    estimated_probability: float = Field(ge=0, le=1)
    edge: float
    edge_percentage: float
    confidence: Literal["low", "medium", "high"]
    signal: Literal["BUY_YES", "BUY_NO", "HOLD"]
    expected_value: float = Field(ge=0)
    reasoning: str
    key_factors: List[str] = Field(default_factory=list)
    estimated_at: str


class TradeSignal(BaseModel):
    market_id: str
    question: str
    signal: Literal["BUY_YES", "BUY_NO", "HOLD"]
    edge: float
    expected_value: float
    confidence: Literal["low", "medium", "high"]
    timestamp: datetime


class AgentLogEntry(BaseModel):
    timestamp: datetime
    level: Literal["info", "analysis", "signal", "error"]
    module: str
    message: str
    details: Optional[Dict] = None


class EstimateRequest(BaseModel):
    """Request body for the /estimator/estimate endpoint."""
    market_id: str = Field(min_length=1, max_length=200)
    question: str = Field(min_length=1, max_length=1000)
    category: str = Field(default="", max_length=200)
    context: str = Field(default="", max_length=5000)
    force_refresh: bool = Field(default=False, description="Bypass cache and force a fresh estimate")
