"""
Financial calculation tools for the Finsight agentic advisor.

Plain Python functions — no LangChain. Called directly by the agent via
Groq's native function-calling API.

Tools:
  1.  calculate_sip               — SIP / mutual fund return projections
  2.  calculate_emi               — Loan EMI & total interest
  3.  calculate_income_tax        — Indian income tax FY 2025-26 (New & Old regime)
  4.  calculate_savings_goal      — Monthly savings needed to reach a goal
  5.  budget_planner              — 50/30/20 budget allocation
  6.  emergency_fund_calculator   — Emergency fund sizing by job type
  7.  debt_payoff_advisor         — Avalanche vs Snowball strategy
  8.  get_stock_data              — Real-time NSE/BSE stock prices via yfinance
  9.  search_financial_web        — DuckDuckGo financial web search
  10. calculate_ppf               — PPF maturity & tax-free returns
  11. calculate_fd_rd             — Fixed Deposit / Recurring Deposit maturity
  12. calculate_hra_exemption     — HRA exemption under old tax regime
  13. calculate_capital_gains_tax — LTCG/STCG on equity, debt, real estate, gold
  14. calculate_retirement_corpus — FIRE number & monthly SIP needed for retirement
  15. cibil_score_advisor         — CIBIL score improvement & credit health guidance
"""

import logging
import yfinance as yf
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)


# ── 1. SIP Calculator ──────────────────────────────────────────────────────────

def calculate_sip(monthly_amount: float, annual_return_percent: float, years: int) -> str:
    r = annual_return_percent / 100 / 12
    n = years * 12
    maturity = monthly_amount * ((((1 + r) ** n) - 1) / r) * (1 + r) if r != 0 else monthly_amount * n
    total_invested = monthly_amount * n
    profit = maturity - total_invested
    multiple = maturity / total_invested if total_invested > 0 else 1

    return (
        f"**SIP Returns Calculation**\n"
        f"- Monthly SIP: ₹{monthly_amount:,.0f}\n"
        f"- Duration: {years} years ({n} months)\n"
        f"- Expected Annual Return: {annual_return_percent}%\n"
        f"- Total Amount Invested: ₹{total_invested:,.0f}\n"
        f"- Estimated Profit (Returns): ₹{profit:,.0f}\n"
        f"- **Total Maturity Value: ₹{maturity:,.0f}**\n"
        f"- Wealth Multiplier: {multiple:.2f}x your investment\n"
        f"\n**Benchmark reference returns:**\n"
        f"- Large-cap equity funds: ~11-13% CAGR historically\n"
        f"- Mid-cap / small-cap funds: ~13-16% CAGR (higher risk)\n"
        f"- Balanced Advantage / Hybrid funds: ~9-11% CAGR\n"
        f"- Debt / Liquid funds: ~6-8% CAGR (low risk)\n"
    )


# ── 2. EMI Calculator ──────────────────────────────────────────────────────────

def calculate_emi(principal: float, annual_rate: float, years: int) -> str:
    r = annual_rate / 100 / 12
    n = years * 12
    emi = principal * r * ((1 + r) ** n) / (((1 + r) ** n) - 1) if r != 0 else principal / n
    total_payment = emi * n
    total_interest = total_payment - principal
    interest_pct = (total_interest / principal * 100) if principal > 0 else 0

    return (
        f"**EMI Calculation**\n"
        f"- Loan Amount (Principal): ₹{principal:,.0f}\n"
        f"- Interest Rate: {annual_rate}% per annum\n"
        f"- Tenure: {years} years ({n} months)\n"
        f"- **Monthly EMI: ₹{emi:,.0f}**\n"
        f"- Total Amount Payable: ₹{total_payment:,.0f}\n"
        f"- Total Interest Paid: ₹{total_interest:,.0f}\n"
        f"- Interest as % of Principal: {interest_pct:.1f}%\n"
        f"\n**Affordability check:** EMI should be ≤40% of your monthly take-home salary.\n"
        f"**Tip:** Making a prepayment of even ₹{principal * 0.05:,.0f} (5%) in year 1 "
        f"can save ₹{total_interest * 0.15:,.0f}+ in total interest.\n"
    )


# ── 3. Income Tax Calculator (FY 2025-26, Budget 2025) ────────────────────────

