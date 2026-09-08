"""
Enriches the Closed-Loop Action Tracker with a few more realistic
recommendation -> implement -> verify chains, for demo purposes.

Why this exists separately from app/simulator/seed.py: that script seeds
exactly one worked example and no code path in the live app ever writes
ActionLog.verified_savings/variance_pct/recalibration_model_id (there's no
"kpi_remeasure_dag.py" — that's narrative copy in the frontend, not a real
job) or ever moves an Anomaly out of "open". So a fresh demo only ever shows
one pending action and a permanent ₹0 "Total Verified ROI". This adds a
small, internally-consistent set of additional cases — spanning
Maintenance/Process/Material categories, and both under- and over-projection
outcomes — so the closed-loop story (and the dashboard's recommendation mix)
has something to show.

Idempotent per case (keyed on each case's anomaly_id), not on a single
marker — so a case list that grows over time (e.g. adding more "open"
recommendations for a demo) still gets applied to a database that was
already seeded with an earlier, shorter version of this list. Every
anomaly_id must belong to a machine_id that actually exists in dim_machine
(app/api/recommendations.py and anomalies.py inner-join on it — an
unmatched machine_id makes the row invisible to the frontend, not just
unlabeled).
"""
from datetime import datetime, timedelta

from app.db import models
from app.db.database import SessionLocal


