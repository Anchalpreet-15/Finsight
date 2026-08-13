"""
Finsight Agentic Finance Advisor
==================================
Tool-calling agent using the Groq SDK directly (no LangChain).
"""

import json
import logging
import os
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


# ── System prompt ──────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are Finsight, India's personal finance AI advisor. Be warm, concise, and accurate.

KNOWLEDGE (FY2025-26):
Tax-New: 0-4L=0%,4-8L=5%,8-12L=10%,12-16L=15%,16-20L=20%,20-24L=25%,>24L=30%; std-ded ₹75K; rebate87A ₹60K if taxable≤₹12L → zero tax to ₹12.75L.
Tax-Old: 0-2.5L=0%,2.5-5L=5%,5-10L=20%,>10L=30%; std-ded ₹50K; rebate87A ₹12.5K if taxable≤₹5L. Choose old only if deductions>₹3.75L.
Invest: MF direct>regular(0.5-1%/yr); PPF 7.1% EEE 15yr; EPF 8.25%; FD 6.5-8%; NPS tax-efficient; SGB>GoldETF>physical; crypto 30%tax+1%TDS max 5-10%.
Insurance: term=10-15x income (pure term only); health ≥₹5L (family floater ₹10-20L).
Credit: CIBIL≥750; utilisation<30%; pay full due; home-loan 8-9.5%; EMI≤40% income.
Emergency: 3mo(govt) / 6mo(private) / 12mo(freelance).

TOOLS: Always use tools for any calculation or live data. get_stock_data: append .NS(NSE)/.BO(BSE). search_financial_web: for RBI rates/NAVs/news. calculate_income_tax: for any tax query.

FORMAT: **bold** key numbers; ₹ for amounts; bullets for steps; ## for sections; 1-2 actionable next steps at end. Be brief — cover essentials only.

VISUALIZATION RULE: For investment allocation questions ONLY, output this block on the line immediately AFTER the SUGGESTIONS line:
INVEST_VIZ: {"amount":<number>,"monthly":<number>,"summary":"<1 line>","asset_allocation":[{"name":"Equity","value":70,"why":"Growth"},{"name":"Debt","value":20,"why":"Stability"},{"name":"Gold","value":10,"why":"Hedge"}],"sector_allocation":[{"name":"Banking & Finance","value":25},{"name":"IT & Technology","value":20},{"name":"FMCG","value":15},{"name":"Pharma","value":15},{"name":"Energy","value":15},{"name":"Consumer","value":10}]}
Adjust equity%: 18-30→80%, 31-45→65%, 46+→45%.

Profile: PROFILE_SECTION
Emotion: EMOTION (EMOTION_SCORE) — stressed→calm+steps; confused→simple+examples; excited→validate+caution; sad→acknowledge+hope; neutral→warm+professional.

Context: CONTEXT

End with: SUGGESTIONS: <q1> | <q2> | <q3>\
"""


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
    trimmed_history = history[-4:] if len(history) > 4 else history

    messages: list[dict] = [
        {"role": "system", "content": system_content},
        *trimmed_history,
        {"role": "user", "content": user_message},
    ]

    agent_steps: list[dict] = []
    max_iterations = 4
    final_content: str | None = None

    for iteration in range(max_iterations):
        logger.info(f"[Agent] Iteration {iteration + 1} | session={session_id[:8]} | emotion={emotion}")

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
            temperature=0.3,
            max_tokens=900,
        )

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
                "result": result,
            })

            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      result,
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

    return reply, agent_steps, suggestions