def calculate_income_tax(annual_income: float, regime: str = "new") -> str:
    if regime.lower() in ("new", "new regime", "new tax regime"):
        std_deduction = 75000
        taxable = max(0, annual_income - std_deduction)
        tax = 0
        slabs = [
            (400000, 0.00), (400000, 0.05), (400000, 0.10),
            (400000, 0.15), (400000, 0.20), (400000, 0.25),
            (float("inf"), 0.30),
        ]
        remaining = taxable
        for limit, rate in slabs:
            taxable_in_slab = min(remaining, limit)
            tax += taxable_in_slab * rate
            remaining -= taxable_in_slab
            if remaining <= 0:
                break
        rebate = min(tax, 60000) if taxable <= 1200000 else 0
        tax = max(0, tax - rebate)
        regime_label = "New Tax Regime (FY 2025-26, Budget 2025)"
        deduction_note = "₹75,000 standard deduction applied. ZERO tax if gross income ≤ ₹12,75,000."
        hint = "Switch to Old Regime only if 80C+80D+HRA+other deductions exceed ₹3.75 lakh."
    else:
        std_deduction = 50000
        taxable = max(0, annual_income - std_deduction)
        if taxable <= 250000:
            tax = 0
        elif taxable <= 500000:
            tax = (taxable - 250000) * 0.05
        elif taxable <= 1000000:
            tax = 12500 + (taxable - 500000) * 0.20
        else:
            tax = 112500 + (taxable - 1000000) * 0.30
        rebate = min(tax, 12500) if taxable <= 500000 else 0
        tax = max(0, tax - rebate)
        regime_label = "Old Tax Regime (FY 2025-26)"
        deduction_note = "Can claim 80C (₹1.5L), 80D (₹25K), HRA, LTA, 80CCD(1B) NPS ₹50K."
        hint = "Switch to New Regime if your total deductions are below ₹3.75 lakh."

    cess = tax * 0.04
    total_tax = tax + cess
    effective_rate = (total_tax / annual_income * 100) if annual_income > 0 else 0

    return (
        f"**Income Tax — {regime_label}**\n"
        f"- Annual Gross Income: ₹{annual_income:,.0f}\n"
        f"- Standard Deduction: ₹{std_deduction:,.0f}\n"
        f"- Net Taxable Income: ₹{taxable:,.0f}\n"
        f"- Basic Tax (before rebate & cess): ₹{tax + rebate:,.0f}\n"
        f"- Section 87A Rebate: ₹{rebate:,.0f}\n"
        f"- Tax after Rebate: ₹{tax:,.0f}\n"
        f"- Health & Education Cess (4%): ₹{cess:,.0f}\n"
        f"- **Total Tax Payable: ₹{total_tax:,.0f}**\n"
        f"- Effective Tax Rate: {effective_rate:.2f}%\n"
        f"- Monthly TDS (approx.): ₹{total_tax / 12:,.0f}\n"
        f"- Estimated Monthly In-hand: ₹{(annual_income - total_tax) / 12:,.0f}\n"
        f"- Note: {deduction_note}\n"
        f"- **Tip:** {hint}\n"
    )


# ── 4. Savings Goal Calculator ─────────────────────────────────────────────────

def calculate_savings_goal(
    target_amount: float,
    current_savings: float,
    annual_return: float,
    years: int,
) -> str:
    r = annual_return / 100 / 12
    n = years * 12
    fv_current = current_savings * ((1 + r) ** n) if r > 0 else current_savings
    remaining = target_amount - fv_current

    if remaining <= 0:
        return (
            f"Great news! Your current savings of ₹{current_savings:,.0f} will grow to "
            f"₹{fv_current:,.0f} in {years} years at {annual_return}% — "
            f"you've already met your ₹{target_amount:,.0f} goal!"
        )

    monthly_needed = remaining * r / (((1 + r) ** n) - 1) if r > 0 else remaining / n

    timeline_tip = (
        "Under 1 year: FD, Liquid Fund" if years <= 1 else
        "1-3 years: Debt MF, Short Duration Fund, RD" if years <= 3 else
        "3-5 years: Balanced Advantage, Hybrid Funds" if years <= 5 else
        "5+ years: Equity SIP (Flexi-cap, Index funds)"
    )

    return (
        f"**Savings Goal Calculator**\n"
        f"- Goal: ₹{target_amount:,.0f} in {years} years\n"
        f"- Current Savings: ₹{current_savings:,.0f} → grows to ₹{fv_current:,.0f}\n"
        f"- Remaining to Accumulate: ₹{remaining:,.0f}\n"
        f"- Expected Return: {annual_return}% per year\n"
        f"- **Monthly Savings Required: ₹{monthly_needed:,.0f}**\n"
        f"\n**Where to invest:** {timeline_tip}\n"
    )


# ── 5. Budget Planner ──────────────────────────────────────────────────────────

