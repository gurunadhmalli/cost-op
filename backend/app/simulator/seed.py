"""
Seeds the database with master data, ~365 days (1 year) of hourly synthetic
sensor history, production/cost records, and one deliberately-injected anomaly
matching the PDF's own worked example (Line 3 Extrusion, chiller filter
skipped, ~22% energy overrun, ₹18,400/day, ₹5.5L/quarter, 87% confidence).

This stands in for the real ERP/MES/IoT connectors described in
03_Data_Architecture.md — there's no live plant to connect to yet, so this
generates a realistic, internally-consistent dataset to demo against.
Run: python -m app.simulator.seed
"""
import random
from datetime import datetime, timedelta

from app.db.database import Base, engine, SessionLocal
from app.db import models

random.seed(42)


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Plant).count() > 0:
            print("Already seeded — skipping. Delete the tables to reseed.")
            return

        plant = models.Plant(plant_id="PLANT-01", plant_name="Chennai Extrusion Plant", location="Chennai, TN")
        db.add(plant)

        machine = models.Machine(
            machine_id="LINE3-EXT-01", plant_id=plant.plant_id, line="LINE-03",
            machine_name="Extruder 3A", machine_type="Extruder", status="warning",
            target_cost_per_unit=39.10,
        )
        machine2 = models.Machine(
            machine_id="LINE1-PKG-01", plant_id=plant.plant_id, line="LINE-01",
            machine_name="Packaging Line 1", machine_type="Packager", status="optimal",
            target_cost_per_unit=21.50,
        )
        db.add_all([machine, machine2])

        product = models.Product(product_id="PROD-01", sku="EXT-PIPE-50MM", unit_of_measure="unit")
        db.add(product)
        db.commit()

        now = datetime.utcnow()
        anomaly_time = now.replace(hour=3, minute=40, second=0, microsecond=0)
        if anomaly_time > now:
            anomaly_time -= timedelta(days=1)

        # --- 365 days (1 year) of hourly sensor history per machine/metric ---
        metrics = {
            "LINE3-EXT-01": {"energy_kwh": (398.2, 8.0, "kWh"), "temperature_c": (68.0, 2.0, "C")},
            "LINE1-PKG-01": {"energy_kwh": (120.0, 4.0, "kWh"), "temperature_c": (32.0, 1.5, "C")},
        }
        for machine_id, metric_specs in metrics.items():
            for metric, (mean, std, unit) in metric_specs.items():
                for hours_ago in range(365 * 24, -1, -1):
                    ts = now - timedelta(hours=hours_ago)
                    value = random.gauss(mean, std)
                    # Inject the anomaly: energy spikes ~22% at the worked-example time on LINE3
                    if machine_id == "LINE3-EXT-01" and metric == "energy_kwh" and abs((ts - anomaly_time).total_seconds()) < 3600:
                        value = mean * 1.22
                    db.add(models.SensorReading(machine_id=machine_id, metric=metric, value=round(value, 2), unit=unit, timestamp=ts))
        db.commit()

        # --- Maintenance event: the skipped filter change causing the anomaly ---
        db.add(models.MaintenanceEvent(
            machine_id="LINE3-EXT-01", event_type="filter_change_skipped",
            event_time=anomaly_time - timedelta(days=4),
        ))
        db.commit()

        # --- Production + cost records for the last 365 days (for cost/summary) ---
        for days_ago in range(365, -1, -1):
            shift_start = now - timedelta(days=days_ago)
            for machine_id, base_units, base_cost in [
                ("LINE3-EXT-01", 980, {"m": 18.2, "e": 12.05, "l": 8.1, "o": 4.5}),
                ("LINE1-PKG-01", 1500, {"m": 9.0, "e": 3.2, "l": 4.1, "o": 2.0}),
            ]:
                units = base_units + random.randint(-30, 30)
                wo = models.WorkOrder(plant_id=plant.plant_id, product_id=product.product_id,
                                       start_time=shift_start, end_time=shift_start + timedelta(hours=8))
                db.add(wo)
                db.flush()
                pr = models.ProductionRecord(work_order_id=wo.work_order_id, machine_id=machine_id,
                                              units_produced=units, shift_start=shift_start)
                db.add(pr)
                db.flush()
                # Cost overrun on LINE3 in the days around the anomaly
                overrun = 1.15 if (machine_id == "LINE3-EXT-01" and days_ago <= 1) else 1.0
                db.add(models.CostRecord(
                    production_record_id=pr.record_id,
                    material_cost=round(base_cost["m"] * units * overrun, 2),
                    energy_cost=round(base_cost["e"] * units * overrun, 2),
                    labor_cost=round(base_cost["l"] * units, 2),
                    allocated_overhead=round(base_cost["o"] * units, 2),
                ))
        db.commit()

        # --- The anomaly itself, plus its root cause and recommendation ---
        anomaly = models.Anomaly(
            anomaly_id="AN-20260830-0134", machine_id="LINE3-EXT-01", metric="energy_kwh", unit="kWh",
            current_value=485.8, baseline_value=398.2, anomaly_score=0.81,
            detected_at=anomaly_time, severity="high", status="open",
            estimated_cost_impact_per_day=18400,
        )
        db.add(anomaly)
        db.commit()

        root_cause = models.RootCause(
            anomaly_id=anomaly.anomaly_id,
            driver="Filter change skipped (4.0d ago)", category="Maintenance",
            correlation_strength=0.79, contribution_pct=61.0, shap_value=0.34,
            description="Extruder 3A's maintenance record shows a 'filter change skipped' event 4 days before this anomaly.",
            recommended_fix="Replace the chiller secondary filter cartridge immediately.",
            confidence=0.87,
        )
        db.add(root_cause)
        db.commit()

        rec = models.Recommendation(
            root_cause_id=root_cause.root_cause_id,
            title="Replace Chiller Secondary Filter Cartridge", action="filter_replacement",
            category="Maintenance", projected_savings=550000, implementation_cost=1200,
            payback_days=2, confidence=0.87, status="open",
        )
        db.add(rec)
        db.commit()

        print(f"Seeded 1 plant, 2 machines, {365*24*2} sensor readings, 366 days of production/cost, "
              f"1 anomaly ({anomaly.anomaly_id}), 1 root cause, 1 recommendation ({rec.recommendation_id}).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
