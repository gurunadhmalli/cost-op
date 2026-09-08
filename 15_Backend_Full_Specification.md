# Backend — Full Reconciled Specification
## AI-Powered Industrial Cost Optimization Assistant

---

## 0. What This Document Is

This is the **definitive backend spec**, reconciled across every source we have:

1. The original PDF (`Combined_AI_Industrial_Cost_Optimization_Assistant.pdf`) and infographic image — the six-layer architecture, the ABC costing formula, the Isolation Forest anomaly model, root-cause correlation logic, the optimization LP, confidence scoring, and the worked example (Line 3 Extrusion chiller filter).
2. Our own architecture docs `01`–`08`, in particular `05_Backend_Architecture.md` and `08_API_Integration_Architecture.md`.
3. **The actual frontend code**, built separately in Antigravity and reviewed against our docs (`frontend/src/services/api.ts`, `frontend/src/types/index.ts`, and every page/component that calls the API). This is the most important source for this document, because it is the *real, already-written* client the backend must satisfy — it defines the true field-level contract, including two endpoints and many response fields that `08_API_Integration_Architecture.md` didn't originally specify.

Where the frontend code and the earlier docs disagreed, **the frontend code wins** — it's already built and won't be rewritten; the backend is what's being built to match it now. Every such reconciliation is logged in Section 8.

Stack stays 100% free, per prior decision: **Python + FastAPI + PostgreSQL + Google Gemini API (free tier) for the AI Assistant**, no paid services anywhere.

---

## 1. Reconciled API Contract

Every endpoint below is written to exactly match what `frontend/src/services/api.ts` sends and expects back — field names, optionality, and all. Fields the UI defaults with `?? 0` / `?? ''` / `?? []` when absent are marked **optional**; everything else is **required**.

### 1.1 `GET /api/plants`

New endpoint — not in the original `08` doc, but called by `api.getPlants()`.

**Response 200:**
```json
[
  {
    "id": "PLANT-01",
    "name": "Chennai Extrusion Plant",
    "location": "Chennai, TN",
    "lines": [
      {
        "id": "LINE-03",
        "name": "Line 3 — Extrusion",
        "plantId": "PLANT-01",
        "targetCostPerUnit": 39.10,
        "machines": [
          {
            "id": "LINE3-EXT-01",
            "name": "Extruder 3A",
            "lineId": "LINE-03",
            "plantId": "PLANT-01",
            "machineType": "Extruder",
            "status": "warning",
            "currentTelemetry": {
              "energyKwh": 485.8,
              "temperatureC": 78.4,
              "vibrationMmS": 2.1,
              "pressureBar": 14.2,
              "oeePct": 81.5
            }
          }
        ]
      }
    ]
  }
]
```
Note the response is already camelCase here — `getPlants()` is the one call in `api.ts` with no snake_case mapping step, so the backend should return this shape directly (unlike every other endpoint below, which is snake_case on the wire).

### 1.2 `GET /api/cost/summary`

**Query params**: `plant_id`, `line_id`, `from`, `to` (ISO dates — the frontend derives these from a `7d/30d/90d/ytd` UI selector via `rangeToDates()`).

**Response 200 (snake_case):**
```json
{
  "plant_id": "PLANT-01",
  "line_id": "LINE-03",
  "cost_per_unit": 42.85,
  "baseline_cost_per_unit": 39.10,
  "variance_pct": 9.6,
  "total_monthly_cost": 1284000,
  "projected_monthly_cost": 1310000,
  "total_units_produced": 29980,
  "breakdown": {
    "material_cost": 18.20,
    "energy_cost": 12.05,
    "labor_cost": 8.10,
    "allocated_overhead": 4.50
  },
  "trend": [
    { "timestamp": "2026-08-01T00:00:00+05:30", "actual_cost": 41.2, "baseline_cost": 39.1, "units": 980, "variance": 5.4 }
  ]
}
```
`total_monthly_cost`, `projected_monthly_cost`, `total_units_produced`, and `trend` are **optional** (default to `0`/`[]`) but should be populated for the Dashboard's cost trend chart to render real data instead of empty state.

### 1.3 `GET /api/anomalies`

