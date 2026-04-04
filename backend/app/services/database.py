import sqlite3
import json
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from app.models.schemas import ProbabilityEstimate

logger = logging.getLogger(__name__)

_connection: Optional[sqlite3.Connection] = None


def _get_db_path() -> str:
    return os.environ.get("ESTIMATES_DB_PATH", "estimates.db")


def _get_conn() -> sqlite3.Connection:
    global _connection
    if _connection is None:
        db_path = _get_db_path()
        _connection = sqlite3.connect(db_path, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
        _connection.execute("PRAGMA journal_mode=WAL")
        _create_tables(_connection)
        logger.info("SQLite database initialized at %s", db_path)
    return _connection


def _create_tables(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS estimates (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            market_id       TEXT NOT NULL,
            question        TEXT NOT NULL,
            estimated_probability REAL NOT NULL,
            confidence      TEXT NOT NULL,
            reasoning       TEXT NOT NULL,
            key_factors     TEXT NOT NULL,
            created_at      TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_estimates_market_id
        ON estimates (market_id)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_estimates_created_at
        ON estimates (created_at)
    """)
    conn.commit()


def save_estimate(estimate: ProbabilityEstimate) -> int:
    """Persist an estimate and return its row ID."""
    conn = _get_conn()
    cursor = conn.execute(
        """
        INSERT INTO estimates
            (market_id, question, estimated_probability, confidence,
             reasoning, key_factors, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            estimate.market_id,
            estimate.question,
            estimate.estimated_probability,
            estimate.confidence,
            estimate.reasoning,
            json.dumps(estimate.key_factors),
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    logger.info(
        "Saved estimate id=%d for market %s (prob=%.3f)",
        cursor.lastrowid,
        estimate.market_id,
        estimate.estimated_probability,
    )
    return cursor.lastrowid


def get_estimates_for_market(market_id: str) -> List[dict]:
    """Return all historical estimates for a given market."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM estimates WHERE market_id = ? ORDER BY created_at DESC",
        (market_id,),
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_recent_estimates(limit: int = 50) -> List[dict]:
    """Return the most recent estimates across all markets."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM estimates ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["key_factors"] = json.loads(d["key_factors"])
    return d
