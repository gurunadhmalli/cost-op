"""
Gemini function-calling tool declarations + dispatcher.

Reuses the exact same route-handler functions the REST API calls, so the
chat assistant's answers are always backed by identical logic/data to the
dashboard (per 08_API_Integration_Architecture.md Section 6 and
15_Backend_Full_Specification.md Section 4). Function *names* match what
frontend/src/components/copilot/ChatDrawer.tsx already displays
(e.g. "get_anomalies(line_id=...)"), so keep them unchanged.
"""
from sqlalchemy.orm import Session

from app.api import cost as cost_api
from app.api import anomalies as anomalies_api
from app.api import rootcause as rootcause_api
from app.api import whatif as whatif_api
from app.api import recommendations as recommendations_api
from app.schemas import WhatIfRequest

FUNCTION_DECLARATIONS = [
    {
        "name": "get_cost_summary",
        "description": "Get current cost-per-unit and variance vs. baseline for a plant/line.",
        "parameters": {
            "type": "object",
            "properties": {
                "plant_id": {"type": "string"},
                "line_id": {"type": "string"},
            },
        },
    },
    {
        "name": "get_anomalies",
        "description": "List active anomalies, optionally filtered by plant, severity, or status.",
        "parameters": {
            "type": "object",
            "properties": {
                "plant_id": {"type": "string"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]},
                "status": {"type": "string", "enum": ["open", "investigating", "resolved"]},
            },
        },
    },
    {
        "name": "get_root_cause",
        "description": "Get ranked root-cause drivers and a confidence score for a specific anomaly.",
        "parameters": {
            "type": "object",
            "properties": {"anomaly_id": {"type": "string"}},
            "required": ["anomaly_id"],
        },
    },
    {
        "name": "run_whatif",
        "description": "Run a what-if scenario ranking candidate actions for an asset by projected savings.",
        "parameters": {
            "type": "object",
            "properties": {
                "asset_id": {"type": "string"},
                "candidate_actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string"},
                            "cost": {"type": "number"},
                            "downtime_hours": {"type": "number"},
                        },
                    },
                },
            },
            "required": ["asset_id"],
        },
    },
    {
        "name": "get_recommendations",
        "description": "List ranked, confidence-scored recommendations, optionally filtered by status.",
        "parameters": {
            "type": "object",
            "properties": {"status": {"type": "string", "enum": ["open", "implemented", "verified"]}},
        },
    },
]


def dispatch(name: str, args: dict, db: Session, role: str | None = None) -> dict | list:
    """
    Calls the same handler function the matching REST route uses. Called
    directly from app/agent/agent.py (the Co-Pilot's tool-calling loop),
    NOT through FastAPI's request pipeline, so the route functions'
    Depends(require_roles(...)) guards never actually run for this path --
    role-gated tools must be checked explicitly here instead.
    """
    if name == "get_cost_summary":
        return cost_api.cost_summary(
            plant_id=args.get("plant_id"), line_id=args.get("line_id"),
            from_=None, to=None, db=db,
        )
    if name == "get_anomalies":
        return anomalies_api.list_anomalies(
            plant_id=args.get("plant_id"), severity=args.get("severity"),
            status=args.get("status"), db=db,
        )
    if name == "get_root_cause":
        return rootcause_api.get_root_cause(args["anomaly_id"], db=db)
    if name == "run_whatif":
        if role not in ("operator", "admin"):
            raise PermissionError("Running What-If scenarios requires Operator or Admin access.")
        payload = WhatIfRequest(
            asset_id=args["asset_id"],
            candidate_actions=args.get("candidate_actions") or [
                {"action": "filter_replacement", "cost": 1200, "downtime_hours": 0},
                {"action": "setpoint_reduction", "cost": 0, "downtime_hours": 0},
                {"action": "reschedule_cooler_shift", "cost": 300, "downtime_hours": 4},
            ],
        )
        return whatif_api.run_whatif(payload)
    if name == "get_recommendations":
        return recommendations_api.list_recommendations(status=args.get("status"), db=db)
    return {"error": f"unknown tool {name}"}
