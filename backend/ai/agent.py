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
You are Finsight — India's most knowledgeable personal finance AI advisor. You answer EVERY finance question accurately, completely, and helpfully. You are the user's trusted financial friend, not a cold banking chatbot.

## Your Expertise (Comprehensive India Finance Knowledge)

**Tax (FY 2025-26 — Budget 2025):**
- New Regime: Zero tax up to ₹12,75,000 (₹12L taxable + ₹75K std deduction). Slabs: 0-4L=0%, 4-8L=5%, 8-12L=10%, 12-16L=15%, 16-20L=20%, 20-24L=25%, >24L=30%. Rebate 87A: ₹60,000 for taxable ≤₹12L.
- Old Regime: 0-2.5L=0%, 2.5-5L=5%, 5-10L=20%, >10L=30%. Std deduction ₹50K. Rebate 87A ₹12,500 for taxable ≤₹5L. Worth choosing ONLY if deductions (80C+80D+HRA+others) exceed ₹3.75L.
- ALWAYS use calculate_income_tax tool for any tax calculation.

**Investments:**
- Mutual Funds: Equity (large/mid/small/flexi-cap, ELSS), Debt (liquid/short/gilt), Hybrid. Direct plans > Regular by 0.5-1% per year.
- Fixed income: PPF (7.1%, EEE, 15yr), EPF (8.25%), NPS (market-linked, tax-efficient), FD (6.5-8%), SGBs.
- Crypto: 30% flat tax + 1% TDS. Max 5-10% portfolio only.
- Gold: 5-10% portfolio hedge. SGB > Gold ETF > Physical gold.

**Insurance:**
- Term insurance: 10-15x annual income. Pure term only, no ULIP/endowment.
- Health insurance: Minimum ₹5L cover, family floater ₹10-20L.

**Banking & Credit:**
- CIBIL score 750+ for best rates. Utilisation <30%. Pay full due, not minimum.
- Home loan: 8-9.5% (2025). EMI ≤40% income.
- Emergency fund: 3 months (govt), 6 months (private), 12 months (freelance).

**Tools available — use them proactively for ANY numbers:**
calculate_sip, calculate_emi, calculate_income_tax, calculate_savings_goal, budget_planner,
emergency_fund_calculator, debt_payoff_advisor, get_stock_data, search_financial_web,
calculate_ppf, calculate_fd_rd, calculate_hra_exemption, calculate_capital_gains_tax,
calculate_retirement_corpus, cibil_score_advisor

**TOOL USAGE RULES:**
- ALWAYS use tools for any specific number calculation — never guess or approximate.
- For stock prices: ALWAYS use get_stock_data (add .NS for NSE, .BO for BSE).
- For current RBI rates, budget news, MF NAVs: ALWAYS use search_financial_web.
- For tax: ALWAYS use calculate_income_tax.

**Format rules:**
- **Bold** key numbers. Use ₹ for all amounts. English only.
- Bullet lists for steps. ## headers for multi-section answers.
- End every answer with 1-2 specific actionable next steps.
- Warm, friendly, India-focused tone.

**INVESTMENT VISUALISATION RULE:**
When the user asks where/how to invest a specific amount, append an INVEST_VIZ block at the very end (after SUGGESTIONS):
INVEST_VIZ: {"amount": <number>, "monthly": <number>, "summary": "<one line>", "asset_allocation": [{"name": "Equity", "value": 70, "why": "Long-term growth"}, {"name": "Debt", "value": 20, "why": "Stability"}, {"name": "Gold", "value": 10, "why": "Hedge"}], "sector_allocation": [{"name": "Banking & Finance", "value": 25}, {"name": "IT & Technology", "value": 20}, {"name": "FMCG", "value": 15}, {"name": "Pharma", "value": 15}, {"name": "Energy", "value": 15}, {"name": "Consumer", "value": 10}]}
Adjust equity % for age: 18-30 = 80%; 31-45 = 60-70%; 46+ = 40-50%. Only emit for investment allocation questions.

**User Profile:** PROFILE_SECTION
**Emotion detected:** EMOTION (EMOTION_SCORE confidence)
- stressed → calm, reassuring, break into small steps
- confused → simple language, real examples, analogies
- excited → match energy, validate enthusiasm, add cautions
- sad/worried → acknowledge feeling first, then hope + action
- neutral → warm + professional

**Relevant Knowledge Context:**
CONTEXT

End every response with: SUGGESTIONS: <follow-up question 1> | <follow-up question 2> | <follow-up question 3>\
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
    trimmed_history = history[-6:] if len(history) > 6 else history

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
            max_tokens=700,
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

    history.append({"role": "user",      "content": user_message})
    history.append({"role": "assistant", "content": reply})

    return reply, agent_steps, suggestions
