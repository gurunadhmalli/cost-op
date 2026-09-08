"""
ORM models — reconciled with 07_Database_ER_Architecture.md + the deltas
required by 15_Backend_Full_Specification.md (Section 2) to satisfy the
actual frontend contract: machine_name/status/target_cost_per_unit on
dim_machine; category/shap_value/description/recommended_fix on
root_causes; category/title on recommendations.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Numeric, DateTime, ForeignKey, BigInteger, Boolean, func
)
from sqlalchemy.orm import relationship

from app.db.database import Base


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


# ---------------------------------------------------------------------- Auth
class User(Base):
    __tablename__ = "users"
    user_id = Column(String(30), primary_key=True, default=lambda: _id("USR"))
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(128), nullable=False)
    password_salt = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------- Master Data
class Plant(Base):
    __tablename__ = "dim_plant"
    plant_id = Column(String(20), primary_key=True, default=lambda: _id("PLANT"))
    plant_name = Column(String(120), nullable=False)
    location = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    machines = relationship("Machine", back_populates="plant")


class Machine(Base):
    __tablename__ = "dim_machine"
    machine_id = Column(String(30), primary_key=True, default=lambda: _id("MCH"))
    plant_id = Column(String(20), ForeignKey("dim_plant.plant_id"), nullable=False)
    line = Column(String(50), nullable=False)
    line_name = Column(String(120))
    machine_name = Column(String(120))
    machine_type = Column(String(80))
    status = Column(String(20), default="optimal")  # optimal | warning | critical | maintenance
    target_cost_per_unit = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plant = relationship("Plant", back_populates="machines")


class Product(Base):
    __tablename__ = "dim_product"
    product_id = Column(String(20), primary_key=True, default=lambda: _id("PROD"))
    sku = Column(String(50), nullable=False, unique=True)
    unit_of_measure = Column(String(20), nullable=False, default="unit")


class Vendor(Base):
    __tablename__ = "dim_vendor"
    vendor_id = Column(String(20), primary_key=True, default=lambda: _id("VEND"))
    vendor_name = Column(String(150), nullable=False)


# ----------------------------------------------------------- Transactional Data
class WorkOrder(Base):
    __tablename__ = "fct_work_order"
    work_order_id = Column(String(30), primary_key=True, default=lambda: _id("WO"))
    plant_id = Column(String(20), ForeignKey("dim_plant.plant_id"), nullable=False)
    product_id = Column(String(20), ForeignKey("dim_product.product_id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))


class ProductionRecord(Base):
    __tablename__ = "fct_production"
    record_id = Column(String(30), primary_key=True, default=lambda: _id("PR"))
    work_order_id = Column(String(30), ForeignKey("fct_work_order.work_order_id"))
    machine_id = Column(String(30), ForeignKey("dim_machine.machine_id"), nullable=False)
    units_produced = Column(Numeric(14, 2), nullable=False)
    shift_start = Column(DateTime(timezone=True), nullable=False)


class MaintenanceEvent(Base):
    __tablename__ = "fct_maintenance_event"
    event_id = Column(String(30), primary_key=True, default=lambda: _id("MTN"))
    machine_id = Column(String(30), ForeignKey("dim_machine.machine_id"), nullable=False)
    event_type = Column(String(80), nullable=False)
    event_time = Column(DateTime(timezone=True), nullable=False)


class PurchaseOrder(Base):
    __tablename__ = "fct_purchase_order"
    po_id = Column(String(30), primary_key=True, default=lambda: _id("PO"))
    vendor_id = Column(String(20), ForeignKey("dim_vendor.vendor_id"), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)


# ---------------------------------------------------------------------- Cost Data
class CostRecord(Base):
    __tablename__ = "fct_cost"
    cost_id = Column(String(30), primary_key=True, default=lambda: _id("COST"))
    production_record_id = Column(String(30), ForeignKey("fct_production.record_id"), nullable=False)
    material_cost = Column(Numeric(14, 2), nullable=False, default=0)
    energy_cost = Column(Numeric(14, 2), nullable=False, default=0)
    labor_cost = Column(Numeric(14, 2), nullable=False, default=0)
    allocated_overhead = Column(Numeric(14, 2), nullable=False, default=0)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


# --------------------------------------------------------------- Time Series Data
class SensorReading(Base):
    __tablename__ = "fct_sensor_reading"
    reading_id = Column(BigInteger, primary_key=True, autoincrement=True)
    machine_id = Column(String(30), ForeignKey("dim_machine.machine_id"), nullable=False)
    metric = Column(String(50), nullable=False)
    value = Column(Numeric(14, 4), nullable=False)
    unit = Column(String(20), default="")
    timestamp = Column(DateTime(timezone=True), nullable=False)


# ------------------------------------------------------------- Calculated Metrics
class CalculatedMetric(Base):
    __tablename__ = "fct_calculated_metric"
    metric_id = Column(String(30), primary_key=True, default=lambda: _id("MET"))
    production_record_id = Column(String(30), ForeignKey("fct_production.record_id"))
    metric_name = Column(String(50), nullable=False)
    value = Column(Numeric(14, 4), nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


# ------------------------------------------------- Analytics / Action Trail (closed loop)
class Anomaly(Base):
    __tablename__ = "anomalies"
    anomaly_id = Column(String(30), primary_key=True, default=lambda: _id("AN"))
    machine_id = Column(String(30), ForeignKey("dim_machine.machine_id"), nullable=False)
    metric = Column(String(50), nullable=False)
    unit = Column(String(20), default="")
    current_value = Column(Numeric(14, 4), default=0)
    baseline_value = Column(Numeric(14, 4), default=0)
    anomaly_score = Column(Numeric(5, 4), nullable=False)
    detected_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    severity = Column(String(10), nullable=False, default="medium")
    status = Column(String(20), nullable=False, default="open")  # open | investigating | resolved
    estimated_cost_impact_per_day = Column(Numeric(14, 2), default=0)


class RootCause(Base):
    __tablename__ = "root_causes"
    root_cause_id = Column(String(30), primary_key=True, default=lambda: _id("RC"))
    anomaly_id = Column(String(30), ForeignKey("anomalies.anomaly_id"), nullable=False)
    driver = Column(String(200), nullable=False)
    category = Column(String(20), default="Operational")  # Maintenance|Environment|Operational|Material
    correlation_strength = Column(Numeric(5, 4), nullable=False, default=0)
    contribution_pct = Column(Numeric(5, 2), default=0)
    shap_value = Column(Numeric(6, 4), default=0)
    description = Column(String(500), default="")
    recommended_fix = Column(String(300), default="")
    confidence = Column(Numeric(5, 4), nullable=False)


class Recommendation(Base):
    __tablename__ = "recommendations"
    recommendation_id = Column(String(30), primary_key=True, default=lambda: _id("REC"))
    root_cause_id = Column(String(30), ForeignKey("root_causes.root_cause_id"), nullable=False)
    title = Column(String(200), default="")
    action = Column(String(200), nullable=False)
    category = Column(String(20), default="Process")  # Energy|Maintenance|Process|Material
    projected_savings = Column(Numeric(14, 2), nullable=False)
    implementation_cost = Column(Numeric(14, 2), default=0)
    payback_days = Column(Numeric(6, 1), default=0)
    confidence = Column(Numeric(5, 4), nullable=False)
    status = Column(String(20), nullable=False, default="open")  # open | implemented | verified
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ActionLog(Base):
    __tablename__ = "action_log"
    action_id = Column(String(30), primary_key=True, default=lambda: _id("ACT"))
    recommendation_id = Column(String(30), ForeignKey("recommendations.recommendation_id"), nullable=False)
    implemented_by = Column(String(100))
    notes = Column(String(500))
    implemented_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    tracking_status = Column(String(20), nullable=False, default="pending_verification")
    verified_savings = Column(Numeric(14, 2))
    verified_at = Column(DateTime(timezone=True))
    variance_pct = Column(Numeric(6, 2))
    recalibration_model_id = Column(String(50))
