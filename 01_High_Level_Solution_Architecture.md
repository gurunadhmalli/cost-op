# High-Level / Solution Architecture
## AI-Powered Industrial Cost Optimization Assistant — Working Prototype Reference

---

## 1. Executive Summary

Industrial and manufacturing operations are among the most data-rich, insight-poor environments in the enterprise. Plants generate continuous streams of ERP, production, quality, energy, and maintenance data — yet most of it sits unused across disconnected systems.

### 1.1 The Cost of Inefficiency
1. High and unpredictable energy consumption relative to output.
2. Excessive, often unplanned equipment downtime.
3. Material and yield waste from inconsistent process control.
4. Inefficient or undocumented operating processes.
5. Unplanned or reactive maintenance instead of predictive maintenance.

**Collectively, these inefficiencies cost industrial companies between 5% and 20% of annual revenue.**

### 1.2 Questions Companies Cannot Answer Today
"Where is our money being wasted?" · "Why did cost increase this month?" · "How much can we save, and where?" · "What action should we take?" · "Did our action actually reduce cost?"

### 1.3 Our Response
An AI-powered assistant that turns raw industrial data into actionable, cost-saving decisions with measurable impact — connecting existing data, explaining why cost changed, recommending the best next action, and confirming whether that action actually worked.

---

## 2. Existing Approaches — Point-by-Point Gap Analysis

| Category | Examples | Gap 1 | Gap 2 | Gap 3 |
|---|---|---|---|---|
| ERP / Finance Reporting | SAP, Oracle | Cost visible only after the fact, at plant/ledger level | No link to real-time production/sensor data | Static, backward-looking; no forecast or action |
| MES / SCADA / Historians | — | Operational, not cost-aware | No native cost allocation | Disconnected from ERP/IoT |
| BI Dashboards | Power BI, Tableau | Passive — needs a human to notice | No root-cause/what-if | No feedback loop to confirm savings |
| Point Solutions | Single-purpose energy/maintenance tools | Siloed by domain | Own integration/license each | — |
| Generic AI Chatbots | — | Describes data, no cost model | No optimization engine | — |
| Manual Analysis | Spreadsheets | Slow, surfaces weeks late | Not scalable | — |

**Repeating gap across every category: data stays siloed, analysis is passive, no closed loop that recommends → tracks → verifies.**

---

## 3. Six-Layer Solution Architecture (Conceptual)

```mermaid
flowchart TB
    subgraph L1["1 — Data Sources"]
        A1[ERP/Finance] --- A2[MES/Production] --- A3[IoT/Sensors] --- A4[Other: Maintenance, HR, Logs, External]
    end
    subgraph L2["2 — Data Platform"]
        B1[Ingestion] --> B2[Data Lake] --> B3[ETL] --> B4[Warehouse]
    end
    subgraph L3["3 — Industrial Data Model"]
        C1[Master] --- C2[Transactional] --- C3[Cost] --- C4[Time Series] --- C5[Calculated Metrics]
    end
    subgraph L4["4 — Analytics & AI"]
        D1[Cost Calc Engine] --- D2[Baseline/Benchmark] --- D3[ML Models] --- D4[Root Cause] --- D5[Optimization]
    end
    subgraph L5["5 — AI Agent & Application"]
        E1[LLM Agent] --- E2[Dashboard/Reports/Alerts/Chat/Mobile] --- E3[Recommendation Manager]
    end
    subgraph L6["6 — Action & Feedback Loop"]
        F1[Implement] --> F2[Monitor] --> F3[Measure] --> F4[Feedback]
    end
    L1-->L2-->L3-->L4-->L5-->L6
    F4-.retrain.->D2
    F4-.retrain.->D3
```

---

## 4. Working-Prototype Implementation Blueprint

This section turns the six conceptual layers into an actual buildable/runnable system — the repo layout, services, ports, and startup sequence a team would use to stand up the prototype described in the PDF.

### 4.1 Repository / Monorepo Layout

