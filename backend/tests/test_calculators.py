"""
Unit tests for the pure-function financial calculators.

Run from the repo root with:
    cd backend && pytest -q
"""

import re

import pytest

from ai.financial_tools import (
    calculate_sip,
    calculate_emi,
    calculate_income_tax,
    calculate_savings_goal,
    emergency_fund_calculator,
    calculate_ppf,
    calculate_fd_rd,
    calculate_hra_exemption,
    calculate_capital_gains_tax,
    calculate_retirement_corpus,
)


def _amount(text: str, label: str) -> float:
    """Pull the number that follows '<label>: ₹' in a tool's markdown output."""
    m = re.search(rf"{re.escape(label)}:\s*₹\s*([\d,]+)", text)
    assert m, f"Could not find '{label}:' in output:\n{text[:400]}"
    return float(m.group(1).replace(",", ""))


def _all_amounts(text: str) -> list[float]:
    return [float(x.replace(",", "")) for x in re.findall(r"₹\s*([\d,]+)", text)]


# ── SIP ───────────────────────────────────────────────────────────────────────

def test_sip_zero_return_equals_sum_of_installments():
    out = calculate_sip(monthly_amount=10_000, annual_return_percent=0, years=1)
    assert _amount(out, "Total Amount Invested") == 120_000
    assert abs(_amount(out, "Total Maturity Value") - 120_000) < 1


def test_sip_positive_return_beats_principal():
    out = calculate_sip(monthly_amount=5_000, annual_return_percent=12, years=10)
    invested = _amount(out, "Total Amount Invested")
    maturity = _amount(out, "Total Maturity Value")
    assert invested == 600_000
    # 12% CAGR SIP over 10y lands ~₹11.6L; permissive sanity bands.
    assert 1_100_000 < maturity < 1_300_000


# ── EMI ───────────────────────────────────────────────────────────────────────

def test_emi_matches_standard_formula():
    # ₹10,00,000 @ 10% for 10 years → EMI ≈ ₹13,215
    out = calculate_emi(principal=1_000_000, annual_rate=10, years=10)
    emi = _amount(out, "Monthly EMI")
    assert 13_100 < emi < 13_300


def test_emi_zero_rate_is_principal_over_months():
    out = calculate_emi(principal=120_000, annual_rate=0, years=1)
    assert _amount(out, "Monthly EMI") == 10_000


# ── Income tax (FY 2025-26, New Regime) ───────────────────────────────────────

def test_new_regime_zero_tax_under_rebate_ceiling():
    # ₹12.75L salary → ₹12L taxable → 87A rebate zeros the tax.
    out = calculate_income_tax(annual_income=12_75_000, regime="new")
    # The output should contain "₹0" somewhere as the final tax.
    assert re.search(r"Tax[^₹\n]*₹\s*0\b", out), \
        f"Expected zero-tax marker in output:\n{out}"


def test_new_regime_tax_rises_above_rebate_ceiling():
    out = calculate_income_tax(annual_income=15_00_000, regime="new")
    # At ₹15L gross → ~₹14.25L taxable → tax is clearly non-zero.
    amounts = _all_amounts(out)
    assert any(a > 10_000 for a in amounts), \
        f"Expected a non-trivial tax figure at ₹15L, got:\n{out}"


# ── Savings goal ──────────────────────────────────────────────────────────────

def test_savings_goal_runs_and_mentions_goal_amount():
    out = calculate_savings_goal(
        target_amount=100_000,
        current_savings=0,
        annual_return=0,
        years=1,
    )
    # At 0% return, 12 months → ~₹8,333/month. We just check the number appears somewhere.
    assert "₹" in out
    assert "100,000" in out or "1,00,000" in out


# ── Emergency fund ────────────────────────────────────────────────────────────

@pytest.mark.parametrize("job_type,multiplier_low,multiplier_high", [
    ("government",  2.5, 3.5),
    ("private",     5.5, 6.5),
    ("freelancer", 11.5, 12.5),
])
def test_emergency_fund_scales_with_job_type(job_type, multiplier_low, multiplier_high):
    expenses = 40_000
    out = emergency_fund_calculator(monthly_expenses=expenses, job_type=job_type)
    amounts = _all_amounts(out)
    assert amounts, f"No ₹ amounts in emergency-fund output for {job_type}:\n{out}"
    corpus = max(amounts)
    assert expenses * multiplier_low <= corpus <= expenses * multiplier_high


# ── PPF ───────────────────────────────────────────────────────────────────────

def test_ppf_default_15_years_in_reasonable_range():
    out = calculate_ppf(annual_contribution=1_50_000)
    amounts = _all_amounts(out)
    # 15y @ 7.1% with ₹1.5L/yr lands ~₹40L. Wide band.
    assert 35_00_000 < max(amounts) < 50_00_000


# ── FD ────────────────────────────────────────────────────────────────────────

def test_fd_maturity_grows_with_rate():
    low  = calculate_fd_rd(principal=100_000, annual_rate=6.0, years=5)
    high = calculate_fd_rd(principal=100_000, annual_rate=8.0, years=5)
    low_m  = max(_all_amounts(low))
    high_m = max(_all_amounts(high))
    assert high_m > low_m


# ── HRA ───────────────────────────────────────────────────────────────────────

def test_hra_exemption_runs_without_crash():
    out = calculate_hra_exemption(
        basic_salary=600_000,
        hra_received=240_000,
        actual_rent_paid=180_000,
        city_type="metro",
    )
    assert "₹" in out


# ── Capital gains ─────────────────────────────────────────────────────────────

def test_capital_gain_loss_is_handled():
    out = calculate_capital_gains_tax(
        asset_type="equity",
        purchase_price=7_00_000,
        sale_price=5_00_000,
        holding_years=2,
    )
    # Should mention "loss" somewhere since sale < purchase.
    assert "Loss" in out or "loss" in out


# ── Retirement ────────────────────────────────────────────────────────────────

def test_retirement_corpus_is_positive_and_scales():
    cheap = calculate_retirement_corpus(
        current_age=30, retirement_age=60, monthly_expenses=30_000,
    )
    expensive = calculate_retirement_corpus(
        current_age=30, retirement_age=60, monthly_expenses=1_00_000,
    )
    # Higher expenses → larger required corpus.
    assert max(_all_amounts(expensive)) > max(_all_amounts(cheap))
