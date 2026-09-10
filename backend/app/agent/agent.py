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
                "Each user message includes a JSON 'Live context' block already fetched from "
                "the plant's live systems (open anomalies, root cause of the top anomaly, open "
                "recommendations) — answer directly from that block whenever it covers the "
                "question, without calling a tool. Only call a tool if the question needs data "
                "that isn't in the context block (e.g. a specific what-if scenario, a different "
                "status/severity filter). Be concise, cite concrete numbers (₹ savings, % "
                "confidence), and never invent a number that didn't come from the context or a "
                "tool result."
            ),
            # Keep responses short so each hop finishes generating quickly —
            # this is a concise chat assistant, not a report writer.
            generation_config=genai.types.GenerationConfig(max_output_tokens=512),
        )
        _gemini_available = True
    except Exception:
        _gemini_available = False

# Render's free tier (0.1 shared CPU) is markedly slower than a local
# machine for the same Gemini call, especially on the first request after
# the container's been idle -- 25s was cutting off requests that would
# have succeeded. This is a safety net against a truly hung call, not a
# tight SLA, so give it real headroom.
GEMINI_TIMEOUT_SECONDS = 45


def _dispatch_safe(name: str, args: dict, db: Session):
    try:
        return dispatch(name, args, db)
    except Exception:
        logger.exception("prefetch dispatch failed for %s", name)
        return None


def _prefetch_context(db: Session):
    """
    Runs the cheap, local (DB-only, no network) tool calls up front so the
    common questions ("why did cost spike", "top savings opportunities")
    can be answered in a SINGLE Gemini round-trip instead of the 2-3
    sequential ones the old pure function-calling loop needed — each
    Gemini call is the slow part (seconds), each of these is milliseconds.
    Returns (context_dict, seed_tool_result_for_evidence_card).
    """
    context: dict = {}
    seed_tool_result = None

    anomalies = _dispatch_safe("get_anomalies", {"status": "open"}, db) or []
    context["open_anomalies"] = anomalies

    if anomalies:
        top = max(anomalies, key=lambda a: a.get("anomaly_score", 0))
        rca = _dispatch_safe("get_root_cause", {"anomaly_id": top["anomaly_id"]}, db)
        if rca:
            context["root_cause_for_top_anomaly"] = rca
            seed_tool_result = ("get_root_cause", rca)

    recs = _dispatch_safe("get_recommendations", {"status": "open"}, db) or []
    context["open_recommendations"] = recs
    if recs and seed_tool_result is None:
        seed_tool_result = ("get_recommendations", recs)

    return context, seed_tool_result


async def _call_gemini(chat, payload):
    hop_start = time.monotonic()
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(chat.send_message, payload),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.warning("gemini hop timed out after %ds", GEMINI_TIMEOUT_SECONDS)
        raise
    logger.info("gemini hop took %.2fs", time.monotonic() - hop_start)
    return response


async def handle_user_message(text: str, db: Session, emit, role: str | None = None):
    """
    emit(event: dict) is called for each streamed event, matching
    15_Backend_Full_Specification.md Section 1.9's wire protocol:
    {"type": "tool_call", ...} / {"type": "agent_text", ...} / {"type": "evidence_card", ...}

    role is the caller's authenticated role (admin/operator/viewer, from the
    WebSocket's JWT — see app/api/chat.py), threaded through to dispatch()
    so role-gated tools (currently run_whatif) are enforced here too, not
    just on the equivalent REST route.
    """
    if not _gemini_available:
        await _fallback_response(text, db, emit)
        return

    request_start = time.monotonic()
    context, last_tool_result = _prefetch_context(db)
    logger.info("prefetch took %.2fs", time.monotonic() - request_start)

    prompt = (
        f"Live context (already fetched):\n{json.dumps(context, default=str)}\n\n"
        f"User question: {text}"
    )

    try:
        chat = _model.start_chat()
        # google-generativeai's SDK is synchronous/blocking; run it in a worker
        # thread so a slow Gemini response doesn't stall the event loop (and
        # with it, every other request — including /ws/live's ticks — for the
        # whole server, not just this connection).
        response = await _call_gemini(chat, prompt)

        for _hop in range(3):  # safety-net hops for questions the prefetch didn't cover
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
            result = dispatch(function_call.name, args, db, role)
            logger.info("tool %s took %.2fs", function_call.name, time.monotonic() - tool_start)
            last_tool_result = (function_call.name, result)

            response = await _call_gemini(
                chat,
                genai.protos.Content(parts=[genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=function_call.name, response={"result": json.loads(json.dumps(result, default=str))}
                    )
                )]),
            )

        logger.info("handle_user_message total %.2fs", time.monotonic() - request_start)
        final_text = response.text if response.candidates else "I couldn't generate a response — please try rephrasing."
    except asyncio.TimeoutError:
        await emit({"type": "agent_text", "text": "The AI assistant is taking too long to respond — please try again in a moment."})
        return
    except PermissionError as e:
        await emit({"type": "agent_text", "text": str(e)})
        return
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