**Query params**: `plant_id` (optional), `severity` (optional, `high`/`medium`/`low`), `status` (optional, `open`/`investigating`/`resolved`).

**Response 200 (array, snake_case):**
```json
[
  {
    "anomaly_id": "AN-20260830-0134",
    "asset_id": "LINE3-EXT-01",
    "asset_name": "Extruder 3A",
    "plant_id": "PLANT-01",
    "line_id": "LINE-03",
    "metric": "energy_kwh",
    "unit": "kWh",
    "current_value": 485.8,
    "baseline_value": 398.2,
    "anomaly_score": 0.81,
    "detected_at": "2026-08-30T03:40:00+05:30",
    "severity": "high",
    "status": "open",
    "estimated_cost_impact_per_day": 18400,
    "telemetry_history": [
      { "timestamp": "2026-08-30T00:00:00+05:30", "value": 401.0, "upper_bound": 420.0, "lower_bound": 380.0, "baseline": 398.2, "is_anomaly": false },
      { "timestamp": "2026-08-30T03:40:00+05:30", "value": 485.8, "upper_bound": 420.0, "lower_bound": 380.0, "baseline": 398.2, "is_anomaly": true }
    ]
  }
]
```
`asset_name`, `plant_id`, `line_id`, `unit`, `current_value`, `baseline_value`, `estimated_cost_impact_per_day`, and `telemetry_history` are **optional** per the frontend's defaults, but the Anomalies page's table and telemetry chart are materially better with them populated — treat these as required in practice.

### 1.4 `GET /api/rootcause/{anomaly_id}`

**Response 200 (snake_case):**
```json
{
  "anomaly_id": "AN-20260830-0134",
  "asset_id": "LINE3-EXT-01",
  "asset_name": "Extruder 3A",
  "metric": "energy_kwh",
  "detected_at": "2026-08-30T03:40:00+05:30",
  "confidence": 0.87,
  "historical_accuracy": 0.72,
  "data_completeness": 0.95,
  "drill_down_path": ["PLANT-01", "LINE-03", "LINE3-EXT-01", "Chiller filter clogging"],
  "ranked_drivers": [
    {
      "driver": "Chiller filter change skipped (2 cycles)",
      "category": "Maintenance",
      "correlation_strength": 0.79,
      "contribution_pct": 61,
      "shap_value": 0.34,
      "description": "The Extruder 3A chiller's secondary filter is 2 PM cycles overdue, causing thermal choking under normal load.",
      "recommended_fix": "Replace the chiller secondary filter cartridge immediately."
    },
    {
      "driver": "Ambient temperature +4C vs. average",
      "category": "Environment",
      "correlation_strength": 0.42,
      "contribution_pct": 24,
      "shap_value": 0.12,
      "description": "Elevated ambient temperature increases chiller load independent of the filter issue.",
      "recommended_fix": "No action — seasonal, monitor only."
    }
  ],
  "llm_summary": "Line 3 is running 22% over its energy baseline due to a skipped chiller filter change — replacing it now should save about ₹5.5 lakh this quarter."
}
```
Note: `correlation_strength` at the top level (used by the frontend as a fallback) is derived client-side from `ranked_drivers[0].correlation_strength` — the backend does not need to send it separately. `category` must be one of `Maintenance | Environment | Operational | Material` (frontend enum) — the root-cause engine should classify each candidate driver into one of these four.

### 1.5 `POST /api/whatif`

**Request body (snake_case):**
```json
{
  "asset_id": "LINE3-EXT-01",
  "candidate_actions": [
    { "action": "filter_replacement", "cost": 1200, "downtime_hours": 0 },
    { "action": "setpoint_reduction", "cost": 0, "downtime_hours": 0 },
    { "action": "reschedule_cooler_shift", "cost": 300, "downtime_hours": 4 }
  ]
}
```