```
ai-cost-optimizer/
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.airflow.yml
│   ├── .env.example
│   └── k8s/                       # optional prod manifests
├── ingestion/
│   ├── mqtt_consumer/              # subscribes IoT/PLC topics → Kafka
│   ├── erp_connector/              # SAP/Oracle REST/OData pull, every 5–15 min
│   ├── mes_connector/              # MES API pull
│   └── sftp_watcher/                # legacy CSV drop watcher
├── data_platform/
│   ├── airflow/
│   │   └── dags/
│   │       ├── etl_clean_dag.py
│   │       ├── warehouse_load_dag.py
│   │       └── kpi_remeasure_dag.py
│   ├── dbt/
│   │   ├── models/staging/
│   │   ├── models/marts/           # master, transactional, cost, time_series, metrics
│   │   └── dbt_project.yml
│   └── great_expectations/
│       └── expectations/
├── analytics_ai/
│   ├── cost_engine/                 # activity-based costing
│   ├── baseline_engine/             # rolling baseline, seasonality
│   ├── ml_models/
│   │   ├── anomaly_isolation_forest.py
│   │   ├── forecast_prophet_xgboost.py
│   │   └── predictive_maintenance.py
│   ├── root_cause_engine/
│   ├── optimization_engine/         # PuLP/OR-Tools LP model
│   └── mlflow/                      # experiment tracking store
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint
│   │   ├── api/                     # routers: cost, anomalies, rootcause, whatif, recommendations, actions, chat
│   │   ├── agent/                   # Gemini API (free tier) function-calling agent
│   │   └── db/                      # SQLAlchemy models, PostgreSQL
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                   # Dashboard, Reports, Alerts, Chat, Mobile views
│   │   ├── components/
│   │   └── api/                     # REST + WebSocket clients
│   └── package.json
└── README.md
```

### 4.2 Prototype Service Map (docker-compose)

| Service | Image / Base | Container Port | Host Port | Role |
|---|---|---|---|---|
| `mosquitto` | eclipse-mosquitto | 1883 | 1883 | MQTT broker for IoT/PLC |
| `kafka` + `zookeeper` | bitnami/kafka | 9092 | 9092 | Streaming backbone |
| `minio` | minio/minio | 9000 | 9000 | S3-compatible data lake |
| `postgres` | postgres:16 | 5432 | 5432 | Warehouse (dev) + action-log DB |
| `airflow-webserver` / `airflow-scheduler` | apache/airflow:2.9 | 8080 | 8081 | ETL orchestration |
| `mlflow` | ghcr.io/mlflow/mlflow | 5000 | 5001 | Model tracking registry |
| `backend` | python:3.11-slim (FastAPI) | 8000 | 8000 | REST + WebSocket API |
| `frontend` | node:20 (React, Vite) | 5173 | 3000 | Dashboard/Chat UI |

### 4.3 Startup Sequence (Prototype Bring-Up)

1. `docker compose up -d mosquitto kafka zookeeper minio postgres` — bring up infra.
2. `docker compose up -d airflow-webserver airflow-scheduler` — orchestration layer; DAGs auto-load from `data_platform/airflow/dags/`.
3. Run `dbt run` inside `data_platform/dbt/` to materialize the star-schema warehouse tables in Postgres.
4. Start ingestion workers: `python ingestion/mqtt_consumer/main.py`, `python ingestion/erp_connector/main.py`, `python ingestion/mes_connector/main.py`.
5. `docker compose up -d mlflow` — analytics/ML experiment tracking.
6. `uvicorn backend.app.main:app --reload --port 8000` — start the FastAPI backend.
7. `npm run dev` inside `frontend/` — start the React dashboard on port 3000, proxying API calls to `localhost:8000`.
8. Verify: open `http://localhost:3000`, confirm `GET /api/cost/summary` returns data, confirm the chat assistant WebSocket connects.

### 4.4 Environment Variables (`.env.example`)

```
# Data sources
ERP_API_BASE_URL=https://erp.example.com/odata
ERP_API_KEY=changeme
MES_API_BASE_URL=https://mes.example.com/api
MQTT_BROKER_HOST=mosquitto
MQTT_BROKER_PORT=1883

# Data platform
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
S3_ENDPOINT=http://minio:9000
S3_BUCKET=ai-cost-datalake
WAREHOUSE_DB_URL=postgresql://postgres:postgres@postgres:5432/warehouse

# AI/ML
MLFLOW_TRACKING_URI=http://mlflow:5000
GEMINI_API_KEY=changeme   # free key from https://aistudio.google.com/

# Backend
JWT_SECRET=changeme
ACTION_LOG_DB_URL=postgresql://postgres:postgres@postgres:5432/action_log
```

---

## 5. How the Prototype Solves Each Existing-Tool Gap

| Existing Tool / Gap | Problem | Prototype Component That Solves It |
|---|---|---|
| ERP / Finance reports | Cost visible only after the fact | `analytics_ai/cost_engine` allocates cost to machine/line/shift, linked to `root_cause_engine` |
| MES / SCADA / Historians | No cost lens | `dbt/models/marts` joins transactional & time-series with cost data |
| BI dashboards | Passive | `ml_models/anomaly_isolation_forest.py` + `root_cause_engine` surface issues proactively |
| Point solutions | Siloed | One warehouse + `optimization_engine` compares actions across domains |
| Generic AI chatbots | No cost model | `backend/app/agent` (LLM tool-use) calls the purpose-built engines, not just chats |
| Manual spreadsheets | Doesn't scale | Airflow DAGs + ML run continuously across every plant/line/SKU |
| All of the above | No closed loop | `kpi_remeasure_dag.py` + action-log table implement Layer 6 |

