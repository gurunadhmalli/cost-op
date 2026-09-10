"""
AI Assistant — Google Gemini API, FREE TIER, function-calling.
No paid API anywhere in this module. Get a free key at
https://aistudio.google.com/app/apikey and set GEMINI_API_KEY.

If no key is configured, falls back to a plain-English templated response
built directly from the same tool functions, so the assistant still works
(just without free-form LLM phrasing) — useful for a demo before you've
grabbed a key, and keeps the app from crashing without one.
"""
import asyncio
import json
import logging
import time

from sqlalchemy.orm import Session

from app.core.config import settings
from app.agent.tools import FUNCTION_DECLARATIONS, dispatch

logger = logging.getLogger("app.agent")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s [agent] %(message)s"))
    logger.addHandler(_handler)
    logger.propagate = False

_model = None
_gemini_available = False
_PLACEHOLDER_KEYS = {"", "changeme", "your-free-key-or-leave-as-changeme"}

if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip().lower() not in _PLACEHOLDER_KEYS:
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        _model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            tools=[{"function_declarations": FUNCTION_DECLARATIONS}],
            system_instruction=(
                "You are the AI Cost Co-Pilot for an industrial cost optimization platform. "
                "Answer questions about cost, anomalies, root causes, what-if scenarios, and "
                "recommendations using the provided tools. Be concise, cite concrete numbers "
                "(₹ savings, % confidence), and always ground answers in tool results — never "
                "invent a number that didn't come from a tool call."
            ),
            # Keep responses short so each hop finishes generating quickly —
            # this is a concise chat assistant, not a report writer.
            generation_config=genai.types.GenerationConfig(max_output_tokens=512),
        )
        _gemini_available = True
    except Exception:
        _gemini_available = False


async def handle_user_message(text: str, db: Session, emit):
    """
    emit(event: dict) is called for each streamed event, matching
    15_Backend_Full_Specification.md Section 1.9's wire protocol:
    {"type": "tool_call", ...} / {"type": "agent_text", ...} / {"type": "evidence_card", ...}
    """
    if not _gemini_available:
        await _fallback_response(text, db, emit)
        return

    request_start = time.monotonic()
    last_tool_result = None
    try:
        chat = _model.start_chat()
        # google-generativeai's SDK is synchronous/blocking; run it in a worker
        # thread so a slow Gemini response doesn't stall the event loop (and
        # with it, every other request — including /ws/live's ticks — for the
        # whole server, not just this connection).
        hop_start = time.monotonic()
        response = await asyncio.to_thread(chat.send_message, text)
        logger.info("gemini hop 0 (initial) took %.2fs", time.monotonic() - hop_start)

        for hop in range(1, 6):  # cap tool-call hops to avoid runaway loops
            function_call = None
            for part in response.candidates[0].content.parts:
                if getattr(part, "function_call", None) and part.function_call.name:
                    function_call = part.function_call
                    break
            if not function_call:
                break

            args = {k: v for k, v in function_call.args.items()}
            await emit({"type": "tool_call", "tool": function_call.name, "args": args})
            tool_start = time.monotonic()
            result = dispatch(function_call.name, args, db)
            logger.info("tool %s took %.2fs", function_call.name, time.monotonic() - tool_start)
            last_tool_result = (function_call.name, result)

            hop_start = time.monotonic()
            response = await asyncio.to_thread(
                chat.send_message,
                genai.protos.Content(parts=[genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=function_call.name, response={"result": json.loads(json.dumps(result, default=str))}
                    )
                )]),
            )
            logger.info("gemini hop %d (after %s) took %.2fs", hop, function_call.name, time.monotonic() - hop_start)

        logger.info("handle_user_message total %.2fs", time.monotonic() - request_start)
        final_text = response.text if response.candidates else "I couldn't generate a response — please try rephrasing."
    except Exception:
        logger.exception("Gemini call failed after %.2fs", time.monotonic() - request_start)
        await emit({"type": "agent_text", "text": "The AI assistant hit an error reaching Gemini — please try again in a moment."})
        return

    await emit({"type": "agent_text", "text": final_text})

    card = _build_evidence_card(last_tool_result)
    if card:
        await emit({"type": "evidence_card", "data": card})


async def _fallback_response(text: str, db: Session, emit):
    """No Gemini key configured — template a response from live data so the
    assistant is still functional (used for the worked-example demo path)."""
    from app.db import models

    await emit({"type": "tool_call", "tool": "get_anomalies", "args": {"status": "open"}})
    anomalies = dispatch("get_anomalies", {"status": "open"}, db)
    if not anomalies:
        await emit({"type": "agent_text", "text": "No open anomalies right now — costs are tracking to baseline."})
        return

    top = max(anomalies, key=lambda a: a["anomaly_score"])
    await emit({"type": "tool_call", "tool": "get_root_cause", "args": {"anomaly_id": top["anomaly_id"]}})
    rca = dispatch("get_root_cause", {"anomaly_id": top["anomaly_id"]}, db)

    summary = rca.get("llm_summary") or f"{top['asset_name']} has an open anomaly on {top['metric']}."
    await emit({"type": "agent_text", "text": f"[AI assistant not configured — showing live data directly] {summary}"})

    if rca.get("ranked_drivers"):
        driver = rca["ranked_drivers"][0]
        await emit({"type": "evidence_card", "data": {
            "type": "root_cause",
            "title": driver["recommended_fix"] or driver["driver"],
            "confidence": rca["confidence"],
            "projectedSavings": None,
            "driver": driver["driver"],
            "recommendationId": None,
        }})


def _build_evidence_card(last_tool_result):
    if not last_tool_result:
        return None
    name, result = last_tool_result
    if name == "get_root_cause" and result.get("ranked_drivers"):
        driver = result["ranked_drivers"][0]
        return {
            "type": "root_cause",
            "title": driver["recommended_fix"] or driver["driver"],
            "confidence": result["confidence"],
            "driver": driver["driver"],
        }
    if name == "get_recommendations" and result:
        top = result[0]
        return {
            "type": "recommendation",
            "title": top["title"],
            "confidence": top["confidence"],
            "projectedSavings": top["projected_savings"],
            "recommendationId": top["recommendation_id"],
        }
    if name == "run_whatif" and result.get("ranked_scenarios"):
        top = result["ranked_scenarios"][0]
        # WhatIfCandidateAction has no confidence field (it's an LP ranking,
        # not a statistical estimate) — EvidenceCard always renders a
        # confidence badge, so derive one from feasibility rather than
        # passing null, which used to render as "NaN% Confidence".
        return {
            "type": "whatif",
            "title": top["action"],
            "confidence": 0.95 if top.get("feasible") else 0.5,
            "projectedSavings": top["projected_savings_quarter"],
        }
    return None