**Response 200 (snake_case):**
```json
{
  "ranked_scenarios": [
    {
      "id": "filter_replacement-0",
      "action": "filter_replacement",
      "description": "Replace the chiller secondary filter cartridge.",
      "cost": 1200,
      "downtime_hours": 0,
      "risk_level": "Low",
      "projected_savings_quarter": 550000,
      "payback_days": 2,
      "energy_reduction_pct": 22,
      "throughput_impact_pct": 0,
      "feasible": true,
      "constraint_violations": [],
      "rank": 1
    }
  ]
}
```
`id`, `description`, `risk_level`, `energy_reduction_pct`, `throughput_impact_pct`, and `constraint_violations` are **optional** (frontend defaults them), but populate all of them — the What-If page's optimization matrix displays every one of these fields.

### 1.6 `GET /api/recommendations`

**Query params**: `status` (optional — `open`/`implemented`/`verified`).

**Response 200 (array, snake_case):**
```json
[
  {
    "recommendation_id": "REC-0087",
    "asset_id": "LINE3-EXT-01",
    "asset_name": "Extruder 3A",
    "title": "Replace Chiller Secondary Filter Cartridge",
    "action": "filter_replacement",
    "category": "Maintenance",
    "projected_savings": 550000,
    "implementation_cost": 1200,
    "payback_days": 2,
    "confidence": 0.87,
    "created_at": "2026-08-30T04:00:00+05:30",
    "status": "open",
    "evidence": {
      "anomaly_id": "AN-20260830-0134",
      "driver": "Chiller filter change skipped (2 cycles)",
      "correlation_strength": 0.79,
      "shap_contribution": 0.34,
      "historical_case_id": null
    }
  }
]
```
`category` must be one of `Energy | Maintenance | Process | Material`.

### 1.7 `POST /api/actions/{recommendation_id}/implement`

**Request body:**
```json
{ "implemented_by": "maintenance_team_A", "notes": "Chiller filter replaced" }
```

**Response 200 (snake_case):**
```json
{
  "action_id": "ACT-0451",
  "recommendation_id": "REC-0087",
  "recommendation_title": "Replace Chiller Secondary Filter Cartridge",
  "asset_id": "LINE3-EXT-01",
  "implemented_at": "2026-08-30T09:15:00+05:30",
  "tracking_status": "pending_verification",
  "verification_due": "2026-09-06T09:15:00+05:30",
  "projected_savings": 550000
}
```
On success, the backend should also flip the source `recommendations` row's `status` to `implemented`.

### 1.8 `GET /api/actions`

New endpoint — not in the original `08` doc, called by `api.getActionLogs()` to populate the Action Tracker page (list view, not single-item lookup).

**Response 200 (array):**
```json
[
  {
    "actionId": "ACT-0451",
    "recommendationId": "REC-0087",
    "recommendationTitle": "Replace Chiller Secondary Filter Cartridge",
    "assetId": "LINE3-EXT-01",
    "implementedBy": "maintenance_team_A",
    "implementedAt": "2026-08-30T09:15:00+05:30",
    "notes": "Chiller filter replaced",
    "trackingStatus": "pending_verification",
    "verificationDue": "2026-09-06T09:15:00+05:30",
    "projectedSavings": 550000,
    "verifiedSavings": null,
    "verifiedAt": null,
    "variancePct": null,
    "recalibrationModelId": null
  }
]
```
Note this is the **one list endpoint the frontend expects already in camelCase** (unlike 1.2–1.7, `getActionLogs()` does no field mapping — it returns the raw JSON as-is). The backend should return camelCase here specifically, to match what's already shipped in the frontend rather than requiring a frontend change.

### 1.9 `WS /ws/chat`

Reconciled against `ChatDrawer.tsx`'s actual UI, which displays a live "Executing Engine Tool: `get_anomalies(line_id="LINE-03")`" indicator, then a final agent message with an evidence card. The wire protocol:

**Client → Server:**
```json
{ "type": "user_message", "text": "Why did Line 3 cost increase today?" }
```

