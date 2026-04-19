/**
 * LoansPage.jsx — Categorised loan rates from Indian banks.
 * Tabs: Home | Car | Personal | Education | Gold | Business
 * Includes a quick EMI calculator and CTA to ask the AI.
 */
import { useState, useMemo } from 'react'

// ── Loan data ─────────────────────────────────────────────────────────────────
const LOAN_DATA = {
  home: {
    label: 'Home Loan', icon: '🏠', color: 'brand',
    note: 'Rates are indicative (floating, for salaried profiles). Actual rate depends on credit score, LTV, and lender policy. Last updated Q1 2025.',
    banks: [
      { name: 'Bank of Baroda',      minRate: 8.40, maxRate: 10.60, maxTenure: 30, feature: 'Best for PSU employees' },
      { name: 'PNB Housing Finance', minRate: 8.40, maxRate: 10.25, maxTenure: 30, feature: 'Easy documentation' },
      { name: 'SBI',                 minRate: 8.50, maxRate: 9.65,  maxTenure: 30, feature: 'Largest lender, govt trust' },
      { name: 'LIC Housing Finance', minRate: 8.50, maxRate: 10.50, maxTenure: 30, feature: 'Good for older borrowers' },
      { name: 'Bajaj Housing Fin.',  minRate: 8.50, maxRate: 15.00, maxTenure: 32, feature: 'Fast disbursal' },
      { name: 'HDFC Bank',           minRate: 8.70, maxRate: 9.40,  maxTenure: 30, feature: 'Premium service' },
      { name: 'ICICI Bank',          minRate: 8.75, maxRate: 9.50,  maxTenure: 30, feature: 'Digital-first process' },
      { name: 'Axis Bank',           minRate: 8.75, maxRate: 13.30, maxTenure: 30, feature: 'Flexible part-prepayment' },
      { name: 'Kotak Mahindra',      minRate: 8.75, maxRate: 9.50,  maxTenure: 20, feature: 'Quick approval' },
      { name: 'Canara Bank',         minRate: 8.85, maxRate: 11.25, maxTenure: 30, feature: 'Government bank' },
    ],
  },
  car: {
    label: 'Car Loan', icon: '🚗', color: 'accent',
    note: 'For new cars. Used car loans are typically 1–2% higher. Rates effective Q1 2025.',
    banks: [
      { name: 'Bank of Baroda',  minRate: 8.70, maxRate: 10.70, maxTenure: 7, feature: 'Zero processing fee offers' },
      { name: 'SBI',             minRate: 8.85, maxRate: 12.85, maxTenure: 7, feature: 'Up to 90% on-road funding' },
      { name: 'HDFC Bank',       minRate: 9.00, maxRate: 11.50, maxTenure: 7, feature: 'Same-day approval' },
      { name: 'ICICI Bank',      minRate: 9.00, maxRate: 12.75, maxTenure: 7, feature: '100% on-road funding available' },
      { name: 'Kotak Mahindra',  minRate: 9.00, maxRate: 12.50, maxTenure: 7, feature: 'Competitive for luxury cars' },
      { name: 'Axis Bank',       minRate: 9.25, maxRate: 14.50, maxTenure: 7, feature: 'Doorstep service' },
      { name: 'IndusInd Bank',   minRate: 9.50, maxRate: 15.00, maxTenure: 7, feature: 'Flexible EMI options' },
      { name: 'Tata Capital',    minRate: 9.60, maxRate: 14.00, maxTenure: 7, feature: 'Strong dealer network' },
    ],
  },
  personal: {
    label: 'Personal Loan', icon: '💼', color: 'brand',
    note: 'Unsecured. Rate depends heavily on credit score (750+ gets best rates). No collateral required.',
    banks: [
      { name: 'SBI',           minRate: 10.90, maxRate: 15.40, maxTenure: 6, feature: 'Lowest floor rate (PSB)' },
      { name: 'HDFC Bank',     minRate: 10.50, maxRate: 24.00, maxTenure: 5, feature: 'Pre-approved for salary accounts' },
      { name: 'ICICI Bank',    minRate: 10.65, maxRate: 16.00, maxTenure: 5, feature: 'Instant disbursal for existing customers' },
      { name: 'Axis Bank',     minRate: 10.99, maxRate: 21.00, maxTenure: 5, feature: 'No foreclosure charges after 1 year' },
      { name: 'Kotak Mahindra',minRate: 10.99, maxRate: 24.00, maxTenure: 5, feature: 'Same-day approval' },
      { name: 'Tata Capital',  minRate: 10.99, maxRate: 24.00, maxTenure: 5, feature: 'Transparent pricing' },
      { name: 'IndusInd Bank', minRate: 10.49, maxRate: 26.00, maxTenure: 5, feature: 'Flexible repayment' },
      { name: 'Bajaj Finance', minRate: 13.00, maxRate: 30.00, maxTenure: 5, feature: 'Widest acceptance, instant cash' },
      { name: 'Moneyview',     minRate: 14.00, maxRate: 36.00, maxTenure: 5, feature: 'For lower credit profiles' },
    ],
  },
  education: {
    label: 'Education Loan', icon: '🎓', color: 'accent',
    note: 'Subsidised interest during study period for eligible courses. Moratorium typically covers course duration + 1 year.',
    banks: [
      { name: 'SBI (Vidyalakshmi)', minRate: 8.05, maxRate: 11.15, maxTenure: 15, feature: 'Govt subsidy eligible' },
      { name: 'Bank of Baroda',     minRate: 8.15, maxRate: 10.85, maxTenure: 15, feature: 'No collateral up to ₹7.5L' },
      { name: 'Canara Bank',        minRate: 8.50, maxRate: 11.25, maxTenure: 15, feature: 'Wide coverage of courses' },
      { name: 'PNB',                minRate: 8.55, maxRate: 11.00, maxTenure: 15, feature: 'No margin for amounts up to ₹4L' },
      { name: 'ICICI Bank',         minRate: 9.00, maxRate: 13.50, maxTenure: 15, feature: 'Covers living expenses too' },
      { name: 'HDFC Credila',       minRate: 9.55, maxRate: 13.25, maxTenure: 15, feature: 'Specialised education lender' },
      { name: 'Axis Bank',          minRate: 13.70, maxRate: 15.20, maxTenure: 15, feature: 'Fast for abroad education' },
      { name: 'Avanse Financial',   minRate: 11.00, maxRate: 13.75, maxTenure: 12, feature: 'Covers all abroad institutes' },
    ],
  },
  gold: {
    label: 'Gold Loan', icon: '🥇', color: 'brand',
    note: 'Instant disbursal (30–60 mins). LTV: up to 75% of gold value per RBI norms. Interest often calculated on reducing balance.',
    banks: [
      { name: 'SBI',               minRate: 8.75,  maxRate: 9.75,  maxTenure: 3,  feature: 'Safest, lowest rate' },
      { name: 'Bank of Baroda',    minRate: 8.80,  maxRate: 10.45, maxTenure: 3,  feature: 'Zero processing fee' },
      { name: 'Canara Bank',       minRate: 8.80,  maxRate: 10.20, maxTenure: 2,  feature: 'PSB security' },
      { name: 'ICICI Bank',        minRate: 10.00, maxRate: 19.76, maxTenure: 1,  feature: 'Doorstep gold loan' },
      { name: 'HDFC Bank',         minRate: 9.90,  maxRate: 17.90, maxTenure: 2,  feature: 'Digital gold loan available' },
      { name: 'Axis Bank',         minRate: 10.50, maxRate: 17.50, maxTenure: 2,  feature: 'Flexible repayment schemes' },
      { name: 'Muthoot Finance',   minRate: 12.00, maxRate: 27.00, maxTenure: 3,  feature: 'Largest gold lender in India' },
      { name: 'Manappuram Finance',minRate: 12.00, maxRate: 29.00, maxTenure: 1,  feature: 'Widest branch network' },
      { name: 'IIFL Finance',      minRate: 11.88, maxRate: 27.00, maxTenure: 3,  feature: 'Bullet repayment option' },
    ],
  },
  business: {
    label: 'Business Loan', icon: '🏢', color: 'accent',
    note: 'Unsecured business loans for MSMEs. Collateral-free up to ₹2 Cr under CGTMSE scheme. Vintage of 2+ years typically required.',
    banks: [
      { name: 'SBI',           minRate: 9.00,  maxRate: 14.75, maxTenure: 5, feature: 'MUDRA & CGTMSE available' },
      { name: 'Bank of Baroda',minRate: 9.15,  maxRate: 14.50, maxTenure: 5, feature: 'Fast for existing customers' },
      { name: 'HDFC Bank',     minRate: 10.00, maxRate: 22.50, maxTenure: 4, feature: 'SmartBiz — instant in-app' },
      { name: 'ICICI Bank',    minRate: 10.50, maxRate: 19.50, maxTenure: 3, feature: 'iMobile instant sanction' },
      { name: 'Axis Bank',     minRate: 14.00, maxRate: 21.00, maxTenure: 4, feature: 'Flexible usage of funds' },
      { name: 'Tata Capital',  minRate: 12.00, maxRate: 24.00, maxTenure: 5, feature: 'No collateral up to ₹75L' },
      { name: 'Bajaj Finance', minRate: 14.00, maxRate: 26.00, maxTenure: 5, feature: 'Largest NBFC lender' },
      { name: 'Lendingkart',   minRate: 15.00, maxRate: 30.00, maxTenure: 3, feature: 'New businesses accepted' },
    ],
  },
}

