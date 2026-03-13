"""
Assistant API — POST /api/v1/chat
Controlled by CHAT_BACKEND env variable:
  - "gemini"  → Gemini Cloud API directly (default)
  - "llama"   → Local RAG (Llama 3.2 + ChromaDB), fallback to Gemini
"""

import os
from flask import request, jsonify
from flask_login import login_required, current_user
from flask_cors import cross_origin
from datetime import datetime, timedelta
import json
import logging

from app.routes.api import api_v1
from app.services.gemini_service import gemini_service
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.chat_history import ChatHistory
from app.extensions import db

logger = logging.getLogger(__name__)

# ── Read chat backend preference ─────────────────────────────
CHAT_BACKEND = os.getenv("CHAT_BACKEND", "gemini").lower().strip()
_backend_label = "GEMINI" if CHAT_BACKEND == "gemini" else "LLAMA (fallback: gemini)"
print(f"[CHAT] Backend: {_backend_label}")
logger.info("[CHAT] Backend: %s", _backend_label)

# Only import the heavy RAG module if we actually need it
if CHAT_BACKEND == "llama":
    try:
        from backend.ml.rag_assistant import rag_assistant
        logger.info("[CHAT] RAG assistant imported successfully")
    except Exception as e:
        logger.error("[CHAT] Failed to import RAG assistant: %s — forcing GEMINI mode", e)
        CHAT_BACKEND = "gemini"
        rag_assistant = None
else:
    rag_assistant = None


def _gather_user_context():
    """Collect medication & compliance data for the current user."""
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    med_data = [
        {
            "name": m.name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "times": ", ".join(m.get_reminder_times()),
        }
        for m in medications
    ]

    thirty_days_ago = datetime.now() - timedelta(days=30)
    logs = MedicationLog.query.filter(
        MedicationLog.user_id == current_user.id,
        MedicationLog.taken_at >= thirty_days_ago,
    ).all()

    compliance_rate = 0
    if logs:
        taken = sum(1 for log in logs if log.taken_correctly)
        compliance_rate = round((taken / len(logs)) * 100)

    return {
        "user_name": current_user.full_name or current_user.username,
        "medications": med_data,
        "compliance_rate": compliance_rate,
        "current_time": datetime.now().strftime("%A, %B %d, %Y at %I:%M %p"),
        "recent_logs": [],
    }


def _call_gemini(message, history, context):
    """Call Gemini Cloud API and return a response dict."""
    if not gemini_service.is_configured():
        return None, (
            jsonify({
                "success": False,
                "error": (
                    "Gemini API key is not configured. "
                    "Set GEMINI_API_KEY in .env."
                ),
            }),
            503,
        )

    gemini_result = gemini_service.chat_with_guardian(message, history, context)
    gemini_result["backend"] = "gemini"
    return gemini_result, None


@api_v1.route("/chat", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@login_required
def chat():
    """
    Single consolidated /chat endpoint.
    Routes based on CHAT_BACKEND env variable.
    """
    try:
        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({"success": False, "error": "Message required"}), 400

        message = data["message"]
        history = data.get("history", [])
        context = _gather_user_context()
        med_data = context["medications"]

        # ══════════════════════════════════════════════════════════
        # PATH A: Direct Gemini (CHAT_BACKEND=gemini)
        # ══════════════════════════════════════════════════════════
        if CHAT_BACKEND == "gemini":
            logger.info(
                "Chat [GEMINI] user=%s query='%s'",
                current_user.id,
                message[:80],
            )
            result, err = _call_gemini(message, history, context)
            if err:
                return err
            return jsonify(result), 200

        # ══════════════════════════════════════════════════════════
        # PATH B: Llama RAG first, Gemini fallback (CHAT_BACKEND=llama)
        # ══════════════════════════════════════════════════════════
        try:
            context_str = (
                f"User: {context['user_name']}\n"
                f"Adherence: {context['compliance_rate']}%\n"
                f"Medications: {json.dumps(med_data)}"
            )
            full_query = f"{context_str}\n\nQuery: {message}"

            result = rag_assistant.query(full_query)

            # Safety-net: if ChromaDB has no documents, the Llama output
            # will be ungrounded hallucination.  Fall back to Gemini.
            if not result.get("sources"):
                logger.warning(
                    "RAG returned 0 sources (ChromaDB empty) — falling "
                    "back to Gemini for grounded response."
                )
                raise RuntimeError("RAG knowledge base is empty — no sources retrieved")

            logger.info(
                "Chat [RAG] user=%s query='%s' latency=%dms sources=%d",
                current_user.id,
                message[:80],
                result.get("latency_ms", 0),
                len(result.get("sources", [])),
            )

            return jsonify(
                {
                    "success": True,
                    "response": result["response"],
                    "sources": result.get("sources", []),
                    "context_used": result.get("context_used"),
                    "backend": "rag",
                }
            ), 200

        except Exception as rag_err:
            logger.warning(
                "RAG pipeline failed, falling back to Gemini: %s", rag_err,
                exc_info=True,
            )

            result, err = _call_gemini(message, history, context)
            if err:
                return err
            return jsonify(result), 200

    except Exception as e:
        logger.error("Chat endpoint failed: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# Chat History Endpoints
# ══════════════════════════════════════════════════════════════

@api_v1.route("/chat/history", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True)
@login_required
def get_chat_history():
    """Return list of user's past conversations (summaries only)."""
    try:
        conversations = (
            ChatHistory.query
            .filter_by(user_id=current_user.id)
            .order_by(ChatHistory.updated_at.desc())
            .limit(50)
            .all()
        )
        return jsonify({
            "success": True,
            "conversations": [c.to_summary() for c in conversations],
        }), 200
    except Exception as e:
        logger.error("Failed to load chat history: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@api_v1.route("/chat/history/save", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@login_required
def save_chat_history():
    """Upsert a conversation by session_id."""
    try:
        data = request.get_json()
        session_id = data.get("session_id")
        messages = data.get("messages", [])
        title = data.get("title", "New Chat")[:60]

        if not session_id:
            return jsonify({"success": False, "error": "session_id required"}), 400
        if not messages:
            return jsonify({"success": False, "error": "messages required"}), 400

        conv = ChatHistory.query.filter_by(
            session_id=session_id, user_id=current_user.id
        ).first()

        if conv:
            conv.messages = messages
            conv.title = title
        else:
            conv = ChatHistory(
                user_id=current_user.id,
                session_id=session_id,
                title=title,
                messages=messages,
            )
            db.session.add(conv)

        db.session.commit()
        return jsonify({"success": True, "session_id": session_id}), 200
    except Exception as e:
        db.session.rollback()
        logger.error("Failed to save chat history: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@api_v1.route("/chat/history/<session_id>", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True)
@login_required
def load_chat_session(session_id):
    """Load full conversation by session_id."""
    try:
        conv = ChatHistory.query.filter_by(
            session_id=session_id, user_id=current_user.id
        ).first()
        if not conv:
            return jsonify({"success": False, "error": "Conversation not found"}), 404

        return jsonify({
            "success": True,
            "session_id": conv.session_id,
            "title": conv.title,
            "messages": conv.messages,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
        }), 200
    except Exception as e:
        logger.error("Failed to load chat session: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500
