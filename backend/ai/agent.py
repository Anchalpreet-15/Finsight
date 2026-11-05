"""
Finsight Agentic Finance Advisor
==================================
Tool-calling agent using the Groq SDK directly (no LangChain).
"""

import hashlib
import json
import logging
import os
import time
from typing import Optional

from groq import Groq

from .financial_tools import TOOL_SCHEMAS, execute_tool

logger = logging.getLogger(__name__)

# ── In-process session memory ──────────────────────────────────────────────────
_sessions: dict[str, list] = {}

# ── Profile label maps ─────────────────────────────────────────────────────────
_AGE_MAP = {
    "18-25": "18–25 years old",
    "26-35": "26–35 years old",
    "36-45": "36–45 years old",
    "45+":   "above 45 years old",
}
_INCOME_MAP = {
    "below-25k": "below ₹25,000/month",
    "25k-50k":   "₹25,000–50,000/month",
    "50k-1L":    "₹50,000–1,00,000/month",
    "above-1L":  "above ₹1,00,000/month",
}
_GOAL_MAP = {
    "save":      "save more money and build financial security",
    "debt-free": "get out of debt and EMIs",
    "invest":    "start investing and build long-term wealth",
    "buy-asset": "buy a home or vehicle",
}
_CHALLENGE_MAP = {
    "salary-gone":        "salary runs out before month-end",
    "investing-confused": "doesn't know where or how to invest",
    "too-many-emis":      "overwhelmed by multiple EMIs",
    "no-savings":         "has no savings right now",
}

# ── Tool label/icon maps (for frontend display) ────────────────────────────────
_TOOL_LABELS = {
    "calculate_sip":               "SIP Calculator",
    "calculate_emi":               "EMI Calculator",
    "calculate_income_tax":        "Income Tax Calculator",
    "calculate_savings_goal":      "Savings Goal Planner",
    "budget_planner":              "Budget Planner",
    "emergency_fund_calculator":   "Emergency Fund Calculator",
    "debt_payoff_advisor":         "Debt Payoff Advisor",
    "get_stock_data":              "Stock Market Data",
    "search_financial_web":        "Financial Web Search",
    "calculate_ppf":               "PPF Calculator",
    "calculate_fd_rd":             "FD/RD Calculator",
    "calculate_hra_exemption":     "HRA Exemption Calculator",
    "calculate_capital_gains_tax": "Capital Gains Tax",
    "calculate_retirement_corpus": "Retirement Corpus Planner",
    "cibil_score_advisor":         "CIBIL Score Advisor",
}

_TOOL_ICONS = {
    "calculate_sip":               "📈",
    "calculate_emi":               "🏠",
    "calculate_income_tax":        "📋",
    "calculate_savings_goal":      "🎯",
    "budget_planner":              "💰",
    "emergency_fund_calculator":   "🛡️",
    "debt_payoff_advisor":         "🔓",
    "get_stock_data":              "📊",
    "search_financial_web":        "🌐",
    "calculate_ppf":               "🏦",
    "calculate_fd_rd":             "🏧",
    "calculate_hra_exemption":     "🏘️",
    "calculate_capital_gains_tax": "💹",
    "calculate_retirement_corpus": "🌅",
    "cibil_score_advisor":         "⭐",
}


# ── System prompt (compact — detailed facts live in RAG + tools) ──────────────
_SYSTEM_PROMPT = """\
You are Finsight, India's personal finance AI. Warm, concise, accurate.

FY25-26 quick facts:
- New tax regime: slabs 0/5/10/15/20/25/30% at 4/8/12/16/20/24L; std-ded ₹75K; 87A rebate ₹60K if taxable ≤₹12L (zero tax up to ₹12.75L salary).
- PPF 7.1% EEE 15y; EPF 8.25%; FD 6.5-8%; direct MF > regular. Term insurance 10-15× income.
- CIBIL ≥750; utilisation <30%; EMI ≤40% income. Emergency fund 3-12 months.

TOOLS: Call them for any number, live data, or specific tax/SIP/EMI/PPF/stock query. Stock tickers: add .NS (NSE) or .BO (BSE). Do not compute yourself when a tool exists.

STYLE: **bold** numbers, ₹ for amounts, bullets, ## sections. Keep it tight.
End EVERY reply with: SUGGESTIONS: q1 | q2 | q3

For investment-allocation asks, add on the line AFTER SUGGESTIONS:
INVEST_VIZ: {"amount":<n>,"monthly":<n>,"summary":"<1 line>","asset_allocation":[{"name":"Equity","value":<%>,"why":"..."},{"name":"Debt","value":<%>,"why":"..."},{"name":"Gold","value":<%>,"why":"..."}],"sector_allocation":[{"name":"Banking","value":25},{"name":"IT","value":20},{"name":"FMCG","value":15},{"name":"Pharma","value":15},{"name":"Energy","value":15},{"name":"Consumer","value":10}]}
Equity%: 18-30→80, 31-45→65, 46+→45.

Profile: PROFILE_SECTION
Emotion: EMOTION (EMOTION_SCORE) — stressed→calm+steps; confused→simple; excited→validate+caution; sad→acknowledge.
Context: CONTEXT\
"""