def budget_planner(monthly_income: float) -> str:
    needs   = monthly_income * 0.50
    wants   = monthly_income * 0.30
    savings = monthly_income * 0.20

    return (
        f"**Monthly Budget Plan — 50/30/20 Rule**\n"
        f"Monthly Take-Home: ₹{monthly_income:,.0f}\n\n"
        f"**NEEDS — 50% = ₹{needs:,.0f}**\n"
        f"- Rent / Home EMI: ₹{needs * 0.50:,.0f}\n"
        f"- Groceries & Food: ₹{needs * 0.25:,.0f}\n"
        f"- Utilities, Phone, Internet: ₹{needs * 0.15:,.0f}\n"
        f"- Transport & Fuel: ₹{needs * 0.10:,.0f}\n\n"
        f"**WANTS — 30% = ₹{wants:,.0f}**\n"
        f"- Dining out, entertainment, shopping, subscriptions\n\n"
        f"**SAVINGS & INVESTMENTS — 20% = ₹{savings:,.0f}**\n"
        f"- Emergency Fund (till 6 months built): ₹{savings * 0.40:,.0f}\n"
        f"- Equity SIP / Mutual Funds: ₹{savings * 0.35:,.0f}\n"
        f"- Goal-based savings (RD/FD): ₹{savings * 0.25:,.0f}\n\n"
        f"**Action**: Auto-transfer ₹{savings:,.0f} to a separate savings account on salary day.\n"
    )


# ── 6. Emergency Fund Calculator ──────────────────────────────────────────────

def emergency_fund_calculator(monthly_expenses: float, job_type: str = "private") -> str:
    months_map = {
        "government": 3, "govt": 3, "psu": 3,
        "private": 6, "mnc": 6, "salaried": 6,
        "freelance": 12, "startup": 12, "business": 12, "self-employed": 12,
    }
    months = months_map.get(job_type.lower().strip(), 6)
    target = monthly_expenses * months

    return (
        f"**Emergency Fund Calculator**\n"
        f"- Monthly Essential Expenses: ₹{monthly_expenses:,.0f}\n"
        f"- Job Type: {job_type.title()} → {months} months of buffer recommended\n"
        f"- **Target Emergency Fund: ₹{target:,.0f}**\n"
        f"- Build in 12 months: ₹{target / 12:,.0f}/month\n"
        f"- Build in 6 months: ₹{target / 6:,.0f}/month\n\n"
        f"**Where to keep it:**\n"
        f"- Liquid Mutual Fund (7-8% returns, 1-day withdrawal) — best option\n"
        f"- Sweep-in FD / Flexi FD at your bank\n"
        f"- High-yield savings account (Kotak/IDFC/RBL: ~6-7%)\n"
        f"- ⚠️ Do NOT invest in equity — must be accessible within 1 working day\n"
    )


# ── 7. Debt Payoff Advisor ─────────────────────────────────────────────────────

def debt_payoff_advisor(
    total_debt: float,
    highest_interest_name: str,
    highest_interest_rate: float,
    smallest_debt_amount: float,
    smallest_debt_rate: float,
) -> str:
    monthly_interest_cost = total_debt * (highest_interest_rate / 100 / 12)
    annual_interest_waste = monthly_interest_cost * 12

    return (
        f"**Debt Payoff Strategy Analysis**\n"
        f"- Total Debt: ₹{total_debt:,.0f}\n"
        f"- Est. Monthly Interest Cost: ₹{monthly_interest_cost:,.0f}\n"
        f"- Est. Annual Interest Wasted: ₹{annual_interest_waste:,.0f}\n\n"
        f"**Option 1: Avalanche Method (Mathematically optimal)**\n"
        f"Pay minimums on all debts. Put ALL extra money on the highest-interest debt first.\n"
        f"- Priority: {highest_interest_name} at {highest_interest_rate}%\n"
        f"- Saves the most money in interest over time\n\n"
        f"**Option 2: Snowball Method (Psychological momentum)**\n"
        f"Pay off smallest debt first (₹{smallest_debt_amount:,.0f} at {smallest_debt_rate}%).\n"
        f"- Creates quick wins that keep you motivated\n\n"
        f"**Recommendation**: Use **Avalanche** — saves ₹{annual_interest_waste * 0.3:,.0f}+ per year.\n"
        f"**Critical rule:** Never let credit card dues roll over — 36-42% interest destroys wealth.\n"
    )


# ── 8. Real-time Market & Stock Data ──────────────────────────────────────────