**Server → Client (streamed, in order):**
```json
{ "type": "tool_call", "tool": "get_anomalies", "args": { "line_id": "LINE-03" } }
{ "type": "tool_call", "tool": "get_root_cause", "args": { "anomaly_id": "AN-20260830-0134" } }
{ "type": "agent_text", "text": "Line 3 energy draw is currently 22% over baseline due to overdue maintenance on Extruder 3A chiller secondary filter (2 skipped PM cycles). Replacing this filter cartridge immediately will eliminate thermal choking and save an estimated ₹5.50 Lakh this quarter." }
{ "type": "evidence_card", "data": {
    "type": "root_cause",
    "title": "Chiller Secondary Filter Cartridge Replacement",
    "confidence": 0.87,
    "projectedSavings": 550000,
    "driver": "Skipped PM cycle (overdue by 14 days)",
    "recommendationId": "REC-0087"
} }
```
This maps directly onto the frontend's `ChatMessage.toolCalls[]` and `ChatMessage.evidenceCard` shape in `types/index.ts` — the frontend was clearly built anticipating exactly this protocol, so no frontend change is needed here, only a backend that speaks it. Model: **`gemini-2.5-flash`** via `google-generativeai`, free tier — see Section 4.

---

## 2. Database Schema (delta over `07_Database_ER_Architecture.md`)

The core schema in `07_Database_ER_Architecture.md` (dim_plant, dim_machine, dim_product, dim_vendor, fct_work_order, fct_production, fct_maintenance_event, fct_cost, fct_sensor_reading, fct_calculated_metric, anomalies, root_causes, recommendations, action_log) still stands. Two small additions are needed purely to serve the richer API responses above:

| Table | New/changed column | Why |
|---|---|---|
| `dim_machine` | `machine_name VARCHAR(120)`, `status VARCHAR(20)` | `GET /api/plants` needs a human-readable name and live status per machine, not just the ID. |
| `dim_machine` | `target_cost_per_unit NUMERIC(14,2)` (on `dim_machine` or a new `dim_line` if lines become first-class) | Used for `Line.targetCostPerUnit` in `GET /api/plants`. |
| `root_causes` | `category VARCHAR(20)` | Must be one of `Maintenance/Environment/Operational/Material` to match `SHAPDriver.category`. |
| `root_causes` | `shap_value NUMERIC(6,4)`, `description VARCHAR(500)`, `recommended_fix VARCHAR(300)` | Required by `GET /api/rootcause/{id}` response shape (Section 1.4). |
| `recommendations` | `category VARCHAR(20)` | Must be one of `Energy/Maintenance/Process/Material`. |
| `recommendations` | `title VARCHAR(200)` | Distinct from `action` (a short code) — the UI shows `title` as the human-readable headline. |

Everything else (keys, indexes, the star-schema shape) is unchanged from `07_Database_ER_Architecture.md`.

---

## 3. Engine-by-Engine Mapping to the API

| Engine (per `04_AI_ML_Architecture.md`) | Feeds |
|---|---|
| `cost_engine` (Activity-Based Costing) | `GET /api/cost/summary` |
| `baseline_engine` (rolling baseline) | `telemetry_history[].baseline/upper_bound/lower_bound` in `GET /api/anomalies` |
| `ml_models` (Isolation Forest) | `anomaly_score`, `is_anomaly` gating in `GET /api/anomalies` |
| `root_cause_engine` (correlation + confidence scoring) | `GET /api/rootcause/{id}` — including the new `category`/`shap_value`/`description`/`recommended_fix` fields |
| `optimization_engine` (PuLP LP) | `POST /api/whatif` |
| Recommendation Manager (Section 3.6 of `02_Feature_Functional_Architecture.md`) | `GET /api/recommendations`, `POST /api/actions/{id}/implement`, `GET /api/actions` |
| Gemini Agent (`backend/app/agent/agent.py`) | `WS /ws/chat`, calling the above as function-calling tools |

The confidence-score formula stays exactly as documented: `confidence = 0.5*correlation_strength + 0.3*historical_accuracy + 0.2*data_completeness` (Section 6 of `04_AI_ML_Architecture.md`), and now maps directly onto `RootCauseAnalysis.confidence/correlationStrength/historicalAccuracy/dataCompleteness` in the frontend's own type.

---

## 4. AI Assistant — Gemini Free Tier (unchanged decision, restated for completeness)

