"""
ML Models — Anomaly Detection (Isolation Forest), exactly as specced in the
AI/ML Architecture doc:

    model = IsolationForest(contamination=0.02, random_state=42)
    model.fit(baseline_features)
    anomaly_score = model.decision_function(current_reading)
    is_anomaly    = model.predict(current_reading) == -1

Trained per (machine_id, metric) on whatever rolling history is available.
Falls back to a z-score heuristic when there isn't yet enough history to
fit a model (cold-start — new asset, <30 points).
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

MIN_POINTS_FOR_MODEL = 30


def score_reading(history: pd.DataFrame, current_value: float) -> dict:
    """
    history: DataFrame with a 'value' column (chronological).
    current_value: the newest reading to score.
    Returns {'anomaly_score': float, 'is_anomaly': bool, 'method': str}
    """
    if len(history) < MIN_POINTS_FOR_MODEL:
        return _zscore_fallback(history, current_value)

    features = history[["value"]].to_numpy()
    model = IsolationForest(contamination=0.02, random_state=42)
    model.fit(features)

    current = np.array([[current_value]])
    raw_score = model.decision_function(current)[0]          # higher = more normal
    is_anomaly = bool(model.predict(current)[0] == -1)

    # Normalize decision_function's roughly [-0.5, 0.5] range to a 0..1
    # "unusualness" score so the API always returns an intuitive 0-1 value.
    anomaly_score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
    return {"anomaly_score": round(anomaly_score, 4), "is_anomaly": is_anomaly, "method": "isolation_forest"}


def _zscore_fallback(history: pd.DataFrame, current_value: float) -> dict:
    if history.empty:
        return {"anomaly_score": 0.0, "is_anomaly": False, "method": "insufficient_history"}
    mean = history["value"].mean()
    std = history["value"].std(ddof=0) or 1.0
    z = abs((current_value - mean) / std)
    anomaly_score = float(np.clip(z / 4.0, 0.0, 1.0))  # z>=4 -> score 1.0
    return {
        "anomaly_score": round(anomaly_score, 4),
        "is_anomaly": z >= 2.5,
        "method": "zscore_fallback",
    }


def severity_from_score(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"
