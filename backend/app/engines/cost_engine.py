"""
Cost Calculation Engine — Activity-Based Costing (ABC), reconciled with
15_Backend_Full_Specification.md Section 1.2 (adds total_monthly_cost,
projected_monthly_cost, total_units_produced, and a daily trend series
so the Dashboard's cost trend chart has real data instead of an empty state).
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import models


def cost_per_unit(material_cost: float, energy_cost: float, labor_cost: float,
                   machine_hours_used: float, total_plant_hours: float,
                   total_plant_overhead: float, units_produced: float) -> dict:
    if total_plant_hours <= 0 or units_produced <= 0:
        raise ValueError("total_plant_hours and units_produced must be > 0")
    allocated_overhead = (machine_hours_used / total_plant_hours) * total_plant_overhead
    total_cost = material_cost + energy_cost + labor_cost + allocated_overhead
    return {
        "cost_per_unit": round(total_cost / units_produced, 2),
        "material_cost": round(material_cost, 2),
        "energy_cost": round(energy_cost, 2),
        "labor_cost": round(labor_cost, 2),
        "allocated_overhead": round(allocated_overhead, 2),
    }


def _base_query(db: Session, plant_id, line_id):
    q = (
        db.query(
            models.ProductionRecord.shift_start,
            models.CostRecord.material_cost,
            models.CostRecord.energy_cost,
            models.CostRecord.labor_cost,
            models.CostRecord.allocated_overhead,
            models.ProductionRecord.units_produced,
        )
        .join(models.ProductionRecord, models.CostRecord.production_record_id == models.ProductionRecord.record_id)
        .join(models.Machine, models.ProductionRecord.machine_id == models.Machine.machine_id)
    )
    if plant_id:
        q = q.filter(models.Machine.plant_id == plant_id)
    if line_id:
        q = q.filter(models.Machine.line == line_id)
    return q


def get_cost_summary(db: Session, plant_id: str | None, line_id: str | None,
                      date_from: datetime | None, date_to: datetime | None) -> dict:
    q = _base_query(db, plant_id, line_id)
    if date_from:
        q = q.filter(models.ProductionRecord.shift_start >= date_from)
    if date_to:
        q = q.filter(models.ProductionRecord.shift_start <= date_to)
    rows = q.all()

    material = sum(float(r.material_cost) for r in rows)
    energy = sum(float(r.energy_cost) for r in rows)
    labor = sum(float(r.labor_cost) for r in rows)
    overhead = sum(float(r.allocated_overhead) for r in rows)
    units = sum(float(r.units_produced) for r in rows) or 1.0
    total = material + energy + labor + overhead
    current_cpu = round(total / units, 2)

    baseline_cpu = get_baseline_cost_per_unit(db, plant_id, line_id, date_from)
    variance_pct = round(((current_cpu - baseline_cpu) / baseline_cpu) * 100, 1) if baseline_cpu else 0.0

    days_in_range = max(((date_to or datetime.utcnow()) - (date_from or datetime.utcnow() - timedelta(days=30))).days, 1)
    total_monthly_cost = round(total * (30.0 / days_in_range), 2) if days_in_range else round(total, 2)
    projected_monthly_cost = round(total_monthly_cost * (1 + variance_pct / 100.0), 2)

    trend = _daily_trend(rows, baseline_cpu)

    return {
        "plant_id": plant_id,
        "line_id": line_id,
        "cost_per_unit": current_cpu,
        "baseline_cost_per_unit": baseline_cpu,
        "variance_pct": variance_pct,
        "total_monthly_cost": total_monthly_cost,
        "projected_monthly_cost": projected_monthly_cost,
        "total_units_produced": round(units, 0),
        "breakdown": {
            "material_cost": round(material, 2),
            "energy_cost": round(energy, 2),
            "labor_cost": round(labor, 2),
            "allocated_overhead": round(overhead, 2),
        },
        "trend": trend,
    }


def _daily_trend(rows, baseline_cpu: float) -> list[dict]:
    by_day: dict[str, dict] = {}
    for r in rows:
        day = r.shift_start.date().isoformat()
        bucket = by_day.setdefault(day, {"cost": 0.0, "units": 0.0})
        bucket["cost"] += float(r.material_cost) + float(r.energy_cost) + float(r.labor_cost) + float(r.allocated_overhead)
        bucket["units"] += float(r.units_produced)

    trend = []
    for day in sorted(by_day):
        b = by_day[day]
        actual_cost = round(b["cost"] / b["units"], 2) if b["units"] else 0.0
        trend.append({
            "timestamp": f"{day}T00:00:00+05:30",
            "actual_cost": actual_cost,
            "baseline_cost": baseline_cpu,
            "units": round(b["units"], 0),
            "variance": round(((actual_cost - baseline_cpu) / baseline_cpu) * 100, 1) if baseline_cpu else 0.0,
        })
    return trend


def get_baseline_cost_per_unit(db: Session, plant_id, line_id, date_from) -> float:
    q = _base_query(db, plant_id, line_id)
    if date_from:
        q = q.filter(models.ProductionRecord.shift_start < date_from)
    rows = q.all()
    total = sum(float(r.material_cost) + float(r.energy_cost) + float(r.labor_cost) + float(r.allocated_overhead) for r in rows)
    units = sum(float(r.units_produced) for r in rows)
    if units <= 0:
        return 0.0
    return round(total / units, 2)
