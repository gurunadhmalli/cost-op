from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db import models

router = APIRouter()


@router.get("")
def list_recommendations(
    status: str | None = Query(None), db: Session = Depends(get_db), user: dict = Depends(get_current_user)
):
    q = (
        db.query(models.Recommendation, models.RootCause, models.Anomaly, models.Machine)
        .join(models.RootCause, models.Recommendation.root_cause_id == models.RootCause.root_cause_id)
        .join(models.Anomaly, models.RootCause.anomaly_id == models.Anomaly.anomaly_id)
        .join(models.Machine, models.Anomaly.machine_id == models.Machine.machine_id)
    )
    if status:
        q = q.filter(models.Recommendation.status == status)

    out = []
    for rec, rc, anomaly, machine in q.order_by(models.Recommendation.created_at.desc()).all():
        out.append({
            "recommendation_id": rec.recommendation_id,
            "asset_id": machine.machine_id,
            "asset_name": machine.machine_name or machine.machine_id,
            "title": rec.title or rec.action,
            "action": rec.action,
            "category": rec.category,
            "projected_savings": float(rec.projected_savings),
            "implementation_cost": float(rec.implementation_cost or 0),
            "payback_days": float(rec.payback_days or 0),
            "confidence": float(rec.confidence),
            "created_at": rec.created_at.isoformat(),
            "status": rec.status,
            "evidence": {
                "anomaly_id": anomaly.anomaly_id,
                "driver": rc.driver,
                "correlation_strength": float(rc.correlation_strength),
                "shap_contribution": float(rc.shap_value or 0),
                "historical_case_id": None,
            },
        })
    return out