def get_stock_data(ticker_symbol: str) -> str:
    try:
        stock = yf.Ticker(ticker_symbol)
        info = stock.info
        current_price = info.get("currentPrice", info.get("regularMarketPrice", "N/A"))
        prev_close    = info.get("previousClose", "N/A")
        market_cap    = info.get("marketCap", "N/A")
        pe_ratio      = info.get("trailingPE", "N/A")
        pb_ratio      = info.get("priceToBook", "N/A")
        high52        = info.get("fiftyTwoWeekHigh", "N/A")
        low52         = info.get("fiftyTwoWeekLow", "N/A")
        div_yield     = info.get("dividendYield", "N/A")
        recommendation= info.get("recommendationKey", "N/A")
        beta          = info.get("beta", "N/A")
        eps           = info.get("trailingEps", "N/A")

        is_indian = ticker_symbol.endswith(".NS") or ticker_symbol.endswith(".BO")
        currency = "₹" if is_indian else "$"

        if isinstance(market_cap, (int, float)):
            mc_str = f"₹{market_cap / 10000000:,.2f} Cr" if is_indian else f"${market_cap / 1e9:,.2f} B"
        else:
            mc_str = str(market_cap)

        return (
            f"**Stock Data for {ticker_symbol}**\n"
            f"- Current Price: {currency}{current_price}\n"
            f"- Previous Close: {currency}{prev_close}\n"
            f"- Market Cap: {mc_str}\n"
            f"- P/E Ratio: {pe_ratio:.1f if isinstance(pe_ratio, float) else pe_ratio} | "
            f"P/B Ratio: {pb_ratio:.1f if isinstance(pb_ratio, float) else pb_ratio}\n"
            f"- EPS (TTM): {currency}{eps:.2f if isinstance(eps, float) else eps}\n"
            f"- 52-Week High/Low: {currency}{high52} / {currency}{low52}\n"
            f"- Dividend Yield: {f'{div_yield * 100:.2f}%' if isinstance(div_yield, float) else div_yield}\n"
            f"- Beta: {f'{beta:.2f}' if isinstance(beta, float) else beta}\n"
            f"- Analyst Consensus: {str(recommendation).title().replace('_', ' ')}\n"
            f"\n⚠️ *Always do your own research before investing.*\n"
        )
    except Exception as e:
        logger.error(f"yfinance error for {ticker_symbol}: {e}")
        return f"Could not fetch data for {ticker_symbol}. Try 'RELIANCE.NS' (NSE) or 'RELIANCE.BO' (BSE)."


# ── 9. Financial Web Search ────────────────────────────────────────────────────

def search_financial_web(query: str) -> str:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=4))
        if not results:
            return f"No results found for: {query}"
        lines = [f"- {r['title']}: {r['body']}" for r in results]
        return f"**Web Search Results for '{query}'**\n" + "\n".join(lines)
    except Exception as e:
        logger.error(f"DuckDuckGo search error: {e}")
        return f"Search unavailable for: {query}. Please try a different query."


# ── 10. PPF Calculator ─────────────────────────────────────────────────────────

def calculate_ppf(annual_contribution: float, years: int = 15, interest_rate: float = 7.1) -> str:
    note = ""
    if annual_contribution > 150000:
        note = "⚠️ PPF annual limit is ₹1,50,000. Capped at ₹1,50,000/year."
        annual_contribution = 150000

    rate = interest_rate / 100
    balance = 0
    for _ in range(years):
        balance = (balance + annual_contribution) * (1 + rate)

    total_invested = annual_contribution * years
    interest_earned = balance - total_invested

    return (
        f"**PPF Calculator (EEE — Exempt-Exempt-Exempt)**\n"
        f"- Annual Contribution: ₹{annual_contribution:,.0f}/year\n"
        f"- Duration: {years} years\n"
        f"- Current PPF Rate: {interest_rate}%\n"
        f"- Total Invested: ₹{total_invested:,.0f}\n"
        f"- Interest Earned: ₹{interest_earned:,.0f} (100% tax-free)\n"
        f"- **Maturity Value: ₹{balance:,.0f}** (completely tax-free)\n"
        f"- Max 80C Tax Saving/year: ₹{min(annual_contribution, 150000) * 0.30:,.0f} (at 30% slab)\n"
        f"{note}\n\n"
        f"**PPF Key Facts:**\n"
        f"- Lock-in: 15 years (extend in 5-year blocks)\n"
        f"- Partial withdrawal: Allowed from Year 7 onwards\n"
        f"- Zero risk: Backed by Government of India\n"
        f"- EEE status: Contribution, interest, and maturity are ALL tax-free\n"
    )


# ── 11. FD/RD Calculator ──────────────────────────────────────────────────────

def calculate_fd_rd(
    principal: float,
    annual_rate: float,
    years: int,
    is_rd: bool = False,
    compounding: str = "quarterly",
) -> str:
    n_map = {"quarterly": 4, "monthly": 12, "annually": 1, "half-yearly": 2}
    n = n_map.get(compounding.lower(), 4)
    r = annual_rate / 100

    if not is_rd:
        maturity = principal * ((1 + r / n) ** (n * years))
        interest = maturity - principal
        deposit_type = "Fixed Deposit (FD)"
        invested_str = f"Lump Sum Deposit: ₹{principal:,.0f}"
        effective_yield = ((maturity / principal) ** (1 / years) - 1) * 100
    else:
        months = years * 12
        monthly_rate = r / 12
        maturity = sum(principal * ((1 + monthly_rate) ** (months - m + 1)) for m in range(1, months + 1))
        total_invested = principal * months
        interest = maturity - total_invested
        deposit_type = "Recurring Deposit (RD)"
        invested_str = f"Monthly Deposit: ₹{principal:,.0f} | Total Invested: ₹{total_invested:,.0f}"
        effective_yield = annual_rate

    return (
        f"**{deposit_type} Calculator**\n"
        f"- {invested_str}\n"
        f"- Annual Interest Rate: {annual_rate}% ({compounding} compounding)\n"
        f"- Duration: {years} years\n"
        f"- Interest Earned: ₹{interest:,.0f}\n"
        f"- **Maturity Value: ₹{maturity:,.0f}**\n"
        f"- Effective Annual Yield: {effective_yield:.2f}%\n\n"
        f"**Tax note:**\n"
        f"- TDS @ 10% deducted if interest > ₹40,000/year (₹50K for seniors)\n"
        f"- Interest is added to income and taxed at your slab rate\n"
        f"- Submit Form 15G/15H to avoid TDS if income < basic exemption\n\n"
        f"**FD rates (2025):** SBI: 6.5-7.1% | HDFC: 6.6-7.25% | Small Finance Banks: 8-9%\n"
    )


