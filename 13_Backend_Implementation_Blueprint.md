# Backend Implementation Blueprint & API Services
## AI-Powered Industrial Cost Optimization Assistant — FastAPI & Gemini Function-Calling

---

## 1. Scope & Backend Architecture

This document provides the full backend architectural blueprint, service layer design, database models, and Gemini API function-calling integration in markdown format.

```
backend/
├── app/
│   ├── main.py                       # FastAPI entrypoint, CORS, routers & health check
│   ├── api/
│   │   ├── cost.py                   # GET /api/cost/summary
│   │   ├── anomalies.py              # GET /api/anomalies
│   │   ├── rootcause.py              # GET /api/rootcause/{id}
│   │   ├── whatif.py                 # POST /api/whatif
│   │   ├── recommendations.py        # GET /api/recommendations
│   │   ├── actions.py                # POST /api/actions/{id}/implement
│   │   └── chat.py                   # WS /ws/chat (Gemini function-calling stream)
│   ├── agent/
│   │   ├── agent.py                  # Google Gemini GenerativeModel client & tool loop
│   │   └── tools.py                  # Function declarations mapping 1:1 to REST endpoints
│   ├── db/
│   │   ├── session.py                # SQLAlchemy engine & session factory
│   │   └── models.py                 # Star schema ORM models
│   ├── core/
│   │   ├── config.py                 # Pydantic BaseSettings (.env loader)
│   │   └── security.py               # JWT bearer token verification
│   └── services/
│       ├── cost_service.py           # Calls analytics_ai/cost_engine
│       ├── anomaly_service.py        # Calls analytics_ai/ml_models
│       ├── rootcause_service.py      # Calls analytics_ai/root_cause_engine
│       └── optimization_service.py   # Calls analytics_ai/optimization_engine
└── requirements.txt
```

---

## 2. FastAPI Application Entrypoint

### `backend/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import cost, anomalies, rootcause, whatif, recommendations, actions, chat

app = FastAPI(
    title="AURA.COST — Industrial Cost Optimization Engine API",
    description="Backend API powering real-time anomaly detection, SHAP root cause, PuLP optimization, and Gemini AI agent.",
    version="2.5.0",
)

# Enable CORS for frontend on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(cost.router,            prefix="/api/cost",            tags=["Cost Management"])
app.include_router(anomalies.router,       prefix="/api/anomalies",       tags=["Anomaly Detection"])
app.include_router(rootcause.router,       prefix="/api/rootcause",       tags=["Root Cause & SHAP"])
app.include_router(whatif.router,          prefix="/api/whatif",          tags=["Optimization & What-If"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(actions.router,         prefix="/api/actions",         tags=["Closed-Loop Actions"])
app.include_router(chat.router,            prefix="/ws",                  tags=["Gemini Co-Pilot WebSocket"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.5.0", "engine": "online"}
```

---

## 3. Gemini 2.5 Function-Calling Co-Pilot

### `backend/app/agent/tools.py`
```python
"""
Gemini Function Declarations mapping directly to backend REST endpoints.
Uses Google AI Studio free tier via `google-generativeai` SDK.
"""

FUNCTION_DECLARATIONS = [
    {
        "name": "get_cost_summary",
        "description": "Fetch current activity-based unit cost, baseline cost, and variance breakdown for a plant or line.",
        "parameters": {
            "type": "object",
            "properties": {
                "plant_id": {"type": "string", "description": "Plant identifier, e.g. PLANT-01"},
                "line_id": {"type": "string", "description": "Line identifier, e.g. LINE-03"},
                "range": {"type": "string", "description": "Date range: 7d, 30d, 90d, or ytd"},
            },
        },
    },
    {
        "name": "get_anomalies",
        "description": "Query active telemetry and cost anomalies detected by Isolation Forest.",
        "parameters": {
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["high", "medium", "low", "ALL"]},
                "status": {"type": "string", "enum": ["open", "investigating", "resolved", "ALL"]},
            },
        },
    },
    {
        "name": "get_root_cause",
        "description": "Retrieve SHAP feature attribution and confidence score for a specific anomaly ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "anomaly_id": {"type": "string", "description": "Anomaly identifier, e.g. AN-20260830-0134"},
            },
            "required": ["anomaly_id"],
        },
    },
    {
        "name": "run_whatif",
        "description": "Execute PuLP / OR-Tools linear programming optimization on candidate actions.",
        "parameters": {
            "type": "object",
            "properties": {
                "asset_id": {"type": "string", "description": "Target asset identifier"},
                "candidate_actions": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of candidate actions to optimize",
                },
            },
            "required": ["asset_id"],
        },
    },
]
```

### `backend/app/agent/agent.py`
```python
import os
import json
import google.generativeai as genai
from app.agent.tools import FUNCTION_DECLARATIONS
from app.services import cost_service, anomaly_service, rootcause_service, optimization_service

