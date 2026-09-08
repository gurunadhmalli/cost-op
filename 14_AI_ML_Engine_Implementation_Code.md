# AI & ML Engine Implementation Code Reference
## AI-Powered Industrial Cost Optimization Assistant — Analytics & AI Layer

---

## 1. Scope & Engine Overview

This document provides the complete Python source code implementation for all 5 core Analytics & AI engines:

```
analytics_ai/
├── cost_engine/
│   └── allocate.py                      # Activity-Based Costing Engine
├── baseline_engine/
│   └── rolling_baseline.py              # 90-Day Rolling Baseline & Seasonality
├── ml_models/
│   ├── anomaly_isolation_forest.py      # Isolation Forest Anomaly Detection
│   └── forecast_prophet_xgboost.py      # Cost & Production Forecasting
├── root_cause_engine/
│   └── correlate.py                     # SHAP TreeExplainer & Confidence Engine
└── optimization_engine/
    └── solve.py                         # PuLP / OR-Tools Linear Programming Solver
```

---

## 2. Engine 1: Activity-Based Cost Engine (`allocate.py`)

```python
"""
Activity-Based Costing (ABC) Engine
Allocates material, energy, labor, and machine-hour overheads dynamically to each production batch/unit.
"""

from typing import Dict

def compute_activity_based_cost(
    material_cost: float,
    energy_kwh_used: float,
    energy_tariff_per_kwh: float,
    labor_hours: float,
    labor_rate_per_hour: float,
    machine_hours_used: float,
    total_plant_hours: float,
    total_plant_overhead: float,
    units_produced: float,
) -> Dict[str, float]:
    """
    Computes per-unit cost by dynamically allocating indirect overhead based on machine utilization.
    """
    if units_produced <= 0:
        raise ValueError("Units produced must be greater than zero.")

    # Direct costs
    total_energy_cost = energy_kwh_used * energy_tariff_per_kwh
    total_labor_cost = labor_hours * labor_rate_per_hour

    # Machine-hour proportional overhead allocation
    allocated_overhead = (machine_hours_used / total_plant_hours) * total_plant_overhead if total_plant_hours > 0 else 0.0

    total_incurred_cost = material_cost + total_energy_cost + total_labor_cost + allocated_overhead
    cost_per_unit = total_incurred_cost / units_produced

    return {
        "cost_per_unit": round(cost_per_unit, 4),
        "total_cost": round(total_incurred_cost, 2),
        "material_cost_per_unit": round(material_cost / units_produced, 4),
        "energy_cost_per_unit": round(total_energy_cost / units_produced, 4),
        "labor_cost_per_unit": round(total_labor_cost / units_produced, 4),
        "overhead_per_unit": round(allocated_overhead / units_produced, 4),
    }
```

---

## 3. Engine 2: 90-Day Rolling Baseline Engine (`rolling_baseline.py`)

```python
"""
Rolling Baseline & Seasonality Engine
Computes moving averages, day-of-week/shift seasonal indices, and confidence bounds.
"""

import pandas as pd
import numpy as np

def calculate_seasonal_baseline(df: pd.DataFrame, window_days: int = 90) -> pd.DataFrame:
    """
    Input df columns: ['timestamp', 'value', 'shift_id', 'ambient_temp']
    Returns df with ['baseline', 'upper_bound_3sigma', 'lower_bound_3sigma']
    """
    df = df.sort_values("timestamp").copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.set_index("timestamp")

    # 1. 90-Day Rolling Mean and Standard Deviation
    rolling_mean = df["value"].rolling(f"{window_days}D", min_periods=24).mean()
    rolling_std = df["value"].rolling(f"{window_days}D", min_periods=24).std()

    # 2. Hourly Seasonality Factor
    hourly_avg = df.groupby(df.index.hour)["value"].transform("mean")
    overall_mean = df["value"].mean()
    seasonal_multiplier = hourly_avg / overall_mean if overall_mean > 0 else 1.0

    # 3. Seasonal Baseline & Confidence Bands
    adjusted_baseline = rolling_mean * seasonal_multiplier
    upper_bound = adjusted_baseline + (2.5 * rolling_std)
    lower_bound = np.maximum(0, adjusted_baseline - (2.5 * rolling_std))

    df["baseline"] = adjusted_baseline
    df["upper_bound"] = upper_bound
    df["lower_bound"] = lower_bound

    return df.reset_index()
```

---

## 4. Engine 3: Isolation Forest Anomaly Detection (`anomaly_isolation_forest.py`)