# ── 12. HRA Exemption Calculator ──────────────────────────────────────────────

def calculate_hra_exemption(
    basic_salary: float,
    hra_received: float,
    actual_rent_paid: float,
    city_type: str = "metro",
) -> str:
    pct = 0.50 if city_type.lower() in ("metro", "metropolitan") else 0.40
    city_label = "Metro (Delhi/Mumbai/Kolkata/Chennai)" if pct == 0.50 else "Non-Metro"
    a = hra_received
    b = basic_salary * pct
    c = max(0, actual_rent_paid - basic_salary * 0.10)
    exemption = min(a, b, c)
    taxable_hra = hra_received - exemption

    return (
        f"**HRA Exemption Calculator (Old Tax Regime)**\n"
        f"- Annual Basic Salary: ₹{basic_salary:,.0f}\n"
        f"- Annual HRA Received: ₹{hra_received:,.0f}\n"
        f"- Annual Rent Paid: ₹{actual_rent_paid:,.0f}\n"
        f"- City Type: {city_label}\n\n"
        f"**3-Part HRA Exemption Test (minimum of these 3):**\n"
        f"- (a) Actual HRA received: ₹{a:,.0f}\n"
        f"- (b) {int(pct*100)}% of Basic Salary: ₹{b:,.0f}\n"
        f"- (c) Rent paid – 10% of Basic: ₹{c:,.0f}\n\n"
        f"- **HRA Exemption (tax-free): ₹{exemption:,.0f}**\n"
        f"- Taxable HRA portion: ₹{taxable_hra:,.0f}\n\n"
        f"**Important:** HRA exemption is ONLY available under the Old Tax Regime.\n"
        f"If annual rent > ₹1,00,000, landlord's PAN is mandatory.\n"
    )


# ── 13. Capital Gains Tax Calculator ──────────────────────────────────────────

def calculate_capital_gains_tax(
    asset_type: str,
    purchase_price: float,
    sale_price: float,
    holding_years: float,
) -> str:
    gain = sale_price - purchase_price
    if gain <= 0:
        return (
            f"**Capital Gains Tax**\n"
            f"- Purchase Price: ₹{purchase_price:,.0f}\n"
            f"- Sale Price: ₹{sale_price:,.0f}\n"
            f"- Result: **Capital Loss of ₹{abs(gain):,.0f}**\n"
            f"- Losses can be carried forward for 8 years.\n"
        )

    asset = asset_type.lower().strip()
    tax = None
    exempt = 0

    if asset in ("equity", "elss"):
        if holding_years >= 1.0:
            gain_type, taxable_gain = "LTCG", max(0, gain - 125000)
            tax = taxable_gain * 0.125
            exempt = 125000
            note = "LTCG on listed equity/equity MF: 12.5% on gains > ₹1.25L (Budget 2024)."
        else:
            gain_type, taxable_gain = "STCG", gain
            tax = gain * 0.20
            note = "STCG on listed equity/equity MF: flat 20% (Budget 2024)."

    elif asset == "debt":
        gain_type = "STCG" if holding_years < 2.0 else "LTCG"
        taxable_gain = gain
        note = "Debt MF gains taxed at your income tax slab rate (Finance Act 2023)."

    elif asset == "real_estate":
        if holding_years >= 2.0:
            gain_type, taxable_gain = "LTCG", gain
            tax = gain * 0.125
            note = "LTCG on real estate: 12.5% WITHOUT indexation (Budget 2024). Sec 54/54EC exemptions apply."
        else:
            gain_type, taxable_gain = "STCG", gain
            note = "STCG on real estate: taxed at your income tax slab rate."

    elif asset == "gold":
        if holding_years >= 2.0:
            gain_type, taxable_gain = "LTCG", gain
            tax = gain * 0.125
            note = "LTCG on gold: 12.5% (Budget 2024). SGB redemption at maturity is tax-free."
        else:
            gain_type, taxable_gain = "STCG", gain
            note = "STCG on gold: taxed at your income tax slab rate."
    else:
        return f"Unknown asset type '{asset_type}'. Use: equity, debt, real_estate, gold, or elss."

    result = (
        f"**Capital Gains Tax — {asset_type.title()}**\n"
        f"- Purchase: ₹{purchase_price:,.0f} | Sale: ₹{sale_price:,.0f} | Gain: ₹{gain:,.0f}\n"
        f"- Holding Period: {holding_years:.1f} years → **{gain_type}**\n"
    )
    if tax is not None:
        cess = tax * 0.04
        total_tax = tax + cess
        result += (
            f"- Exempt Amount: ₹{exempt:,.0f}\n"
            f"- Taxable Gain: ₹{taxable_gain:,.0f}\n"
            f"- **Total Tax Payable: ₹{total_tax:,.0f}**\n"
            f"- Net Profit after tax: ₹{gain - total_tax:,.0f}\n"
        )
    else:
        result += "- Tax: **Added to income and taxed at your slab rate**\n"
    result += f"\n**Note:** {note}\n"
    return result