def ensure_demo_actions() -> None:
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        cases = [
            # 1. Verified, came in slightly under the projected savings.
            dict(
                anomaly_id="AN-DEMO0001", machine_id="LINE1-PKG-01", metric="energy_kwh", unit="kWh",
                current_value=145.9, baseline_value=120.0, anomaly_score=0.71,
                detected_at=now - timedelta(days=25), severity="medium", status="resolved",
                estimated_cost_impact_per_day=5441.10,
                rc=dict(
                    driver="Conveyor drive bearing wear (Packaging Line 1)", category="Maintenance",
                    correlation_strength=0.71, contribution_pct=58.0, shap_value=0.29,
                    description="Packaging Line 1's conveyor motor is drawing 21.6% more current than "
                                "baseline, consistent with early-stage bearing wear increasing mechanical drag.",
                    recommended_fix="Replace the conveyor drive bearing and re-lubricate the gearbox.",
                    confidence=0.83,
                ),
                rec=dict(
                    title="Replace Packaging Line 1 Conveyor Drive Bearing", action="bearing_replacement",
                    category="Maintenance", projected_savings=145000, implementation_cost=8000,
                    payback_days=5, confidence=0.83,
                ),
                action=dict(
                    implemented_by="Plant Ops Manager",
                    notes="Bearing swapped during scheduled changeover; gearbox re-lubricated.",
                    implemented_at=now - timedelta(days=24),
                    tracking_status="verified",
                    verified_savings=138500, verified_at=now - timedelta(days=17),
                    variance_pct=round(((138500 - 145000) / 145000) * 100, 2),
                    recalibration_model_id="isoforest-v1.4-2026w35",
                ),
            ),
            # 2. Still pending its 7-day verification window.
            dict(
                anomaly_id="AN-DEMO0002", machine_id="LINE1-PKG-01", metric="temperature_c", unit="C",
                current_value=40.58, baseline_value=32.0, anomaly_score=0.64,
                detected_at=now - timedelta(days=3), severity="medium", status="investigating",
                estimated_cost_impact_per_day=7722.00,
                rc=dict(
                    driver="Sealing bar thermostat drift (Packaging Line 1)", category="Operational",
                    correlation_strength=0.64, contribution_pct=47.0, shap_value=0.21,
                    description="Sealing bar temperature has drifted 26.8% above its calibrated setpoint, "
                                "indicating thermostat sensor drift rather than a process change.",
                    recommended_fix="Recalibrate the sealing bar thermostat against a reference probe.",
                    confidence=0.76,
                ),
                rec=dict(
                    title="Recalibrate Packaging Line 1 Sealing Bar Thermostat",
                    action="thermostat_recalibration", category="Process",
                    projected_savings=62000, implementation_cost=500, payback_days=1, confidence=0.76,
                ),
                action=dict(
                    implemented_by="Plant Ops Manager",
                    notes="Thermostat recalibrated against reference probe; monitoring sealing "
                          "temperature stability over the next cycle.",
                    implemented_at=now - timedelta(days=3),
                    tracking_status="pending_verification",
                    verified_savings=None, verified_at=None, variance_pct=None, recalibration_model_id=None,
                ),
            ),
            # 3. Verified, came in ABOVE the projected savings.
            dict(
                anomaly_id="AN-DEMO0003", machine_id="LINE3-EXT-01", metric="material_scrap_pct", unit="%",
                current_value=6.8, baseline_value=4.1, anomaly_score=0.69,
                detected_at=now - timedelta(days=25), severity="medium", status="resolved",
                estimated_cost_impact_per_day=9200.00,
                rc=dict(
                    driver="High-viscosity polymer batch switch (Grade HD-5420 to HD-5810)", category="Material",
                    correlation_strength=0.68, contribution_pct=52.0, shap_value=0.24,
                    description="Scrap rate rose after a supplier batch switch to a higher-viscosity polymer "
                                "grade increased melt index variability.",
                    recommended_fix="Adjust barrel temperature profile zone 4 by +3°C to reduce shear viscosity.",
                    confidence=0.81,
                ),
                rec=dict(
                    title="Adjust Extruder 3A Barrel Temperature Profile (Zone 4)",
                    action="barrel_temp_adjustment", category="Material",
                    projected_savings=210000, implementation_cost=0, payback_days=0, confidence=0.81,
                ),
                action=dict(
                    implemented_by="Plant Ops Manager",
                    notes="Zone 4 barrel temperature increased by 3°C per root-cause recommendation; "
                          "scrap rate monitored over the following week.",
                    implemented_at=now - timedelta(days=24),
                    tracking_status="verified",
                    verified_savings=224000, verified_at=now - timedelta(days=17),
                    variance_pct=round(((224000 - 210000) / 210000) * 100, 2),
                    recalibration_model_id="isoforest-v1.3-2026w32",
                ),
            ),
            # 4. Open recommendation, not implemented yet — keeps the
            #    dashboard's recommendation list from being all-implemented.
            dict(
                anomaly_id="AN-DEMO0004", machine_id="LINE3-EXT-01", metric="pressure_bar", unit="bar",
                current_value=172.4, baseline_value=155.0, anomaly_score=0.55,
                detected_at=now - timedelta(hours=6), severity="low", status="investigating",
                estimated_cost_impact_per_day=3100.00,
                rc=dict(
                    driver="Die pressure creeping upward (Extruder 3A)", category="Operational",
                    correlation_strength=0.52, contribution_pct=38.0, shap_value=0.15,
                    description="Die-head pressure has trended 11.2% above baseline over the past 6 hours "
                                "without a corresponding throughput increase, consistent with early die buildup.",
                    recommended_fix="Schedule a die-head cleaning during the next changeover window.",
                    confidence=0.62,
                ),
                rec=dict(
                    title="Schedule Extruder 3A Die-Head Cleaning", action="die_head_cleaning",
                    category="Process", projected_savings=38000, implementation_cost=300,
                    payback_days=2, confidence=0.62,
                ),
                action=None,  # not implemented yet
            ),
            # 5-10. More open recommendations, not implemented yet — added so
            # a demo has a deep enough queue of "Implement" actions to click
            # through without running dry (SIH run-through, 2026-10-25).
            dict(
                anomaly_id="AN-DEMO0005", machine_id="LINE1-PKG-01", metric="energy_kwh", unit="kWh",
                current_value=138.2, baseline_value=120.0, anomaly_score=0.58,
                detected_at=now - timedelta(hours=9), severity="low", status="investigating",
                estimated_cost_impact_per_day=4120.00,
                rc=dict(
                    driver="Vacuum pump seal degradation (Packaging Line 1)", category="Operational",
                    correlation_strength=0.57, contribution_pct=41.0, shap_value=0.18,
                    description="The vacuum pump is drawing 15.2% more energy than baseline to hold the same "
                                "seal pressure, consistent with a worn pump seal letting vacuum bleed off.",
                    recommended_fix="Replace the vacuum pump seal and re-test hold pressure.",
                    confidence=0.74,
                ),
                rec=dict(
                    title="Replace Packaging Line 1 Vacuum Pump Seal", action="vacuum_pump_seal_replacement",
                    category="Maintenance", projected_savings=98000, implementation_cost=4500,
                    payback_days=3, confidence=0.74,
                ),
                action=None,
            ),
            dict(
                anomaly_id="AN-DEMO0006", machine_id="LINE1-PKG-01", metric="energy_kwh", unit="kWh",
                current_value=126.5, baseline_value=112.0, anomaly_score=0.49,
                detected_at=now - timedelta(hours=14), severity="low", status="investigating",
                estimated_cost_impact_per_day=2380.00,
                rc=dict(
                    driver="Full-power idle during changeovers (Packaging Line 1)", category="Operational",
                    correlation_strength=0.48, contribution_pct=33.0, shap_value=0.12,
                    description="The line stays at full drive power through changeover gaps instead of "
                                "dropping to standby, adding measurable idle-time energy draw.",
                    recommended_fix="Enable standby power mode during changeover idle windows.",
                    confidence=0.69,
                ),
                rec=dict(
                    title="Optimize Packaging Line 1 Idle-Time Power Mode", action="idle_power_mode_optimization",
                    category="Process", projected_savings=56000, implementation_cost=0,
                    payback_days=0, confidence=0.69,
                ),
                action=None,
            ),
            dict(
                anomaly_id="AN-DEMO0007", machine_id="LINE3-EXT-01", metric="temperature_c", unit="C",
                current_value=214.8, baseline_value=198.0, anomaly_score=0.61,
                detected_at=now - timedelta(hours=5), severity="medium", status="investigating",
                estimated_cost_impact_per_day=5860.00,
                rc=dict(
                    driver="Cooling jacket circulation loss (Extruder 3A)", category="Operational",
                    correlation_strength=0.60, contribution_pct=44.0, shap_value=0.20,
                    description="Barrel temperature is running 8.5% above setpoint with coolant flow trending "
                                "down, consistent with a partially blocked cooling jacket circulation pump.",
                    recommended_fix="Service the cooling jacket circulation pump and flush the coolant loop.",
                    confidence=0.79,
                ),
                rec=dict(
                    title="Service Extruder 3A Cooling Jacket Circulation Pump", action="cooling_pump_service",
                    category="Maintenance", projected_savings=176000, implementation_cost=6000,
                    payback_days=1, confidence=0.79,
                ),
                action=None,
            ),
            dict(
                anomaly_id="AN-DEMO0008", machine_id="LINE3-EXT-01", metric="energy_kwh", unit="kWh",
                current_value=612.0, baseline_value=540.0, anomaly_score=0.53,
                detected_at=now - timedelta(hours=11), severity="low", status="investigating",
                estimated_cost_impact_per_day=3340.00,
                rc=dict(
                    driver="High-shear screw profile on a low-viscosity grade (Extruder 3A)", category="Material",
                    correlation_strength=0.52, contribution_pct=36.0, shap_value=0.14,
                    description="Current screw profile is tuned for a higher-viscosity grade than what's "
                                "running today, forcing higher shear energy than the material needs.",
                    recommended_fix="Switch to the low-shear screw profile for this material grade.",
                    confidence=0.66,
                ),
                rec=dict(
                    title="Switch Extruder 3A to Low-Shear Screw Profile", action="screw_profile_switch",
                    category="Material", projected_savings=71000, implementation_cost=1200,
                    payback_days=1, confidence=0.66,
                ),
                action=None,
            ),
            dict(
                anomaly_id="AN-DEMO0009", machine_id="LINE1-PKG-01", metric="temperature_c", unit="C",
                current_value=44.1, baseline_value=32.0, anomaly_score=0.67,
                detected_at=now - timedelta(hours=3), severity="medium", status="investigating",
                estimated_cost_impact_per_day=6210.00,
                rc=dict(
                    driver="Worn heat-seal element (Packaging Line 1)", category="Operational",
                    correlation_strength=0.65, contribution_pct=49.0, shap_value=0.22,
                    description="Seal temperature overshoots setpoint by 37.8% before settling, consistent "
                                "with a worn heating element losing even contact and causing rework/reseals.",
                    recommended_fix="Replace the heat-seal element and verify seal integrity at target temp.",
                    confidence=0.80,
                ),
                rec=dict(
                    title="Replace Packaging Line 1 Heat-Seal Element", action="heat_seal_element_replacement",
                    category="Maintenance", projected_savings=132000, implementation_cost=3800,
                    payback_days=2, confidence=0.80,
                ),
                action=None,
            ),
            dict(
                anomaly_id="AN-DEMO0010", machine_id="LINE3-EXT-01", metric="energy_kwh", unit="kWh",
                current_value=598.4, baseline_value=540.0, anomaly_score=0.51,
                detected_at=now - timedelta(hours=17), severity="low", status="investigating",
                estimated_cost_impact_per_day=2870.00,
                rc=dict(
                    driver="Gearbox lubrication breakdown (Extruder 3A)", category="Operational",
                    correlation_strength=0.50, contribution_pct=35.0, shap_value=0.13,
                    description="Drive energy draw is trending up with no throughput change, consistent with "
                                "rising mechanical friction from degraded gearbox lubrication.",
                    recommended_fix="Inspect and replenish gearbox lubrication; sample oil for wear metals.",
                    confidence=0.63,
                ),
                rec=dict(
                    title="Inspect Extruder 3A Gearbox Lubrication", action="gearbox_lubrication_inspection",
                    category="Maintenance", projected_savings=44000, implementation_cost=800,
                    payback_days=2, confidence=0.63,
                ),
                action=None,
            ),
        ]

        for case in cases:
            if db.query(models.Anomaly).filter_by(anomaly_id=case["anomaly_id"]).first():
                continue
            anomaly = models.Anomaly(
                anomaly_id=case["anomaly_id"], machine_id=case["machine_id"], metric=case["metric"],
                unit=case["unit"], current_value=case["current_value"], baseline_value=case["baseline_value"],
                anomaly_score=case["anomaly_score"], detected_at=case["detected_at"],
                severity=case["severity"], status=case["status"],
                estimated_cost_impact_per_day=case["estimated_cost_impact_per_day"],
            )
            db.add(anomaly)
            db.flush()

            root_cause = models.RootCause(anomaly_id=anomaly.anomaly_id, **case["rc"])
            db.add(root_cause)
            db.flush()

            rec_status = "implemented" if case["action"] else "open"
            rec = models.Recommendation(root_cause_id=root_cause.root_cause_id, status=rec_status, **case["rec"])
            db.add(rec)
            db.flush()

            if case["action"]:
                db.add(models.ActionLog(recommendation_id=rec.recommendation_id, **case["action"]))

        db.commit()
    finally:
        db.close()