---

## 6. Business Outcomes & Key Capabilities

| Cost Reduction | Efficiency Improvement | Downtime Reduction | Energy Cost Saving | ROI Timeframe |
|---|---|---|---|---|
| 5–20% | 10–30% | 20–40% | 8–15% | 3–6 months |

**Key Capabilities**: Cost Transparency · Anomaly Detection · Root Cause Analysis · What-if Analysis · AI Assistant · Action Tracking · Continuous Learning

**Value Delivered**: real-time visibility · data-driven decisions · quantified high-impact opportunities · reduced waste/downtime/energy/quality loss · continuous improvement via closed feedback loop.

---

## 7. End-to-End Flow Mapped to Prototype Modules

| Step | Flow Description | Prototype Module |
|---|---|---|
| 1 | Ingestion: MQTT real-time + ERP/MES every 5–15 min + legacy CSV via SFTP | `ingestion/*` |
| 2 | Landing: raw Parquet, partitioned by plant/date | `data_platform` → MinIO (S3) |
| 3 | ETL/Cleaning: dedupe, missing values, unit standardization, GE validation | `airflow/dags/etl_clean_dag.py` + `great_expectations/` |
| 4 | Warehouse Load: Master/Transactional/Cost/Time Series/Calculated Metrics | `dbt/models/marts/*` |
| 5 | Cost Calculation: ABC to machine/line/shift | `analytics_ai/cost_engine` |
| 6 | Baseline & Anomaly Detection | `analytics_ai/baseline_engine` + `ml_models/anomaly_isolation_forest.py` |
| 7 | Root Cause Analysis with confidence score | `analytics_ai/root_cause_engine` |
| 8 | Optimization: what-if, ranked by savings vs. effort | `analytics_ai/optimization_engine` |
| 9 | Recommendation & Delivery | `backend/app/api/recommendations.py` → Dashboard/Alert/Chat |
| 10 | Action & Feedback: re-measure, write back verified savings | `airflow/dags/kpi_remeasure_dag.py` → `backend/app/db` action-log |

---

## 8. Worked Example — Full Trace Through the Prototype

1. **03:40** — `mqtt_consumer` receives an energy reading for `machine_id=LINE3-EXT-01`; publishes to Kafka topic `iot.energy.readings`.
2. **Airflow (`etl_clean_dag`)** picks up the micro-batch, validates it via Great Expectations, writes it to the warehouse `time_series` fact table.
3. **`ml_models/anomaly_isolation_forest.py`** scores the new reading against the 90-day rolling baseline for that machine/metric → `anomaly_score = 0.81`, `is_anomaly = True`.
4. Anomaly record written to `anomalies` table; `backend/app/api/anomalies.py` exposes it via `GET /api/anomalies`.
5. **`root_cause_engine`** correlates the anomaly window against `maintenance_event` (skipped chiller filter change) and environmental data (+4°C) → confidence 87%.
6. **`cost_engine`** quantifies impact: ≈ ₹18,400/day, ≈ ₹5.5 lakh/quarter if unaddressed.
7. **`optimization_engine`** ranks 3 candidate actions; filter replacement wins.
8. **`backend/app/agent`** (LLM tool-use) composes the natural-language explanation and pushes it to the dashboard/alert/chat.
9. Maintenance team calls `POST /api/actions/{id}/implement`.
10. Seven days later, `kpi_remeasure_dag.py` re-measures the baseline, confirms resolution, writes verified savings back — `analytics_ai/baseline_engine` and the anomaly model recalibrate on next training run (tracked in MLflow).

---

## 9. Non-Functional / Operational View

| Concern | Prototype Approach |
|---|---|
| Environments | Separate `.env` + docker-compose overrides for dev/staging/prod |
| Scalability | Kafka partitions per plant; Airflow worker pool scales horizontally |
| Reliability | Great Expectations gates bad data; MLflow model registry allows rollback |
| Security | API keys/secrets in `.env` (dev) / secret manager (prod); JWT-authenticated FastAPI endpoints |
| Observability | Airflow UI (DAG runs), MLflow UI (model metrics), FastAPI `/health` endpoint |
| Extensibility | New source → new connector under `ingestion/` + new dbt staging model, no change to downstream engines |

---

## 10. Glossary

| Term | Meaning |
|---|---|
| OEE | Overall Equipment Effectiveness |
| ABC | Activity-Based Costing |
| Baseline | Expected metric value under normal conditions, seasonality-adjusted |
| Anomaly Score | Model-generated unusualness score |
| Confidence Score | 0–100% score from correlation strength, historical accuracy, data completeness |
| Closed Feedback Loop | recommend → implement → monitor → verify → retrain |