# ── Smart tool routing ─────────────────────────────────────────────────────────
_TOOL_KEYWORDS: dict[str, tuple[str, ...]] = {
    "calculate_sip":               ("sip", "mutual fund", " mf ", "systematic"),
    "calculate_emi":               ("emi", "loan", "home loan", "car loan", "personal loan"),
    "calculate_income_tax":        ("income tax", "tax slab", "tax regime", "salary tax", "how much tax"),
    "calculate_savings_goal":      ("savings goal", "save for", "goal plan"),
    "budget_planner":              ("budget", "50/30/20", "monthly plan"),
    "emergency_fund_calculator":   ("emergency fund", "rainy day", "emergency"),
    "debt_payoff_advisor":         ("debt", "payoff", "snowball", "avalanche", "credit card debt"),
    "get_stock_data":              ("stock", "share price", "ticker", "nse", "bse", "equity price"),
    "search_financial_web":        ("latest", "news", "today", "current rate", "rbi", "nav", "live"),
    "calculate_ppf":               ("ppf", "public provident"),
    "calculate_fd_rd":             ("fd ", " rd ", "fixed deposit", "recurring deposit"),
    "calculate_hra_exemption":     ("hra", "house rent allowance"),
    "calculate_capital_gains_tax": ("capital gain", "ltcg", "stcg"),
    "calculate_retirement_corpus": ("retirement", "pension", "retire at"),
    "cibil_score_advisor":         ("cibil", "credit score"),
}


def _select_tools(user_message: str) -> list:
    """
    Only send the tool schemas that are likely relevant to this message.
    Saves ~1500-2000 input tokens per Groq call when the match is narrow.
    """
    msg = f" {user_message.lower()} "
    matched = {
        name for name, kws in _TOOL_KEYWORDS.items()
        if any(kw in msg for kw in kws)
    }
    if not matched:
        # No keyword match → short conversational turn, no tools needed.
        # The LLM can still answer from its system knowledge + RAG context.
        return []
    return [t for t in TOOL_SCHEMAS if t["function"]["name"] in matched]


def _truncate_for_llm(text: str, max_chars: int = 800) -> str:
    """Trim bulky tool outputs before putting them back in the LLM context."""
    if text is None:
        return ""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n…[truncated]"


# ── Tiny response cache (per-process) ─────────────────────────────────────────
# Same (system + last-user-message + profile-fingerprint) hitting Groq twice
# within _CACHE_TTL seconds returns the cached reply. Saves redundant calls
# on reloads or duplicate submissions.
_CACHE_TTL = 300  # 5 minutes
_response_cache: dict[str, tuple[float, tuple[str, list, list]]] = {}


def _cache_key(user_message: str, context: str, profile: dict, emotion: str) -> str:
    h = hashlib.sha1()
    h.update(user_message.strip().lower().encode())
    h.update(b"|")
    h.update(context.encode())
    h.update(b"|")
    h.update(json.dumps(profile or {}, sort_keys=True).encode())
    h.update(b"|")
    h.update(emotion.encode())
    return h.hexdigest()


def _cache_get(key: str):
    entry = _response_cache.get(key)
    if not entry:
        return None
    ts, value = entry
    if time.time() - ts > _CACHE_TTL:
        _response_cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value):
    # Keep cache bounded.
    if len(_response_cache) > 256:
        _response_cache.pop(next(iter(_response_cache)), None)
    _response_cache[key] = (time.time(), value)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_profile_section(profile: dict) -> str:
    if not profile:
        return "No profile provided — give general India-relevant advice."
    parts = []
    if profile.get("age"):
        parts.append(f"Age: {_AGE_MAP.get(profile['age'], profile['age'])}")
    if profile.get("income"):
        parts.append(f"Income: {_INCOME_MAP.get(profile['income'], profile['income'])}")
    if profile.get("goal"):
        parts.append(f"Goal: {_GOAL_MAP.get(profile['goal'], profile['goal'])}")
    if profile.get("challenge"):
        parts.append(f"Challenge: {_CHALLENGE_MAP.get(profile['challenge'], profile['challenge'])}")
    return " | ".join(parts) if parts else "Incomplete profile."


def _parse_suggestions(text: str) -> tuple[str, list[str]]:
    """Strip SUGGESTIONS line; return (clean_text, suggestions)."""
    suggestions: list[str] = []
    clean_lines = []
    for line in text.splitlines():
        if line.strip().upper().startswith("SUGGESTIONS:"):
            raw = line.split(":", 1)[1].strip()
            suggestions = [s.strip() for s in raw.split("|") if s.strip()]
        else:
            clean_lines.append(line)
    return "\n".join(clean_lines).strip(), suggestions