const TABS = [
  { id: 'home',      label: 'Home',      icon: '🏠' },
  { id: 'car',       label: 'Car',       icon: '🚗' },
  { id: 'personal',  label: 'Personal',  icon: '💼' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'gold',      label: 'Gold',      icon: '🥇' },
  { id: 'business',  label: 'Business',  icon: '🏢' },
]

// ── EMI calculator ─────────────────────────────────────────────────────────────
function calcEMI(principal, ratePercent, tenureYears) {
  const r = ratePercent / 12 / 100
  const n = tenureYears * 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function formatINR(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function RateBadge({ min, max }) {
  return (
    <span className="text-brand-400 font-bold tabular-nums">
      {min.toFixed(2)}%{min !== max ? `–${max.toFixed(2)}%` : ''} p.a.
    </span>
  )
}

function BankRow({ bank, rank }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 hover:bg-white/[0.04] ${rank === 0 ? 'bg-brand-500/5 border border-brand-500/15' : ''}`}>
      {rank === 0 && (
        <span className="text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Best</span>
      )}
      {rank > 0 && <span className="w-6 text-center text-white/25 text-xs flex-shrink-0">#{rank + 1}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-white/90 font-semibold text-sm truncate">{bank.name}</p>
        <p className="text-white/35 text-xs mt-0.5 truncate">{bank.feature}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <RateBadge min={bank.minRate} max={bank.maxRate} />
        <p className="text-white/30 text-xs mt-0.5">Up to {bank.maxTenure} yrs</p>
      </div>
    </div>
  )
}

function EmiCalculator({ defaultRate, onAskAI }) {
  const [amount, setAmount] = useState(2000000)
  const [rate, setRate]     = useState(defaultRate)
  const [tenure, setTenure] = useState(20)

  const emi       = useMemo(() => calcEMI(amount, rate, tenure), [amount, rate, tenure])
  const totalPay  = useMemo(() => emi * tenure * 12, [emi, tenure])
  const totalInt  = useMemo(() => totalPay - amount, [totalPay, amount])

  const sliderClass = "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-white/10"

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <h3 className="text-white font-bold text-base flex items-center gap-2">
        <span>🧮</span> EMI Calculator
      </h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Loan Amount</span>
            <span className="text-brand-400 font-bold">{formatINR(amount)}</span>
          </div>
          <input type="range" className={sliderClass} min={100000} max={10000000} step={50000}
            value={amount} onChange={e => setAmount(+e.target.value)} />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Interest Rate</span>
            <span className="text-brand-400 font-bold">{rate.toFixed(2)}% p.a.</span>
          </div>
          <input type="range" className={sliderClass} min={6} max={30} step={0.05}
            value={rate} onChange={e => setRate(+e.target.value)} />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Tenure</span>
            <span className="text-brand-400 font-bold">{tenure} years</span>
          </div>
          <input type="range" className={sliderClass} min={1} max={30} step={1}
            value={tenure} onChange={e => setTenure(+e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Monthly EMI',    value: formatINR(emi) },
          { label: 'Total Interest', value: formatINR(totalInt) },
          { label: 'Total Payment',  value: formatINR(totalPay) },
        ].map(({ label, value }) => (
          <div key={label} className="glass-light rounded-xl p-3 text-center">
            <p className="text-brand-400 font-bold text-sm">{value}</p>
            <p className="text-white/35 text-[10px] mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => onAskAI(`I want a ${tenure}-year loan of ${formatINR(amount)} at around ${rate.toFixed(2)}% interest. Monthly EMI comes to ${formatINR(emi)}. Is this affordable? Which bank should I approach?`)}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-sm font-semibold hover:from-brand-500 hover:to-accent-400 transition-all duration-200 active:scale-[0.98]"
      >
        Ask Finsight about this loan →
      </button>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function LoansPage({ onAskAI }) {
  const [tab, setTab] = useState('home')
  const loan = LOAN_DATA[tab]
  const sorted = [...loan.banks].sort((a, b) => a.minRate - b.minRate)

  return (
    <div className="flex-1 overflow-y-auto bg-surface-900">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Loan Rates</h1>
          <p className="text-white/40 text-sm mt-1">Compare Indian bank interest rates across all loan types</p>
        </div>

        {/* Category tabs — scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                tab === t.id
                  ? 'bg-brand-500/20 border border-brand-400/40 text-brand-300'
                  : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.07]'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Rates table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-white/[0.04]">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <span>{loan.icon}</span>{loan.label}
              </h2>
              <span className="text-white/25 text-xs">Sorted by lowest rate</span>
            </div>
            <p className="text-white/30 text-xs mt-1.5 leading-relaxed">{loan.note}</p>
          </div>
          <div className="p-2 space-y-0.5">
            {sorted.map((bank, i) => (
              <BankRow key={bank.name} bank={bank} rank={i} />
            ))}
          </div>
        </div>

        {/* EMI Calculator */}
        <EmiCalculator
          defaultRate={sorted[0].minRate}
          onAskAI={onAskAI}
        />

        {/* Disclaimer */}
        <p className="text-white/20 text-[11px] text-center leading-relaxed pb-4">
          Rates are indicative and subject to change. Always verify current rates directly with the bank before applying.
          CIBIL score, income, employer category, and LTV ratio significantly affect the final rate offered.
        </p>
      </div>
    </div>
  )
}