# ── 14. Retirement Corpus Calculator ──────────────────────────────────────────

def calculate_retirement_corpus(
    current_age: int,
    retirement_age: int,
    monthly_expenses: float,
    inflation_rate: float = 6.0,
    post_retirement_return: float = 7.0,
    pre_retirement_return: float = 12.0,
    current_savings: float = 0.0,
) -> str:
    years_to_retire = retirement_age - current_age
    if years_to_retire <= 0:
        return "Retirement age must be greater than current age."

    life_expectancy = 85
    years_in_retirement = life_expectancy - retirement_age
    future_monthly_expenses = monthly_expenses * ((1 + inflation_rate / 100) ** years_to_retire)
    future_annual_expenses = future_monthly_expenses * 12
    r_post = post_retirement_return / 100
    corpus_needed = (
        future_annual_expenses * ((1 - (1 + r_post) ** (-years_in_retirement)) / r_post)
        if r_post > 0 else future_annual_expenses * years_in_retirement
    )
    fv_current_savings = current_savings * ((1 + pre_retirement_return / 100) ** years_to_retire)
    remaining_corpus = max(0, corpus_needed - fv_current_savings)
    r_pre = pre_retirement_return / 100 / 12
    n_pre = years_to_retire * 12
    monthly_sip = (
        remaining_corpus * r_pre / (((1 + r_pre) ** n_pre) - 1)
        if r_pre > 0 and remaining_corpus > 0 else
        remaining_corpus / n_pre if remaining_corpus > 0 else 0
    )

    return (
        f"**Retirement Corpus Calculator**\n"
        f"- Current Age: {current_age} | Retirement Age: {retirement_age} | Life Expectancy: {life_expectancy}\n"
        f"- Years to Retire: {years_to_retire} | Years in Retirement: {years_in_retirement}\n"
        f"- Current Monthly Expenses: ₹{monthly_expenses:,.0f}\n"
        f"- Inflation-adjusted expenses at retirement: ₹{future_monthly_expenses:,.0f}/month\n\n"
        f"- **Corpus Needed at Retirement: ₹{corpus_needed:,.0f}**\n"
        f"  (25x Rule cross-check: ₹{future_annual_expenses * 25:,.0f})\n"
        f"- Current Savings (future value): ₹{fv_current_savings:,.0f}\n"
        f"- Remaining Corpus to Build: ₹{remaining_corpus:,.0f}\n\n"
        f"- **Monthly SIP Required: ₹{monthly_sip:,.0f}/month** (at {pre_retirement_return}% return)\n\n"
        f"**Recommended portfolio:**\n"
        f"- Accumulation phase ({years_to_retire} yrs): 70-80% equity, 20-30% debt\n"
        f"- Distribution phase: NPS annuity + SWP from Mutual Funds\n"
    )


# ── 15. CIBIL Score Advisor ────────────────────────────────────────────────────

def cibil_score_advisor(cibil_score: int) -> str:
    if cibil_score >= 750:
        status = "Excellent"
        summary = "You qualify for the best loan interest rates."
        actions = [
            "Keep credit utilisation below 30%",
            "Pay ALL bills on time — one missed payment drops score by 50-100 points",
            "Don't apply for too many credit products at once",
            "Keep your oldest credit card active — credit age matters",
        ]
    elif cibil_score >= 700:
        status = "Good"
        summary = "You'll get loans but may not always get the best rates."
        actions = [
            "Reduce credit card utilisation below 30%",
            "Pay all EMIs and bills on time — set auto-pay",
            "Dispute incorrect entries on your CIBIL report",
            "In 6-12 months of discipline, you can reach 750+",
        ]
    elif cibil_score >= 650:
        status = "Fair"
        summary = "Loans possible but at higher interest rates (1-3% more)."
        actions = [
            "Clear all overdue payments immediately",
            "Bring credit card utilisation below 30%",
            "Check CIBIL report for errors — wrong info is common",
            "Consider a secured credit card (against FD) to rebuild credit",
            "It takes 12-18 months of good behaviour to improve significantly",
        ]
    else:
        status = "Poor"
        summary = "Loan rejection or very high rates likely. Urgent repair needed."
        actions = [
            "Pay off all overdue/NPA accounts immediately",
            "Get a secured credit card against an FD (₹20,000 FD → ₹20,000 limit)",
            "Use secured card for small purchases, pay FULL amount before due date",
            "Never use more than 10-20% of credit limit while rebuilding",
            "Score below 600 typically means 18-24 months to repair",
        ]

    actions_str = "\n".join(f"  {i+1}. {a}" for i, a in enumerate(actions))
    return (
        f"**CIBIL Score Analysis**\n"
        f"- Your Score: {cibil_score}/900 — **{status}**\n"
        f"- Summary: {summary}\n\n"
        f"**Action Plan:**\n{actions_str}\n\n"
        f"**Score Factors:** Payment History 35% | Utilisation 30% | Credit Age 15% | Mix 10% | Enquiries 10%\n"
        f"**Free check:** Paisabazaar, BankBazaar, or CIBIL.com (1 free/year)\n"
    )