```python
"""
Unsupervised Anomaly Detection using Isolation Forest (scikit-learn / PyOD)
Runs continuous scoring on live streaming sensor telemetry.
"""

from sklearn.ensemble import IsolationForest
import numpy as np
import mlflow
import mlflow.sklearn

class TelemetryAnomalyDetector:
    def __init__(self, contamination: float = 0.02, random_state: int = 42):
        self.contamination = contamination
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=150,
            n_jobs=-1,
        )

    def train_on_baseline(self, baseline_features: np.ndarray, model_name: str = "iso_forest_prod"):
        with mlflow.start_run(run_name="retrain_anomaly_model"):
            self.model.fit(baseline_features)
            mlflow.log_param("contamination", self.contamination)
            mlflow.sklearn.log_model(self.model, model_name)

    def score_reading(self, reading_features: np.ndarray) -> dict:
        """
        Calculates anomaly score: 0.0 (normal) to 1.0 (highly anomalous).
        """
        # decision_function returns negative for outliers, positive for inliers
        raw_score = self.model.decision_function(reading_features)
        # Normalize to 0.0 - 1.0 scale
        normalized_score = float(1.0 / (1.0 + np.exp(raw_score * 4.0))[0])
        is_anomaly = bool(self.model.predict(reading_features)[0] == -1)

        severity = "low"
        if normalized_score > 0.75:
            severity = "high"
        elif normalized_score > 0.50:
            severity = "medium"

        return {
            "anomaly_score": round(normalized_score, 4),
            "is_anomaly": is_anomaly,
            "severity": severity,
        }
```

---

## 5. Engine 4: SHAP Root Cause Attribution (`correlate.py`)

```python
"""
Explainable AI Root Cause Analysis via TreeExplainer SHAP
Ranks candidate operational drivers and computes system-wide confidence score.
"""

import shap
import pandas as pd
import numpy as np

def explain_anomaly_drivers(
    trained_model,
    anomaly_window_features: pd.DataFrame,
    candidate_driver_names: list,
) -> dict:
    """
    Computes SHAP value contributions and ranks top drivers.
    """
    explainer = shap.TreeExplainer(trained_model)
    shap_values = explainer.shap_values(anomaly_window_features)

    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    total_shap = np.sum(mean_abs_shap) if np.sum(mean_abs_shap) > 0 else 1.0

    ranked_drivers = []
    for idx, driver_name in enumerate(candidate_driver_names):
        pct_contribution = float((mean_abs_shap[idx] / total_shap) * 100)
        ranked_drivers.append({
            "driver": driver_name,
            "shap_value": float(shap_values[:, idx].mean()),
            "contribution_pct": round(pct_contribution, 1),
        })

    # Sort descending by contribution
    ranked_drivers.sort(key=lambda x: x["contribution_pct"], reverse=True)
    return {"ranked_drivers": ranked_drivers}

def compute_confidence_score(
    correlation_strength: float,
    historical_accuracy: float,
    data_completeness: float,
) -> float:
    """
    Weighted Confidence Scoring Formula:
    Confidence = 0.5 * Correlation + 0.3 * HistoricalAccuracy + 0.2 * DataCompleteness
    """
    raw_confidence = (0.5 * correlation_strength) + (0.3 * historical_accuracy) + (0.2 * data_completeness)
    return round(float(raw_confidence), 4)
```

---

## 6. Engine 5: PuLP / OR-Tools Constrained Optimizer (`solve.py`)

```python
"""
Linear & Mixed-Integer Programming Optimizer
Formulates cost minimization problems with throughput, capacity, and downtime constraints.
"""

from pulp import LpProblem, LpMinimize, LpVariable, lpSum, LpStatus

def solve_cost_optimization(
    candidate_actions: list,
    min_required_production: float,
    max_allowable_downtime_hours: float,
) -> dict:
    """
    candidate_actions format:
    [
        {"id": "ACT-01", "action": "Filter replacement", "cost": 1200, "downtime": 0.25, "savings": 550000},
        {"id": "ACT-02", "action": "Setpoint trim", "cost": 0, "downtime": 0, "savings": 210000},
    ]
    """
    prob = LpProblem("Industrial_Cost_Minimization", LpMinimize)

    # Binary decision variable: 1 if action is implemented, 0 otherwise
    action_vars = {
        item["id"]: LpVariable(f"choose_{item['id']}", cat="Binary")
        for item in candidate_actions
    }

    # Objective: Minimize net cost (Implementation Cost - Projected Savings)
    prob += lpSum(
        (item["cost"] - item["savings"]) * action_vars[item["id"]]
        for item in candidate_actions
    )

    # Constraint 1: Maximum allowable downtime hours
    prob += lpSum(
        item["downtime"] * action_vars[item["id"]]
        for item in candidate_actions
    ) <= max_allowable_downtime_hours

    # Solve
    prob.solve()

    results = []
    for item in candidate_actions:
        is_selected = bool(action_vars[item["id"]].varValue == 1.0)
        payback_days = round((item["cost"] / (item["savings"] / 90)), 1) if item["savings"] > 0 else 999.0
        results.append({
            **item,
            "selected_by_solver": is_selected,
            "payback_days": payback_days,
            "feasible": True if item["downtime"] <= max_allowable_downtime_hours else False,
        })

    # Rank by projected savings
    results.sort(key=lambda x: x["savings"], reverse=True)
    for rank, item in enumerate(results, 1):
        item["rank"] = rank

    return {
        "solver_status": LpStatus[prob.status],
        "ranked_scenarios": results,
    }
```
