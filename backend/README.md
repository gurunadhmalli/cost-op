# Backend — AI-Powered Industrial Cost Optimization Assistant

FastAPI + PostgreSQL + Google Gemini (free tier). No paid APIs anywhere.
Implements every endpoint the `frontend/` app calls, exactly as documented in
`../15_Backend_Full_Specification.md` (the authoritative, reconciled spec —
it supersedes `08_API_Integration_Architecture.md` wherever they differ; see
its own Reconciliation Log section).

## 1. Prerequisites (all free)

- Python 3.11+
- PostgreSQL 14+ running locally (or any free Postgres — Docker, a local
  install, or a free-tier hosted instance such as Neon/Supabase)
- A free Gemini API key from https://aistudio.google.com/app/apikey
  (optional — see "Running without a Gemini key" below)

## 2. Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create the database once:

```sql
CREATE DATABASE ai_cost_db;
```

Copy `.env.example` to `.env` and fill in your own values (a working `.env`
with placeholder values is already included so the app boots out of the box):

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost:5432/ai_cost_db
GEMINI_API_KEY=<your-free-key-or-leave-as-changeme>
GEMINI_MODEL=gemini-2.5-flash
```

## 3. Seed the demo data

Generates 1 plant, 2 machines, 14 days of hourly sensor history, 31 days of
production/cost records, and the worked example from the PDF (Line 3
Extruder 3A, `AN-20260830-0134`, 22% energy overrun, ₹18,400/day impact,
87% root-cause confidence):

```bash
python -m app.simulator.seed
```

Re-running it is safe — it detects existing data and skips reseeding. To
reseed from scratch, drop and recreate the tables (or the database) first.

## 4. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

Check it's alive: `GET http://localhost:8000/health` → `{"status": "ok"}`

## 5. Point the frontend at it

In `frontend/`, make sure `USE_MOCK` (or equivalent flag in
`src/services/api.ts` / `.env`) is set to live mode, and that Vite's dev
proxy forwards `/api` and `/ws` to `http://localhost:8000` (see Section 6 of
`15_Backend_Full_Specification.md` for the exact `vite.config.ts` snippet).
Then:

```bash
cd ../frontend
npm run dev
```

## 6. Running without a Gemini key

If `GEMINI_API_KEY` is left as `changeme` (or unset), the `/ws/chat`
endpoint automatically falls back to a templated response built from the
same live-data functions the REST endpoints use — the AI Assistant panel
still works and still shows real numbers, just without free-form Gemini
phrasing. Get a free key (no credit card) at
https://aistudio.google.com/app/apikey whenever you want full natural-language
answers, and it picks it up on the next server restart.

## 7. The live simulator (continuous data, not just a one-time seed)

`python -m app.simulator.seed` only creates one static snapshot. Once the
server is running, `app/simulator/live_feed.py` keeps the plant "alive": a
background job (APScheduler, started in `app/main.py`'s lifespan handler)
runs every `SIMULATOR_INTERVAL_SECONDS` (30s by default) and:

1. Appends a new synthetic sensor reading for each machine/metric.
2. Scores it with the exact same Isolation Forest engine the REST API uses.
3. When a reading crosses the anomaly threshold, creates a new `Anomaly`
   row, runs it through the root-cause engine, and creates a
   `Recommendation` — the same closed loop (Data → Anomaly → Root Cause →
   Recommendation) the architecture docs describe, happening on its own.
4. Broadcasts a small `{"type": "tick", ...}` event over the `/ws/live`
   WebSocket so the frontend dashboard can refetch instead of polling.

Set `SIMULATOR_ENABLED=false` in `.env` to turn this off (e.g. for a
completely static demo). This is pure Python — no paid streaming/message
service involved, since a hackathon prototype has no real plant to connect
to yet; swap `live_feed.py`'s random generator for a real MQTT/OPC-UA/ERP
client later without touching anything downstream of it.

## 8. Docker (alternative to the venv setup)

From the project root (one level up from `backend/`), with both `backend/`
and `frontend/` present:

```bash
cp backend/.env.example backend/.env   # optionally set a real GEMINI_API_KEY first
docker compose up --build
```

This starts three containers — Postgres, this backend (seeding once on
first boot, then serving on port 8000), and the frontend built and served
through nginx on port 8080 (nginx also reverse-proxies `/api` and `/ws` to
the backend container, the same job Vite's dev proxy does locally). Open
http://localhost:8080. Stop everything with `docker compose down` (add `-v`
to also drop the Postgres volume and reseed fresh next time).

Steps 2–5 above (the venv path) are the alternative for developing without
Docker — both run the identical code.

## 9. Project layout

```
backend/
  Dockerfile, .dockerignore  Container build (see Section 8)
  app/
    main.py                  FastAPI app, all routers, CORS, simulator scheduler
    core/config.py           Settings loaded from .env
    db/
      database.py            SQLAlchemy engine/session
      models.py               ORM models (Plant, Machine, Anomaly, RootCause, ...)
    schemas.py                Pydantic request/response models
    engines/
      cost_engine.py          Activity-Based Costing
      baseline_engine.py      90-day rolling baseline + seasonality
      anomaly_engine.py       Isolation Forest anomaly scoring
      rootcause_engine.py     Ranked root-cause drivers + confidence
      optimization_engine.py  PuLP linear-programming what-if ranking
    api/
      plants.py, cost.py, anomalies.py, rootcause.py,
      whatif.py, recommendations.py, actions.py, chat.py, live.py
    agent/
      tools.py                Gemini function-calling declarations + dispatcher
      agent.py                Gemini chat loop (+ no-key fallback)
    live/
      manager.py               WebSocket fan-out for /ws/live
    simulator/
      seed.py                  One-time synthetic demo data generator
      live_feed.py              Continuous simulation, scheduled from main.py
  requirements.txt
  .env.example
```

## 10. Endpoints implemented

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/plants` | List plants/lines/machines |
| GET | `/api/cost/summary` | ABC cost trend + variance |
| GET | `/api/anomalies` | List anomalies (filterable) |
| GET | `/api/rootcause/{anomaly_id}` | Ranked root-cause drivers |
| POST | `/api/whatif` | Rank candidate corrective actions |
| GET | `/api/recommendations` | Ranked recommendations |
| GET | `/api/actions` | Action log |
| POST | `/api/actions/{recommendation_id}/implement` | Mark a recommendation implemented |
| WS | `/ws/chat` | AI Co-Pilot chat (Gemini function-calling) |
| WS | `/ws/live` | Server push: one event per simulator tick (Section 7) |
| GET | `/health` | Liveness check |

All request/response field names are the exact snake_case contract
`frontend/src/services/api.ts` expects — see `15_Backend_Full_Specification.md`
for the full field-by-field mapping against the frontend's camelCase types.

## 11. Cost

$0. PostgreSQL is self-hosted/free, Gemini's free tier requires no card, and
every Python package above is open-source. No paid API is called anywhere
in this backend.
