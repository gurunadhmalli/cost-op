"""
Baseline & Benchmark Engine — rolling window baseline with a simple
hour-of-day seasonality adjustment, per machine/metric.

In production this runs over a 90-day rolling window (per the architecture
docs); the prototype uses whatever history exists (seeded + simulated data),
so it works from day one without waiting 90 days.
"""
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy.orm import Session

from app.db import models


def load_readings(db: Session, machine_id: str, metric: str, window_days: int = 90) -> pd.DataFrame:
    since = datetime.utcnow() - timedelta(days=window_days)
    rows = (
        db.query(models.SensorReading.timestamp, models.SensorReading.value)
        .filter(
            models.SensorReading.machine_id == machine_id,
            models.SensorReading.metric == metric,
            models.SensorReading.timestamp >= since,
        )
        .order_by(models.SensorReading.timestamp)
        .all()
    )
    if not rows:
        return pd.DataFrame(columns=["timestamp", "value"])
    df = pd.DataFrame(rows, columns=["timestamp", "value"])
    df["value"] = df["value"].astype(float)
    return df


def compute_baseline(df: pd.DataFrame) -> dict:
    """
    Returns {'mean': ..., 'std': ..., 'hourly_factor': {hour: factor}}
    used both for human-readable baselines and as anomaly-model features.
    """
    if df.empty:
        return {"mean": 0.0, "std": 0.0, "hourly_factor": {}}

    overall_mean = df["value"].mean()
    df = df.copy()
    df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
    hourly_mean = df.groupby("hour")["value"].mean()
    hourly_factor = (hourly_mean / overall_mean).to_dict() if overall_mean else {}

    return {
        "mean": float(overall_mean),
        "std": float(df["value"].std(ddof=0) or 0.0),
        "hourly_factor": {int(h): float(f) for h, f in hourly_factor.items()},
    }


def expected_value_now(baseline: dict, at: datetime) -> float:
    factor = baseline["hourly_factor"].get(at.hour, 1.0)
    return baseline["mean"] * factor
