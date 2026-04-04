# Project Volo

AI-powered market research and analysis platform. The agent ingests live data from external sources, uses Claude to estimate outcome probabilities, and surfaces insights where the AI's assessment diverges from current consensus.

## Architecture

```
                        +---------------------+
                        |   External Data     |
                        |   Sources (REST)    |
                        +----------+----------+
                                   |
                                   | fetch & filter
                                   v
+----------------+      +---------------------+      +------------------+
|                |      |   FastAPI Backend    |      |   Anthropic API  |
|   Next.js 14   | <--> |                     | ---> |   (Claude LLM)   |
|   Dashboard    | HTTP |  /api/markets       |      +------------------+
|                |      |  /api/edge/scan     |               |
|  - Insights    |      |  /api/signals       |     probability estimate
|  - Data Browse |      |  /api/estimator     |               |
|  - Agent Log   |      |  /api/logs          |               v
|  - Stats       |      |  /api/health        |      +------------------+
|                |      |                     |      |  Edge Calculator  |
+----------------+      +---+-----+-----------+      |                  |
   localhost:3000            |     |                  |  edge = AI - ref |
                             |     |                  |  signal + EV     |
                             v     v                  +------------------+
                      +--------------+
                      |   SQLite DB  |
                      |  estimates   |
                      +--------------+
```

**Data flow:** External sources -> Filter -> Claude estimation -> Edge calculation -> Dashboard

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

python run.py
# Backend runs on http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard runs on http://localhost:3000
```

### Docker Compose (alternative)

```bash
# Copy and configure the backend env file first
cp backend/.env.example backend/.env
# Edit backend/.env with your ANTHROPIC_API_KEY

docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key for probability estimation |
| `AGENT_ENABLED` | No | `true` | Set to `false` to pause signal generation (kill switch) |
| `ESTIMATES_DB_PATH` | No | `estimates.db` | Path to the SQLite database file |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000/api` | Backend URL for the frontend |

## Kill Switch

Set `AGENT_ENABLED=false` in your `.env` to pause all signal generation without stopping the server. The `/api/edge/scan`, `/api/signals`, and `/api/estimator/estimate` endpoints will return `503 Service Unavailable`. Data browsing, logs, and health check continue to work. Change back to `true` and restart to resume.

## API Endpoints

| Method | Path | Description | Rate Limited |
|---|---|---|---|
| `GET` | `/api/health` | Health check + agent status | No |
| `GET` | `/api/markets/` | List filtered data sources | No |
| `GET` | `/api/markets/{id}` | Single item detail | No |
| `GET` | `/api/edge/scan` | Scan all items for edge insights | No |
| `GET` | `/api/signals/` | Actionable insights only | No |
| `POST` | `/api/estimator/estimate` | Run AI estimate on a question | **Yes (10/min)** |
| `GET` | `/api/estimator/history` | Recent estimates | No |
| `GET` | `/api/logs/` | Agent log entries | No |

## How Edge Calculation Works

The edge calculator compares the AI's probability estimate against the current reference price to find divergences.

### Step 1: Probability Estimation

Claude receives the question with a calibration-focused system prompt that enforces:
- Base rate anchoring before question-specific analysis
- Explicit overconfidence regression (5-15% toward 50%)
- Honest uncertainty (low/medium/high confidence)

### Step 2: Edge = AI Estimate - Reference Price

```
edge = estimated_probability - reference_price
```

A positive edge means the AI assesses a higher probability than the current reference. A negative edge means lower.

### Step 3: Signal Generation

A signal is generated only when **both** conditions are met:

1. **Sufficient edge**: |edge| > 5% (the `EDGE_THRESHOLD`)
2. **Sufficient confidence**: confidence weight >= 0.5

Confidence maps to numeric weights:
| Confidence | Weight |
|---|---|
| low | 0.30 |
| medium | 0.60 |
| high | 0.85 |

This means `low` confidence never triggers a signal regardless of edge size.

### Step 4: Expected Value

```
expected_value = |edge| * confidence_weight
```

This ranks signals by significance. A 20% edge at high confidence (EV = 0.17) ranks above a 30% edge at low confidence (EV = 0.09).

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app + CORS
│   │   ├── models/schemas.py       # Pydantic models
│   │   ├── routers/                # API endpoint handlers
│   │   │   ├── markets.py
│   │   │   ├── estimator.py
│   │   │   ├── edge.py
│   │   │   ├── signals.py
│   │   │   └── logs.py
│   │   └── services/               # Business logic
│   │       ├── probability_estimator.py  # Claude API integration
│   │       ├── edge_calculator.py  # Edge + signal math
│   │       ├── database.py         # SQLite persistence
│   │       ├── agent_logger.py     # In-memory log buffer
│   │       ├── rate_limiter.py     # Sliding window rate limiter
│   │       └── kill_switch.py      # AGENT_ENABLED guard
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── app/page.tsx            # Main dashboard
│   │   ├── components/             # React components
│   │   │   ├── SignalsTable.tsx
│   │   │   ├── MarketBrowser.tsx
│   │   │   ├── AgentLog.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   └── EdgeDistributionChart.tsx
│   │   └── lib/
│   │       ├── api.ts              # API client
│   │       └── hooks.ts            # usePolling hook
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```
