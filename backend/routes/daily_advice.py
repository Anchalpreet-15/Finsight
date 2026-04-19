"""
Daily Financial Advice endpoint.
GET /api/daily-advice — Returns a short, current-affairs-driven financial tip.
Cached in-process per calendar day (IST).
"""

import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from groq import Groq

from ai.financial_tools import search_financial_web

logger = logging.getLogger(__name__)
router = APIRouter(tags=["advice"])

_cache: dict[str, str] = {}

_SYSTEM = """\
You are Finsight, India's AI finance advisor. Write ONE concise daily financial tip (2–3 sentences).

Rules:
- Ground it in TODAY's economic/market reality (RBI, Nifty, rupee, inflation, global events).
- Give a concrete single action the reader can take TODAY.
- Use ₹ for amounts. India-focused. No bullet points — flowing text only.
- Format strictly: [Tip]. Today's action: [specific step].
"""

_FALLBACKS = [
    "With global uncertainty pushing gold to record highs, having 5–10% of your portfolio in Sovereign Gold Bonds is smart protection. Today's action: Check SGB open dates on RBI's website and set a calendar reminder.",
    "RBI's rate pause signals borrowing costs may stay elevated — floating-rate loan holders should consider part-prepayment. Today's action: Log in to your bank app and check how much prepayment reduces your remaining tenure.",
    "Rupee depreciation quietly erodes import-heavy portfolios. Diversify with international index funds via Motilal Oswal or Navi. Today's action: Allocate 10% of next month's SIP towards a US or global ETF.",
    "With inflation still above 4%, a savings account earning 3% means you're losing real wealth every month. Today's action: Move your idle savings to a liquid mutual fund — Parag Parikh Liquid or SBI Liquid fund offer ~7%.",
    "US Fed signals and FII outflows are creating short-term Nifty volatility — ideal for SIP investors, not panic sellers. Today's action: Do NOT stop your SIP. Add a top-up SIP of ₹500 to capitalize on lower NAVs.",
    "New tax regime removes many deductions but lowers rates for income up to ₹15L. Most salaried employees now save more under it. Today's action: Use the Income Tax Department's e-filing portal to compare both regimes for FY 2025-26.",
    "Rising credit card delinquencies signal household stress — the avalanche method saves the most interest. Today's action: List all debts by interest rate and make a minimum-plus-extra payment on the highest-rate card this month.",
    "EPF earns 8.25% tax-free — higher than most FDs and fully guaranteed. Today's action: Check your EPF passbook on the EPFO member portal and verify your employer's contributions are up to date.",
    "Term insurance premiums rise ~8% with age each year you delay. ₹1 Cr cover for a 28-year-old costs ~₹8,000/yr vs ₹14,000 at 35. Today's action: Get quotes on PolicyBazaar or Ditto Insurance today — don't delay this purchase.",
    "Budget 2025 raised the LTCG exemption limit to ₹1.25L on equity. Smart tax-loss harvesting before March 31 can offset gains. Today's action: Review unrealised losses in your portfolio and book them before year-end.",
    "With IT sector layoffs in the news, a 6-month emergency fund is not optional. Today's action: Calculate your monthly expenses and open a separate savings account or liquid fund earmarked only for emergencies.",
    "SEBI's new mutual fund categorisation means expense ratios on direct plans are 0.5–1% lower than regular. Today's action: Switch one of your regular-plan SIPs to the direct plan equivalent via MF Utilities or Kuvera.",
    "Small-cap indices are up 40%+ in 2 years — valuations are stretched. Rebalance to avoid overexposure. Today's action: If small-caps exceed 20% of your equity portfolio, redirect the next SIP to a large-cap or flexi-cap fund.",
    "Health insurance premium hikes of 20–30% are expected in 2025. Lock in your coverage before renewal. Today's action: Review your current health cover — if under ₹10L, add a super top-up policy.",
]


def _fallback(date_str: str) -> str:
    try:
        doy = datetime.strptime(date_str, "%Y-%m-%d").timetuple().tm_yday
        return _FALLBACKS[doy % len(_FALLBACKS)]
    except Exception:
        return _FALLBACKS[0]


def _generate(date_str: str) -> str:
    if date_str in _cache:
        return _cache[date_str]

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        result = _fallback(date_str)
        _cache[date_str] = result
        return result

    try:
        news_raw = search_financial_web(query=f"India finance market RBI economy news {date_str}")
        news_snippet = str(news_raw)[:900]
    except Exception as exc:
        logger.warning(f"Web search for daily advice failed: {exc}")
        news_snippet = "No live news available."

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": _SYSTEM},
                {
                    "role": "user",
                    "content": f"Date: {date_str}\nCurrent news context:\n{news_snippet}\n\nGenerate today's financial tip.",
                },
            ],
            temperature=0.55,
            max_tokens=160,
        )
        advice = response.choices[0].message.content.strip()
        if len(advice) < 40:
            raise ValueError("Response too short.")
    except Exception as exc:
        logger.error(f"Daily advice LLM call failed: {exc}")
        advice = _fallback(date_str)

    _cache[date_str] = advice
    return advice


@router.get("/daily-advice")
async def get_daily_advice():
    """Return today's financial advice (cached per calendar day, IST)."""
    ist = ZoneInfo("Asia/Kolkata")
    today = datetime.now(ist).strftime("%Y-%m-%d")
    advice = _generate(today)
    return {"date": today, "advice": advice}
