from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.engines import rootcause_engine

router = APIRouter()


@router.get("/{anomaly_id}")
def get_root_cause(anomaly_id: str, db: Session = Depends(get_db)):
    anomaly = db.query(models.Anomaly).filter_by(anomaly_id=anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail=f"Unknown anomaly_id {anomaly_id}")
    result = rootcause_engine.analyze(db, anomaly)

    # Persist the analysis so historical_accuracy/data_completeness improve over time
    # (per the closed feedback loop documented in 04_AI_ML_Architecture.md).
    existing = db.query(models.RootCause).filter_by(anomaly_id=anomaly_id).first()
    if not existing and result["ranked_drivers"]:
        top = result["ranked_drivers"][0]
        db.add(models.RootCause(
            anomaly_id=anomaly_id,
            driver=top["driver"],
            category=top["category"],
            correlation_strength=top["correlation_strength"],
            contribution_pct=top["contribution_pct"],
            shap_value=top["shap_value"],
            description=top["description"],
            recommended_fix=top["recommended_fix"],
            confidence=result["confidence"],
        ))
        db.commit()

    return result
