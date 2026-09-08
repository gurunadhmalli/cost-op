"""
FastAPI entrypoint. Router prefixes match the actual frontend calls in
frontend/src/services/api.ts exactly (see 15_Backend_Full_Specification.md).
No auth/JWT: the frontend sends no Authorization header, so none is required
here — keeps this a genuinely free, zero-config local prototype.

Also starts the live simulator (app/simulator/live_feed.py) on a background
schedule, so the plant keeps generating new sensor readings — and, when they
cross the anomaly threshold, new root causes and recommendations — for as
long as the server runs, and pushes each tick out over /ws/live (see
app/api/live.py) so the dashboard can refresh itself without polling.
"""
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import Base, engine
from app.db.seed_demo_user import ensure_demo_user
from app.db.seed_demo_actions import ensure_demo_actions
from app.api import plants, cost, anomalies, rootcause, whatif, recommendations, actions, chat, live, auth
from app.live.manager import manager as live_manager
from app.simulator import live_feed

Base.metadata.create_all(bind=engine)
ensure_demo_user()
ensure_demo_actions()

logger = logging.getLogger("ai_cost.simulator")
scheduler = AsyncIOScheduler()


async def _run_tick() -> None:
    try:
        event = live_feed.tick()
    except Exception:
        logger.exception("Live simulator tick failed")
        return
    await live_manager.broadcast(event)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SIMULATOR_ENABLED:
        scheduler.add_job(
            _run_tick,
            "interval",
            seconds=settings.SIMULATOR_INTERVAL_SECONDS,
            id="live_feed_tick",
        )
        scheduler.start()
        logger.info(
            "Live simulator started: a new tick every %ss (SIMULATOR_ENABLED=true in .env)",
            settings.SIMULATOR_INTERVAL_SECONDS,
        )
    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(title="AI Cost Optimization Assistant — Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev-only; the Vite proxy (Section 6 of doc 15) avoids needing this in practice
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(plants.router, prefix="/api/plants", tags=["plants"])
app.include_router(cost.router, prefix="/api/cost", tags=["cost"])
app.include_router(anomalies.router, prefix="/api/anomalies", tags=["anomalies"])
app.include_router(rootcause.router, prefix="/api/rootcause", tags=["rootcause"])
app.include_router(whatif.router, prefix="/api/whatif", tags=["whatif"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(actions.router, prefix="/api/actions", tags=["actions"])
app.include_router(chat.router, prefix="/ws", tags=["chat"])
app.include_router(live.router, prefix="/ws", tags=["live"])


@app.get("/health")
def health():
    return {"status": "ok", "simulator_enabled": settings.SIMULATOR_ENABLED}
