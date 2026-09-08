from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.engines import baseline_engine

router = APIRouter()


@router.get("")
def list_anomalies(
    plant_id: str | None = Query(None),
    severity: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Anomaly, models.Machine).join(models.Machine, models.Anomaly.machine_id == models.Machine.machine_id)
    if plant_id:
        q = q.filter(models.Machine.plant_id == plant_id)
    if severity:
        q = q.filter(models.Anomaly.severity == severity)
    if status:
        q = q.filter(models.Anomaly.status == status)

    out = []
    for anomaly, machine in q.order_by(models.Anomaly.detected_at.desc()).all():
        hist = baseline_engine.load_readings(db, anomaly.machine_id, anomaly.metric, window_days=1)
        window = hist[hist["timestamp"] >= anomaly.detected_at - timedelta(hours=12)]
        baseline = baseline_engine.compute_baseline(hist)
        std = baseline["std"] or (baseline["mean"] * 0.05 if baseline["mean"] else 1.0)

        telemetry_history = [
            {
                "timestamp": row["timestamp"].isoformat(),
                "value": float(row["value"]),
                "upper_bound": round(baseline["mean"] + 2 * std, 2),
                "lower_bound": round(max(baseline["mean"] - 2 * std, 0), 2),
                "baseline": round(baseline["mean"], 2),
                "is_anomaly": bool(row["timestamp"] == anomaly.detected_at or
                                   abs(float(row["value"]) - baseline["mean"]) > 2 * std),
            }
            for _, row in window.iterrows()
        ]

        out.append({
            "anomaly_id": anomaly.anomaly_id,
            "asset_id": machine.machine_id,
            "asset_name": machine.machine_name or machine.machine_id,
            "plant_id": machine.plant_id,
            "line_id": machine.line,
            "metric": anomaly.metric,
            "unit": anomaly.unit or "",
            "current_value": float(anomaly.current_value or 0),
            "baseline_value": float(anomaly.baseline_value or 0),
            "anomaly_score": float(anomaly.anomaly_score),
            "detected_at": anomaly.detected_at.isoformat(),
            "severity": anomaly.severity,
            "status": anomaly.status,
            "estimated_cost_impact_per_day": float(anomaly.estimated_cost_impact_per_day or 0),
            "telemetry_history": telemetry_history,
        })
    return out
