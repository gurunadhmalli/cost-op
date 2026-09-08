"""
Continuous "live" simulation — the piece that was missing from the free-of-cost
prototype: 01_High_Level_Solution_Architecture.md's Layer 1 (Data Sources)
describes continuous IoT/PLC telemetry, and 03_Data_Architecture.md frames the
whole pipeline as streaming. `simulator/seed.py` only produces one static
snapshot; this module is what actually keeps the plant "alive" after that —
called on a fixed interval by the APScheduler job registered in app/main.py.

Each tick appends one new synthetic sensor reading per machine/metric, scores
it with the exact same Isolation Forest engine the REST API uses
(app/engines/anomaly_engine.py), and — when a reading crosses the threshold —
runs it through the same root-cause engine and creates a Recommendation, so
the whole closed loop (Data -> Anomaly -> Root Cause -> Recommendation) that
04_AI_ML_Architecture.md describes actually happens on its own, continuously,
exactly like a real plant would trigger it. No paid service of any kind is
involved — this is pure Python standing in for the ERP/MES/IoT connectors
described in 03_Data_Architecture.md until real ones are wired up.
"""
import random
from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.db import models
from app.engines import baseline_engine
from app.engines.anomaly_engine import score_reading, severity_from_score
from app.engines.rootcause_engine import analyze as analyze_root_cause

# Same machines/metrics/baselines as simulator/seed.py, so live ticks blend
# in with the seeded history instead of drifting onto a different scale.
_METRICS = {
    "LINE3-EXT-01": {"energy_kwh": (398.2, 8.0, "kWh"), "temperature_c": (68.0, 2.0, "C")},
    "LINE1-PKG-01": {"energy_kwh": (120.0, 4.0, "kWh"), "temperature_c": (32.0, 1.5, "C")},
}

# Calibrated so a ~22% energy_kwh spike on LINE3-EXT-01 (the PDF's worked
# example) lands close to its stated ~₹18,400/day cost impact.
_COST_RATE_PER_UNIT_DEVIATION = {
    "energy_kwh": 210.0,
    "temperature_c": 900.0,
}

_IMPLEMENTATION_COST_PLACEHOLDER = 1200.0
_SPIKE_PROBABILITY = 0.06  # ~1 in 17 ticks injects an out-of-tolerance reading


def tick() -> dict:
    """
    Runs one simulated interval across every machine/metric. Returns a small
    JSON-safe event describing what happened, for broadcasting to any
    connected /ws/live dashboard clients (see app/api/live.py).
    """
    db = SessionLocal()
    event = {
        "type": "tick",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "new_readings": 0,
        "new_anomalies": [],
    }
    try:
        for machine_id, metrics in _METRICS.items():
            for metric, (mean, std, unit) in metrics.items():
                value = random.gauss(mean, std)
                if random.random() < _SPIKE_PROBABILITY:
                    value = mean * random.uniform(1.15, 1.30)
                value = round(value, 2)

                # Score against history *before* this reading is added.
                history = baseline_engine.load_readings(db, machine_id, metric)
                result = score_reading(history, value)

                db.add(models.SensorReading(
                    machine_id=machine_id, metric=metric, value=value,
                    unit=unit, timestamp=datetime.now(timezone.utc),
                ))
                db.flush()
                event["new_readings"] += 1

                if not result["is_anomaly"]:
                    continue

                already_open = (
                    db.query(models.Anomaly)
                    .filter(
                        models.Anomaly.machine_id == machine_id,
                        models.Anomaly.metric == metric,
                        models.Anomaly.status == "open",
                    )
                    .first()
                )
                if already_open:
                    # Don't spam duplicate anomalies for an issue that's
                    # already open and awaiting action.
                    continue

                severity = severity_from_score(result["anomaly_score"])
                cost_rate = _COST_RATE_PER_UNIT_DEVIATION.get(metric, 100.0)
                estimated_cost_impact = round(abs(value - mean) * cost_rate, 2)

                anomaly = models.Anomaly(
                    machine_id=machine_id, metric=metric, unit=unit,
                    current_value=value, baseline_value=round(mean, 2),
                    anomaly_score=result["anomaly_score"], detected_at=datetime.now(timezone.utc),
                    severity=severity, status="open",
                    estimated_cost_impact_per_day=estimated_cost_impact,
                )
                db.add(anomaly)
                db.flush()

                # Same root-cause computation the GET /api/rootcause/{id}
                # endpoint uses, persisted the same way (app/api/rootcause.py).
                rca = analyze_root_cause(db, anomaly)
                new_anomaly_event = {
                    "anomaly_id": anomaly.anomaly_id,
                    "machine_id": machine_id,
                    "metric": metric,
                    "severity": severity,
                }

                if rca["ranked_drivers"]:
                    top = rca["ranked_drivers"][0]
                    root_cause = models.RootCause(
                        anomaly_id=anomaly.anomaly_id,
                        driver=top["driver"],
                        category=top["category"],
                        correlation_strength=top["correlation_strength"],
                        contribution_pct=top["contribution_pct"],
                        shap_value=top["shap_value"],
                        description=top["description"],
                        recommended_fix=top["recommended_fix"],
                        confidence=rca["confidence"],
                    )
                    db.add(root_cause)
                    db.flush()

                    payback_days = max(
                        1, round(_IMPLEMENTATION_COST_PLACEHOLDER / max(estimated_cost_impact, 1.0))
                    )
                    db.add(models.Recommendation(
                        root_cause_id=root_cause.root_cause_id,
                        title=top["recommended_fix"] or f"Investigate {top['driver']}",
                        action=top["driver"].lower().replace(" ", "_").replace("(", "").replace(")", "")[:60],
                        category=top["category"],
                        projected_savings=round(estimated_cost_impact * 90, 2),  # ~quarterly projection
                        implementation_cost=_IMPLEMENTATION_COST_PLACEHOLDER,
                        payback_days=payback_days,
                        confidence=rca["confidence"],
                        status="open",
                    ))
                    new_anomaly_event["recommendation_title"] = top["recommended_fix"] or top["driver"]

                event["new_anomalies"].append(new_anomaly_event)

        db.commit()
    finally:
        db.close()
    return event
