from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.database import get_db
from app.db import models
from app.schemas import ImplementActionRequest

router = APIRouter()


@router.post("/{recommendation_id}/implement")
def implement_action(
    recommendation_id: str,
    payload: ImplementActionRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("operator", "admin")),
):
    rec = db.query(models.Recommendation).filter_by(recommendation_id=recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Unknown recommendation_id {recommendation_id}")
    if rec.status == "implemented":
        raise HTTPException(status_code=409, detail="Recommendation already implemented")

    now = datetime.utcnow()
    action = models.ActionLog(
        recommendation_id=recommendation_id,
        implemented_by=payload.implemented_by,
        notes=payload.notes,
        implemented_at=now,
        tracking_status="pending_verification",
    )
    db.add(action)
    rec.status = "implemented"
    db.commit()
    db.refresh(action)

    return {
        "action_id": action.action_id,
        "recommendation_id": recommendation_id,
        "recommendation_title": rec.title or rec.action,
        "asset_id": _asset_id_for_recommendation(db, rec),
        "implemented_at": action.implemented_at.isoformat(),
        "tracking_status": action.tracking_status,
        "verification_due": (now + timedelta(days=7)).isoformat(),
        "projected_savings": float(rec.projected_savings),
    }


@router.get("")
def list_action_logs(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Returns camelCase directly — the one list endpoint the frontend's
    getActionLogs() consumes with NO field mapping, per
    15_Backend_Full_Specification.md Section 1.8."""
    logs = db.query(models.ActionLog).order_by(models.ActionLog.implemented_at.desc()).all()
    out = []
    for log in logs:
        rec = db.query(models.Recommendation).filter_by(recommendation_id=log.recommendation_id).first()
        asset_id = _asset_id_for_recommendation(db, rec) if rec else ""
        out.append({
            "actionId": log.action_id,
            "recommendationId": log.recommendation_id,
            "recommendationTitle": (rec.title or rec.action) if rec else "",
            "assetId": asset_id,
            "implementedBy": log.implemented_by,
            "implementedAt": log.implemented_at.isoformat(),
            "notes": log.notes or "",
            "trackingStatus": log.tracking_status,
            "verificationDue": (log.implemented_at + timedelta(days=7)).isoformat(),
            "projectedSavings": float(rec.projected_savings) if rec else 0,
            "verifiedSavings": float(log.verified_savings) if log.verified_savings is not None else None,
            "verifiedAt": log.verified_at.isoformat() if log.verified_at else None,
            "variancePct": float(log.variance_pct) if log.variance_pct is not None else None,
            "recalibrationModelId": log.recalibration_model_id,
        })
    return out


def _asset_id_for_recommendation(db: Session, rec: models.Recommendation) -> str:
    rc = db.query(models.RootCause).filter_by(root_cause_id=rec.root_cause_id).first()
    if not rc:
        return ""
    anomaly = db.query(models.Anomaly).filter_by(anomaly_id=rc.anomaly_id).first()
    return anomaly.machine_id if anomaly else ""
