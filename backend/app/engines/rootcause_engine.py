"""
Root Cause Analysis Engine — reconciled with 15_Backend_Full_Specification.md
Section 1.4: every ranked driver now carries category / shap_value /
description / recommended_fix so the frontend's SHAPDriver type is fully
populated (not left to its '' / 0 defaults).
"""
from datetime import timedelta

import numpy as np
from sqlalchemy.orm import Session

from app.db import models
from app.engines import baseline_engine

LOOKBACK = timedelta(days=14)

EVENT_WEIGHTS = {
    "filter_change_skipped": 0.85,
    "overdue_inspection": 0.7,
    "unscheduled_stop": 0.6,
    "inspection": 0.3,
    "filter_change": 0.2,
}

EVENT_FIXES = {
    "filter_change_skipped": "Replace the chiller secondary filter cartridge immediately.",
    "overdue_inspection": "Schedule and perform the overdue inspection.",
    "unscheduled_stop": "Review the stop log and confirm no residual fault remains.",
}


def analyze(db: Session, anomaly: models.Anomaly) -> dict:
    machine = db.query(models.Machine).filter_by(machine_id=anomaly.machine_id).one()
    candidates = []

    events = (
        db.query(models.MaintenanceEvent)
        .filter(
            models.MaintenanceEvent.machine_id == anomaly.machine_id,
            models.MaintenanceEvent.event_time <= anomaly.detected_at,
            models.MaintenanceEvent.event_time >= anomaly.detected_at - LOOKBACK,
        )
        .order_by(models.MaintenanceEvent.event_time.desc())
        .all()
    )
    for ev in events:
        base_weight = EVENT_WEIGHTS.get(ev.event_type, 0.4)
        recency_days = max((anomaly.detected_at - ev.event_time).total_seconds() / 86400.0, 0.01)
        recency_factor = max(0.3, 1.0 - (recency_days / LOOKBACK.days))
        strength = round(base_weight * recency_factor, 4)
        candidates.append({
            "driver": f"{ev.event_type.replace('_', ' ').capitalize()} ({recency_days:.1f}d ago)",
            "category": "Maintenance",
            "correlation_strength": strength,
            "description": (
                f"{machine.machine_name or machine.machine_id}'s maintenance record shows "
                f"a '{ev.event_type.replace('_', ' ')}' event {recency_days:.1f} days before this anomaly."
            ),
            "recommended_fix": EVENT_FIXES.get(ev.event_type, "Review and address the maintenance event."),
        })

    other_metrics = (
        db.query(models.SensorReading.metric)
        .filter(models.SensorReading.machine_id == anomaly.machine_id)
        .filter(models.SensorReading.metric != anomaly.metric)
        .distinct()
        .all()
    )
    for (metric_name,) in other_metrics:
        hist = baseline_engine.load_readings(db, anomaly.machine_id, metric_name)
        if hist.empty or len(hist) < 5:
            continue
        window = hist[hist["timestamp"] >= anomaly.detected_at - timedelta(hours=6)]
        if window.empty:
            continue
        current = float(window.iloc[-1]["value"])
        mean, std = hist["value"].mean(), (hist["value"].std(ddof=0) or 1.0)
        z = abs((current - mean) / std)
        if z >= 1.5:
            strength = round(float(np.clip(z / 4.0, 0.0, 1.0)), 4)
            direction = "above" if current > mean else "below"
            candidates.append({
                "driver": f"{metric_name.replace('_', ' ').title()} {direction} average ({z:.1f} sigma)",
                "category": "Environment",
                "correlation_strength": strength,
                "description": (
                    f"{metric_name.replace('_', ' ')} is {abs(current - mean):.1f} units {direction} its own "
                    f"baseline at the same time as this anomaly ({z:.1f} standard deviations)."
                ),
                "recommended_fix": "Monitor — likely a contributing environmental factor, not the primary cause.",
            })

    if not candidates:
        return {
            "anomaly_id": anomaly.anomaly_id,
            "asset_id": machine.machine_id,
            "asset_name": machine.machine_name or machine.machine_id,
            "metric": anomaly.metric,
            "detected_at": anomaly.detected_at.isoformat(),
            "ranked_drivers": [],
            "drill_down_path": [machine.plant_id, machine.line, machine.machine_id, "undetermined"],
            "confidence": 0.0,
            "historical_accuracy": _historical_accuracy(db),
            "data_completeness": _data_completeness(db, anomaly),
            "llm_summary": "No statistically significant driver was found for this anomaly yet.",
        }

    candidates.sort(key=lambda c: c["correlation_strength"], reverse=True)
    total_strength = sum(c["correlation_strength"] for c in candidates) or 1.0
    for c in candidates:
        c["contribution_pct"] = round(100 * c["correlation_strength"] / total_strength, 1)
        c["shap_value"] = round(c["correlation_strength"] * 0.4, 4)  # scaled proxy for a real SHAP value

    top_strength = candidates[0]["correlation_strength"]
    historical_accuracy = _historical_accuracy(db)
    data_completeness = _data_completeness(db, anomaly)
    confidence = round(100 * (0.5 * top_strength + 0.3 * historical_accuracy + 0.2 * data_completeness), 1) / 100

    top = candidates[0]
    llm_summary = (
        f"{machine.line} is running over its {anomaly.metric.replace('_', ' ')} baseline due to "
        f"{top['driver'].lower()} — {top['recommended_fix'].lower()}"
    )

    return {
        "anomaly_id": anomaly.anomaly_id,
        "asset_id": machine.machine_id,
        "asset_name": machine.machine_name or machine.machine_id,
        "metric": anomaly.metric,
        "detected_at": anomaly.detected_at.isoformat(),
        "ranked_drivers": candidates[:5],
        "drill_down_path": [machine.plant_id, machine.line, machine.machine_id, candidates[0]["driver"]],
        "confidence": confidence,
        "historical_accuracy": historical_accuracy,
        "data_completeness": data_completeness,
        "llm_summary": llm_summary,
    }


def _historical_accuracy(db: Session) -> float:
    total = db.query(models.ActionLog).filter(models.ActionLog.tracking_status != "pending_verification").count()
    if total == 0:
        return 0.6
    verified = db.query(models.ActionLog).filter(models.ActionLog.tracking_status == "verified").count()
    return round(verified / total, 4)


def _data_completeness(db: Session, anomaly: models.Anomaly) -> float:
    count = (
        db.query(models.SensorReading)
        .filter(
            models.SensorReading.machine_id == anomaly.machine_id,
            models.SensorReading.timestamp >= anomaly.detected_at - LOOKBACK,
        )
        .count()
    )
    expected = LOOKBACK.days * 24
    return round(min(count / expected, 1.0), 4) if expected else 1.0