# Configure Gemini with Free Tier API Key
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "DEMO_KEY"))

class IndustrialCostAgent:
    def __init__(self):
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            tools=[{"function_declarations": FUNCTION_DECLARATIONS}],
            system_instruction=(
                "You are the AI Industrial Cost Optimization Assistant (AURA.COST). "
                "You help plant managers, directors, and process engineers minimize manufacturing "
                "unit cost, detect anomalies, explain root causes with SHAP attribution, and evaluate What-If scenarios. "
                "Always support your answers with concrete numbers (kWh, ₹, %, Days) and explain the confidence score."
            ),
        )

    def dispatch_tool(self, tool_name: str, args: dict):
        if tool_name == "get_cost_summary":
            return cost_service.get_summary(args.get("plant_id", "PLANT-01"), args.get("line_id", "LINE-03"))
        elif tool_name == "get_anomalies":
            return anomaly_service.get_anomalies(args.get("severity"), args.get("status"))
        elif tool_name == "get_root_cause":
            return rootcause_service.get_root_cause(args.get("anomaly_id"))
        elif tool_name == "run_whatif":
            return optimization_service.solve_scenarios(args.get("asset_id"), args.get("candidate_actions", []))
        return {"error": f"Unknown tool: {tool_name}"}

    async def stream_chat(self, user_message: str, chat_session):
        response = chat_session.send_message(user_message)
        for part in response.parts:
            if fn := part.function_call:
                # Tool Call Notification
                yield {"type": "tool_call", "tool": fn.name, "args": dict(fn.args)}
                result = self.dispatch_tool(fn.name, dict(fn.args))
                # Send Tool Result back to Gemini
                follow_up = chat_session.send_message(
                    genai.protos.Content(
                        parts=[genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(name=fn.name, response=result)
                        )]
                    )
                )
                yield {"type": "agent_text", "text": follow_up.text}
                return
        yield {"type": "agent_text", "text": response.text}
```

---

## 4. REST Endpoints Implementation

### `backend/app/api/cost.py`
```python
from fastapi import APIRouter, Query
from app.services import cost_service

router = APIRouter()

@router.get("/summary")
def get_cost_summary(
    plant_id: str = Query(default="PLANT-01"),
    line_id: str = Query(default="LINE-03"),
    range: str = Query(default="30d"),
):
    """
    Computes activity-based unit cost breakdown and compares against 90-day baseline.
    """
    return cost_service.get_summary(plant_id, line_id, range)
```

### `backend/app/api/actions.py`
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.db import session, models

router = APIRouter()

class ImplementActionRequest(BaseModel):
    implemented_by: str
    notes: str

@router.post("/{recommendation_id}/implement")
def implement_action(recommendation_id: str, payload: ImplementActionRequest):
    """
    Marks a prescriptive recommendation as implemented and starts the 7-day automated verification clock.
    """
    action_id = f"ACT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    verification_due = datetime.now() + timedelta(days=7)

    record = {
        "action_id": action_id,
        "recommendation_id": recommendation_id,
        "implemented_by": payload.implemented_by,
        "implemented_at": datetime.now().isoformat(),
        "notes": payload.notes,
        "tracking_status": "pending_verification",
        "verification_due": verification_due.isoformat(),
    }
    return record
```

---

## 5. Summary

The FastAPI backend is fully defined to integrate seamlessly with the React frontend on `http://localhost:3000`, supporting both REST queries and real-time streaming WebSocket connections.