# ── Main agent function ────────────────────────────────────────────────────────

def run_finance_agent(
    session_id: str,
    user_message: str,
    emotion: str,
    emotion_score: float,
    context: str,
    profile: Optional[dict] = None,
) -> tuple[str, list[dict], list[str]]:
    """
    Run the agentic finance advisor for one user turn.

    Returns:
        reply       — Final AI response text (markdown formatted)
        agent_steps — List of tool calls made during this turn
        suggestions — List of suggested follow-up questions
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY is not set.")

    client = Groq(api_key=api_key)

    system_content = (
        _SYSTEM_PROMPT
        .replace("PROFILE_SECTION", _build_profile_section(profile or {}))
        .replace("EMOTION_SCORE", f"{emotion_score:.0%}")
        .replace("EMOTION", emotion)
        .replace("CONTEXT", context or "No specific context — use general financial expertise.")
    )

    history = _sessions.setdefault(session_id, [])
    # Keep only the last 1 user/assistant pair (2 messages) — any further back
    # is paid-for context the model rarely uses.
    trimmed_history = history[-2:] if len(history) > 2 else history

    # Cache-check before spending any tokens.
    cache_key = _cache_key(user_message, context or "", profile or {}, emotion)
    cached = _cache_get(cache_key)
    if cached is not None:
        logger.info(f"[Agent] Cache hit for session={session_id[:8]}")
        reply, agent_steps_cached, suggestions_cached = cached
        history.append({"role": "user",      "content": user_message})
        history.append({"role": "assistant", "content": reply})
        return reply, agent_steps_cached, suggestions_cached

    messages: list[dict] = [
        {"role": "system", "content": system_content},
        *trimmed_history,
        {"role": "user", "content": user_message},
    ]

    agent_steps: list[dict] = []
    max_iterations = 3  # was 4 — one less round saves a full Groq call on complex turns
    final_content: str | None = None

    # Smart tool filter: only send relevant schemas (saves ~1500-2000 input tokens).
    selected_tools = _select_tools(user_message)
    use_tools = bool(selected_tools)

    for iteration in range(max_iterations):
        logger.info(
            f"[Agent] Iter {iteration + 1} | session={session_id[:8]} "
            f"| emotion={emotion} | tools={len(selected_tools) if use_tools else 0}"
        )

        completion_kwargs = dict(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.3,
            max_tokens=500,  # was 900 — plenty for conversational finance replies
        )
        if use_tools:
            completion_kwargs["tools"] = selected_tools
            completion_kwargs["tool_choice"] = "auto"

        response = client.chat.completions.create(**completion_kwargs)

        msg = response.choices[0].message

        if not msg.tool_calls:
            final_content = msg.content or ""
            logger.info(f"[Agent] Final answer after {iteration + 1} iteration(s).")
            break

        # Append assistant message with tool calls
        messages.append({
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ],
        })

        # Execute each tool and append results
        for tc in msg.tool_calls:
            tool_name = tc.function.name
            try:
                tool_args = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                tool_args = {}

            logger.info(f"[Agent] Tool call: {tool_name}({tool_args})")
            result = execute_tool(tool_name, tool_args)

            agent_steps.append({
                "tool":   tool_name,
                "label":  _TOOL_LABELS.get(tool_name, tool_name.replace("_", " ").title()),
                "icon":   _TOOL_ICONS.get(tool_name, "🔧"),
                "result": result,  # full result → user
            })

            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      _truncate_for_llm(result),  # trimmed → LLM context
            })
    else:
        logger.warning(f"[Agent] Max iterations ({max_iterations}) reached for session {session_id[:8]}")
        if final_content is None:
            final_content = ""

    if not final_content and agent_steps:
        final_content = (
            "I've run the calculations for you — see the results above. "
            "Let me know if you'd like to adjust any numbers or explore other options!"
        )
    elif not final_content:
        final_content = "I'm sorry, something went wrong. Please try again."

    reply, suggestions = _parse_suggestions(final_content)

    # If parsing stripped everything (model returned only a SUGGESTIONS line),
    # fall back to showing the last tool result directly.
    if not reply.strip() and agent_steps:
        reply = agent_steps[-1]["result"]

    history.append({"role": "user",      "content": user_message})
    history.append({"role": "assistant", "content": reply})
    # Bound per-session memory so long chats don't grow unbounded (saves RAM,
    # and we only resend the last 2 anyway).
    if len(history) > 20:
        del history[: len(history) - 20]

    _cache_set(cache_key, (reply, agent_steps, suggestions))

    return reply, agent_steps, suggestions
