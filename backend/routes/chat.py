"""
Chat API routes — Agentic Finance Advisor.

POST /api/chat — Send a message, run the finance agent, get a response.
"""

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai.emotion_detector import emotion_detector
from ai.agent import run_finance_agent, _sessions
from ai.rag_pipeline import retrieve_context

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])

# Thread pool so blocking Groq/torch calls don't freeze the async event loop
_executor = ThreadPoolExecutor(max_workers=4)

# Trivial messages — canned replies, zero Groq/BERT/RAG cost.
_TRIVIAL_REPLIES: dict[str, str] = {
    "hi":           "Hi! I'm Finsight. Ask me anything about money — budgeting, taxes, investing, EMIs.",
    "hello":        "Hello! What's on your mind — budget, taxes, investing, or something else?",
    "hey":          "Hey! What money topic can I help with today?",
    "yo":           "Hey! What money topic can I help with today?",
    "thanks":       "You're welcome! Anything else on your mind?",
    "thank you":    "Happy to help! What else can I look up?",
    "thx":          "You're welcome! Anything else on your mind?",
    "ok":           "Got it. What would you like to tackle next?",
    "okay":         "Got it. What would you like to tackle next?",
    "cool":         "Nice. What's next on the agenda?",
    "nice":         "Glad that helped. What else can I dig into?",
    "great":        "Glad that helped. What else can I dig into?",
    "bye":          "Bye! Come back anytime — your finances will thank you.",
    "goodbye":      "Bye! Come back anytime — your finances will thank you.",
    "good morning": "Good morning! What's today's money question?",
    "good evening": "Good evening! What's on your mind — budgets, taxes, or investing?",
}

_DEFAULT_SUGGESTIONS = [
    "Help me plan my monthly budget",
    "How much income tax will I pay this year?",
    "Where should I start investing?",
]


# ── Request / Response schemas ─────────────────────────────────────────────────

class UserProfile(BaseModel):
    age:       Optional[str] = None
    income:    Optional[str] = None
    goal:      Optional[str] = None
    challenge: Optional[str] = None


class ChatRequest(BaseModel):
    message:    str                   = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str]         = None
    profile:    Optional[UserProfile] = None


class AgentStep(BaseModel):
    tool:   str
    label:  str
    icon:   str
    result: str


class ChatResponse(BaseModel):
    response:      str
    emotion:       str
    emotion_score: float
    emotion_color: str
    session_id:    str
    suggestions:   list[str]       = []
    agent_steps:   list[AgentStep] = []


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Agentic chat endpoint.
    Pipeline: Emotion detection → RAG retrieval → Finance Agent (with tools)
    All blocking calls run in a thread pool so the event loop stays free.
    """
    session_id = request.session_id or str(uuid.uuid4())
    loop = asyncio.get_event_loop()

    # 0 — Trivial / greeting short-circuit → skip BERT + RAG + Groq entirely.
    normalized = request.message.lower().strip().rstrip(".!?,")
    if normalized in _TRIVIAL_REPLIES:
        logger.info(f"[Chat] Trivial short-circuit: {normalized!r} (no Groq call)")
        return ChatResponse(
            response      = _TRIVIAL_REPLIES[normalized],
            emotion       = "neutral",
            emotion_score = 1.0,
            emotion_color = "#6b7280",
            session_id    = session_id,
            suggestions   = _DEFAULT_SUGGESTIONS,
            agent_steps   = [],
        )

    # 1 — Emotion detection (runs torch model — blocking, use thread)
    try:
        emotion_data = await loop.run_in_executor(
            _executor, emotion_detector.detect, request.message
        )
    except Exception as exc:
        logger.error(f"Emotion detection failed: {exc}")
        emotion_data = {"emotion": "neutral", "score": 1.0, "color": "#6b7280"}

    # 2 — RAG retrieval (runs sentence-transformers — blocking, use thread)
    try:
        context = await loop.run_in_executor(
            _executor, retrieve_context, request.message
        )
    except Exception as exc:
        logger.error(f"RAG retrieval failed: {exc}")
        context = ""

    # 3 — Run finance agent (calls Groq API + tool execution — blocking, use thread)
    try:
        agent_fn = partial(
            run_finance_agent,
            session_id    = session_id,
            user_message  = request.message,
            emotion       = emotion_data["emotion"],
            emotion_score = emotion_data["score"],
            context       = context,
            profile       = request.profile.model_dump() if request.profile else {},
        )
        ai_response, agent_steps_raw, suggestions = await loop.run_in_executor(
            _executor, agent_fn
        )
    except Exception as exc:
        logger.error(f"Finance agent failed: {exc}")
        raise HTTPException(status_code=500, detail=f"AI agent error: {str(exc)}")

    agent_steps = [
        AgentStep(
            tool   = step["tool"],
            label  = step["label"],
            icon   = step["icon"],
            result = step["result"],
        )
        for step in agent_steps_raw
    ]

    return ChatResponse(
        response      = ai_response,
        emotion       = emotion_data["emotion"],
        emotion_score = round(emotion_data["score"], 4),
        emotion_color = emotion_data["color"],
        session_id    = session_id,
        suggestions   = suggestions,
        agent_steps   = agent_steps,
    )


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Return conversation history for a given session (in-memory)."""
    messages = _sessions.get(session_id, [])
    return {"session_id": session_id, "messages": messages}