# ── Tool dispatch ──────────────────────────────────────────────────────────────

_TOOL_FUNCTIONS = {
    "calculate_sip":               calculate_sip,
    "calculate_emi":               calculate_emi,
    "calculate_income_tax":        calculate_income_tax,
    "calculate_savings_goal":      calculate_savings_goal,
    "budget_planner":              budget_planner,
    "emergency_fund_calculator":   emergency_fund_calculator,
    "debt_payoff_advisor":         debt_payoff_advisor,
    "get_stock_data":              get_stock_data,
    "search_financial_web":        search_financial_web,
    "calculate_ppf":               calculate_ppf,
    "calculate_fd_rd":             calculate_fd_rd,
    "calculate_hra_exemption":     calculate_hra_exemption,
    "calculate_capital_gains_tax": calculate_capital_gains_tax,
    "calculate_retirement_corpus": calculate_retirement_corpus,
    "cibil_score_advisor":         cibil_score_advisor,
}


def execute_tool(name: str, args: dict) -> str:
    fn = _TOOL_FUNCTIONS.get(name)
    if fn is None:
        return f"Unknown tool: {name}"
    try:
        return fn(**args)
    except Exception as e:
        logger.error(f"Tool execution error ({name}): {e}")
        return f"Calculation error in {name}: {e}"