- Model: `gemini-2.5-flash` (or `gemini-2.0-flash`), free tier, via `google-generativeai` Python SDK.
- Key: `GEMINI_API_KEY`, free from [Google AI Studio](https://aistudio.google.com/), no card required.
- Function declarations expose the same five read/compute operations as tools: `get_cost_summary`, `get_anomalies`, `get_root_cause`, `run_whatif`, `get_recommendations` — see `08_API_Integration_Architecture.md` Section 6 for the full function-calling code.
- The `ChatDrawer.tsx` UI already displays tool names in exactly this form (`get_anomalies(line_id="LINE-03")`), confirming the frontend was built against this exact tool-naming convention — keep the function names identical when implementing.

---

## 5. Backend Repository Layout (unchanged from `05_Backend_Architecture.md`, plus two new routers)

```
backend/app/api/
├── plants.py            # NEW — GET /api/plants
├── cost.py              # GET /api/cost/summary
├── anomalies.py         # GET /api/anomalies
├── rootcause.py         # GET /api/rootcause/{id}
├── whatif.py            # POST /api/whatif
├── recommendations.py   # GET /api/recommendations
├── actions.py           # POST /api/actions/{id}/implement, GET /api/actions (NEW list route)
└── chat.py              # WS /ws/chat
```
Everything else (engines/, agent/, db/, core/) is unchanged from `05_Backend_Architecture.md`.

---

## 6. CORS & Local Dev

The frontend calls relative paths (`fetch('/api/cost/summary?...')`), meaning it expects either (a) the Vite dev server to proxy `/api` and `/ws` to the FastAPI backend, or (b) both served from the same origin in production. Add to `frontend/vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:8000',
    '/ws': { target: 'ws://localhost:8000', ws: true },
  },
},
```

This means **the frontend needs no `VITE_API_URL` env var or CORS headers at all in dev** — simpler than the original `05` doc assumed. If deployed separately in production, restore `CORS_ORIGINS` handling as documented in `05_Backend_Architecture.md` Section 7.

---

## 7. Switching Off Mock Mode

Everything above is already wired for in `frontend/src/services/api.ts` behind a single flag:

```ts
const USE_MOCK = true; // Fallback to high-fidelity mock if backend is not yet started
```

Once the backend implements the endpoints in Section 1, the only frontend change needed is flipping this to `false` — every request/response mapping (snake_case ↔ camelCase, field defaults) is already written and tested by the earlier code review.

---

## 8. Reconciliation Log — Where This Doc Overrides Earlier Docs

| Discrepancy | Earlier doc said | Frontend code actually does | Resolution |
|---|---|---|---|
| Date range param | `08` doc didn't specify format precisely | `from`/`to` ISO date strings | Kept `from`/`to` (Section 1.2) — matches frontend exactly |
| Action log listing | Not documented at all in `08` | `GET /api/actions` (list, camelCase) | Added as a first-class endpoint (Section 1.8) |
| Plants/lines/machines listing | Not documented at all in `08` | `GET /api/plants` (camelCase, nested lines/machines) | Added as a first-class endpoint (Section 1.1) |
| Root-cause driver fields | `08` only had `driver`/`correlation_strength`/`contribution_pct` | Frontend also needs `category`, `shap_value`, `description`, `recommended_fix` | Extended schema in Sections 1.4 and 2 |
| Recommendation fields | `08` only had `action`/`projected_savings`/`confidence`/`evidence.anomaly_id` | Frontend also needs `title`, `category`, `implementation_cost`, `payback_days`, richer `evidence` | Extended schema in Sections 1.6 and 2 |
| AI model | Originally "Anthropic API (Claude)" in all docs and in Antigravity's own docs 13/14's early drafts | Frontend UI literally displays the badge "Gemini 2.5 Flash" | Confirmed consistent — Gemini free tier, no change needed here, just restated |
| Continuous/live data | `01`/`03` describe Layer 1 as continuous IoT/PLC telemetry; the prototype only had a one-time `seed.py` snapshot | Dashboard/Anomalies pages displayed "STREAMING"/"TELEMETRY"/"Real-Time" badges against data that was actually fetched once on page load | Added `backend/app/simulator/live_feed.py`, scheduled every `SIMULATOR_INTERVAL_SECONDS` from `main.py`'s APScheduler job, plus a new `WS /ws/live` push channel (Section 1.10) the frontend subscribes to (`src/hooks/useLiveFeed.ts`) to refetch on each tick |
| AI Assistant wiring | `ChatDrawer.tsx` and `CoPilotPage.tsx` displayed the "Gemini 2.5 Flash" badge and tool-call indicator, but both were still calling `setTimeout` with a hardcoded canned response — never actually opened a WebSocket | Backend's `/ws/chat` was fully built and tested (Section 1.9) but nothing on the frontend called it | Both chat surfaces now share `src/hooks/useChatSocket.ts`, which opens a real `/ws/chat` connection and speaks the documented protocol; verified end-to-end in a real browser against the running backend |
| Gemini placeholder key | `.env.example`'s `GEMINI_API_KEY=changeme` was assumed to "fall back gracefully" per Section 4 | `agent.py` checked `if settings.GEMINI_API_KEY:`, which is `True` for the literal string `"changeme"` — the app tried a real network call with an invalid key and blocked the event loop waiting on it | Fixed the check to treat `"changeme"` (and empty string) as "not configured"; also moved the SDK's blocking `chat.send_message()` calls onto a worker thread (`asyncio.to_thread`) so a slow/failed Gemini call can never stall `/ws/live` or any other request |
| Containerization | `01`/`05`/`06`/`07` describe Docker/docker-compose service maps | No `Dockerfile` or `docker-compose.yml` had actually been written | Added `backend/Dockerfile`, `frontend/Dockerfile` + `nginx.conf`, and a project-root `docker-compose.yml` (Postgres + backend + frontend, `docker compose up --build`) as an alternative to the venv-based setup — see `backend/README.md` Section 8 |

Everything not listed above is unchanged from `01`–`08`; this document adds detail and fixes real gaps, it doesn't contradict the earlier architecture.

---

## 9. Addendum — Live Data Push and Verified Chat Wiring

This section documents the fixes in the table above in more detail, since they close out what was previously an acknowledged gap (a self-assessed "92% complete" prototype) rather than being part of the original reconciliation pass.

### 1.10 `WS /ws/live`

Pure server push — the client sends nothing after connecting. Emitted once per simulator tick (default every 30s, `SIMULATOR_INTERVAL_SECONDS`):

```json
{
  "type": "tick",
  "timestamp": "2026-08-30T12:46:03.79Z",
  "new_readings": 4,
  "new_anomalies": [
    { "anomaly_id": "AN-...", "machine_id": "LINE3-EXT-01", "metric": "energy_kwh", "severity": "medium", "recommendation_title": "Replace the chiller secondary filter cartridge immediately." }
  ]
}
```

`src/hooks/useLiveFeed.ts` subscribes and re-runs the relevant `api.ts` calls whenever a tick arrives (and reconnects automatically if the backend restarts); `DashboardPage.tsx` and `AnomaliesPage.tsx` use it so their "STREAMING"/"Real-Time" labeling is now backed by data that actually changes on its own.

### Verification performed

- `app/simulator/live_feed.py`'s `tick()` run 40+ times directly against the seeded database: appends readings, correctly skips creating a duplicate anomaly while one is already open, and produces a `RootCause` + `Recommendation` row through the same `rootcause_engine.analyze()` the REST endpoint uses.
- Full server started with a 3s simulator interval; a real WebSocket client confirmed `/ws/live` pushes ticks automatically with no client action.
- `/ws/chat`'s no-key fallback confirmed to respond immediately (previously it hung, see the placeholder-key row above).
- Frontend type-checked (`tsc --noEmit`, zero errors) and production-built (`vite build`, succeeds) after every change.
- A real headless-browser session (Playwright + Chromium) loaded the dashboard and `/copilot` page against the live backend, sent an actual chat message through the UI, and confirmed the rendered response, evidence card, and confidence badge all came from the backend's live computation — not a hardcoded string.
- `docker-compose.yml` validated with `docker compose config` (schema/interpolation correctness); the Dockerfiles and `nginx.conf` follow standard, widely-used patterns but could not be built end-to-end in the environment this work was done in, since that sandbox's network policy blocks Docker Hub image pulls entirely. Worth a first `docker compose up --build` check on a normal machine.
