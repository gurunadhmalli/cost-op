from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.engines import cost_engine

router = APIRouter()


@router.get("/summary")
def cost_summary(
    plant_id: str | None = Query(None),
    line_id: str | None = Query(None),
    from_: str | None = Query(None, alias="from"),
    to: str | None = Query(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    date_from = datetime.fromisoformat(from_) if from_ else None
    date_to = datetime.fromisoformat(to) if to else None
    return cost_engine.get_cost_summary(db, plant_id, line_id, date_from, date_to)