# ── Groq-format tool schemas ───────────────────────────────────────────────────

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "calculate_sip",
            "description": "Calculate returns from a Systematic Investment Plan (SIP). Use for SIP return projections, monthly investment growth, mutual fund corpus.",
            "parameters": {
                "type": "object",
                "properties": {
                    "monthly_amount":        {"type": "number", "description": "Monthly SIP amount in INR"},
                    "annual_return_percent": {"type": "number", "description": "Expected annual return % (12 for equity, 7 for debt)"},
                    "years":                 {"type": "integer", "description": "Investment duration in years"},
                },
                "required": ["monthly_amount", "annual_return_percent", "years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_emi",
            "description": "Calculate monthly EMI for any loan (home, car, personal, education). Use for EMI amounts, loan affordability, total interest.",
            "parameters": {
                "type": "object",
                "properties": {
                    "principal":    {"type": "number",  "description": "Loan amount in INR"},
                    "annual_rate":  {"type": "number",  "description": "Annual interest rate %"},
                    "years":        {"type": "integer", "description": "Loan tenure in years"},
                },
                "required": ["principal", "annual_rate", "years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_income_tax",
            "description": "Calculate Indian income tax for FY 2025-26. Use for any tax calculation, TDS, regime comparison, ITR filing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "annual_income": {"type": "number", "description": "Annual gross income in INR"},
                    "regime":        {"type": "string", "description": "'new' (default) or 'old'"},
                },
                "required": ["annual_income"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_savings_goal",
            "description": "Calculate monthly savings needed to reach a financial goal (car, vacation, house down payment, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_amount":    {"type": "number",  "description": "Goal amount in INR"},
                    "current_savings":  {"type": "number",  "description": "Amount already saved"},
                    "annual_return":    {"type": "number",  "description": "Expected annual return %"},
                    "years":            {"type": "integer", "description": "Time available in years"},
                },
                "required": ["target_amount", "current_savings", "annual_return", "years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "budget_planner",
            "description": "Create a personalised monthly budget using the 50/30/20 rule.",
            "parameters": {
                "type": "object",
                "properties": {
                    "monthly_income": {"type": "number", "description": "Monthly take-home salary in INR (after tax)"},
                },
                "required": ["monthly_income"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "emergency_fund_calculator",
            "description": "Calculate emergency fund size based on monthly expenses and job type.",
            "parameters": {
                "type": "object",
                "properties": {
                    "monthly_expenses": {"type": "number", "description": "Monthly essential expenses in INR"},
                    "job_type":         {"type": "string", "description": "'government', 'private', 'freelance', 'startup', or 'business'"},
                },
                "required": ["monthly_expenses"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "debt_payoff_advisor",
            "description": "Compare Avalanche vs Snowball debt payoff strategies for multiple loans.",
            "parameters": {
                "type": "object",
                "properties": {
                    "total_debt":              {"type": "number", "description": "Total outstanding debt in INR"},
                    "highest_interest_name":   {"type": "string", "description": "Name of highest interest debt (e.g. 'credit card')"},
                    "highest_interest_rate":   {"type": "number", "description": "Interest rate of that highest debt (e.g. 36)"},
                    "smallest_debt_amount":    {"type": "number", "description": "Balance of the smallest debt in INR"},
                    "smallest_debt_rate":      {"type": "number", "description": "Interest rate of the smallest debt"},
                },
                "required": ["total_debt", "highest_interest_name", "highest_interest_rate", "smallest_debt_amount", "smallest_debt_rate"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_data",
            "description": "Fetch real-time stock price and statistics. For Indian stocks append '.NS' (NSE) or '.BO' (BSE) to ticker.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker_symbol": {"type": "string", "description": "Stock ticker e.g. 'RELIANCE.NS', 'TCS.NS', 'AAPL'"},
                },
                "required": ["ticker_symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_financial_web",
            "description": "Search the web for current financial news, RBI rates, MF NAVs, SEBI rules, budget announcements.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Specific search query e.g. 'RBI repo rate April 2025'"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_ppf",
            "description": "Calculate PPF maturity value and tax benefits (EEE status, Section 80C).",
            "parameters": {
                "type": "object",
                "properties": {
                    "annual_contribution": {"type": "number",  "description": "Amount invested per year in INR (max ₹1,50,000)"},
                    "years":               {"type": "integer", "description": "Duration in years (minimum 15)"},
                    "interest_rate":       {"type": "number",  "description": "PPF rate % (default 7.1)"},
                },
                "required": ["annual_contribution"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_fd_rd",
            "description": "Calculate Fixed Deposit (FD) or Recurring Deposit (RD) maturity and tax implications.",
            "parameters": {
                "type": "object",
                "properties": {
                    "principal":   {"type": "number",  "description": "For FD: lump sum. For RD: monthly deposit (INR)"},
                    "annual_rate": {"type": "number",  "description": "Annual interest rate %"},
                    "years":       {"type": "integer", "description": "Duration in years"},
                    "is_rd":       {"type": "boolean", "description": "False for FD (default), True for RD"},
                    "compounding": {"type": "string",  "description": "'quarterly' (default), 'monthly', or 'annually'"},
                },
                "required": ["principal", "annual_rate", "years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_hra_exemption",
            "description": "Calculate HRA tax exemption under old tax regime.",
            "parameters": {
                "type": "object",
                "properties": {
                    "basic_salary":      {"type": "number", "description": "Annual basic salary in INR"},
                    "hra_received":      {"type": "number", "description": "Annual HRA received from employer in INR"},
                    "actual_rent_paid":  {"type": "number", "description": "Annual rent actually paid in INR"},
                    "city_type":         {"type": "string", "description": "'metro' (Delhi/Mumbai/Kolkata/Chennai) or 'non-metro'"},
                },
                "required": ["basic_salary", "hra_received", "actual_rent_paid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_capital_gains_tax",
            "description": "Calculate capital gains tax on equity, debt MF, real estate, or gold.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_type":     {"type": "string", "description": "'equity', 'debt', 'real_estate', 'gold', or 'elss'"},
                    "purchase_price": {"type": "number", "description": "Original purchase cost in INR"},
                    "sale_price":     {"type": "number", "description": "Selling price in INR"},
                    "holding_years":  {"type": "number", "description": "Number of years held (e.g. 2.5)"},
                },
                "required": ["asset_type", "purchase_price", "sale_price", "holding_years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_retirement_corpus",
            "description": "Calculate retirement corpus needed (FIRE number) and monthly SIP required.",
            "parameters": {
                "type": "object",
                "properties": {
                    "current_age":              {"type": "integer", "description": "Current age in years"},
                    "retirement_age":           {"type": "integer", "description": "Target retirement age"},
                    "monthly_expenses":         {"type": "number",  "description": "Current monthly expenses in INR"},
                    "inflation_rate":           {"type": "number",  "description": "Expected annual inflation % (default 6)"},
                    "post_retirement_return":   {"type": "number",  "description": "Post-retirement return % (default 7)"},
                    "pre_retirement_return":    {"type": "number",  "description": "Pre-retirement investment return % (default 12)"},
                    "current_savings":          {"type": "number",  "description": "Current savings/investments in INR (default 0)"},
                },
                "required": ["current_age", "retirement_age", "monthly_expenses"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cibil_score_advisor",
            "description": "Give CIBIL score analysis and personalised credit improvement advice.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cibil_score": {"type": "integer", "description": "Current CIBIL score (300-900)"},
                },
                "required": ["cibil_score"],
            },
        },
    },
]
