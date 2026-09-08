"""GET /api/plants — the one endpoint the frontend expects in camelCase
as-is (no snake_case mapping happens client-side for this call)."""
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models

router = APIRouter()


@router.get("")
def get_plants(db: Session = Depends(get_db)):
    plants = db.query(models.Plant).all()
    result = []
    for plant in plants:
        machines = db.query(models.Machine).filter(models.Machine.plant_id == plant.plant_id).all()
        lines_map: dict[str, dict] = defaultdict(lambda: {"machines": [], "targets": []})
        for m in machines:
            latest = _latest_telemetry(db, m.machine_id)
            lines_map[m.line]["machines"].append({
                "id": m.machine_id,
                "name": m.machine_name or m.machine_id,
                "lineId": m.line,
                "plantId": m.plant_id,
                "machineType": m.machine_type or "",
                "status": m.status or "optimal",
                "currentTelemetry": latest,
            })
            lines_map[m.line]["targets"].append(float(m.target_cost_per_unit or 0))

        lines = []
        for line_id, data in lines_map.items():
            targets = [t for t in data["targets"] if t]
            lines.append({
                "id": line_id,
                "name": data["machines"][0]["name"].split(" ")[0] + f" — {line_id}" if data["machines"] else line_id,
                "plantId": plant.plant_id,
                "machines": data["machines"],
                "targetCostPerUnit": round(sum(targets) / len(targets), 2) if targets else 0.0,
            })

        result.append({
            "id": plant.plant_id,
            "name": plant.plant_name,
            "location": plant.location or "",
            "lines": lines,
        })
    return result


def _latest_telemetry(db: Session, machine_id: str) -> dict:
    metrics = ["energy_kwh", "temperature_c", "vibration_mm_s", "pressure_bar", "oee_pct"]
    out = {"energyKwh": 0.0, "temperatureC": 0.0, "vibrationMmS": 0.0, "pressureBar": 0.0, "oeePct": 0.0}
    key_map = {
        "energy_kwh": "energyKwh", "temperature_c": "temperatureC", "vibration_mm_s": "vibrationMmS",
        "pressure_bar": "pressureBar", "oee_pct": "oeePct",
    }
    for metric in metrics:
        row = (
            db.query(models.SensorReading)
            .filter(models.SensorReading.machine_id == machine_id, models.SensorReading.metric == metric)
            .order_by(models.SensorReading.timestamp.desc())
            .first()
        )
        if row:
            out[key_map[metric]] = float(row.value)
    return out
