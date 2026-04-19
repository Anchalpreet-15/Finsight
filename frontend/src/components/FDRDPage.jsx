/**
 * FDRDPage.jsx — Fixed Deposit & Recurring Deposit rates from Indian banks.
 * Tabs: FD | RD  ·  Duration filter  ·  Senior citizen toggle
 * Includes a maturity calculator and AI CTA.
 */
import { useState, useMemo } from 'react'

// ── Rate data (Q1 2025) ────────────────────────────────────────────────────────
// Format: { name, logo?, rates: { "6m"|"1y"|"2y"|"3y"|"5y": { general, senior } } }
const FD_BANKS = [
  {
    name: 'DCB Bank',
    type: 'private',
    rates: { '6m': { g: 7.25, s: 7.75 }, '1y': { g: 8.00, s: 8.50 }, '2y': { g: 8.00, s: 8.50 }, '3y': { g: 7.55, s: 8.05 }, '5y': { g: 7.40, s: 7.90 } },
  },
  {
    name: 'RBL Bank',
    type: 'private',
    rates: { '6m': { g: 7.00, s: 7.50 }, '1y': { g: 8.00, s: 8.50 }, '2y': { g: 7.50, s: 8.00 }, '3y': { g: 7.50, s: 8.00 }, '5y': { g: 7.10, s: 7.60 } },
  },
  {
    name: 'IndusInd Bank',
    type: 'private',
    rates: { '6m': { g: 6.75, s: 7.25 }, '1y': { g: 7.75, s: 8.25 }, '2y': { g: 7.25, s: 7.75 }, '3y': { g: 7.25, s: 7.75 }, '5y': { g: 7.25, s: 7.75 } },
  },
  {
    name: 'Yes Bank',
    type: 'private',
    rates: { '6m': { g: 6.75, s: 7.25 }, '1y': { g: 7.75, s: 8.25 }, '2y': { g: 7.25, s: 7.75 }, '3y': { g: 7.25, s: 7.75 }, '5y': { g: 7.25, s: 7.75 } },
  },
  {
    name: 'IDFC First Bank',
    type: 'private',
    rates: { '6m': { g: 6.50, s: 7.00 }, '1y': { g: 7.75, s: 8.25 }, '2y': { g: 7.25, s: 7.75 }, '3y': { g: 7.25, s: 7.75 }, '5y': { g: 7.00, s: 7.50 } },
  },
  {
    name: 'Kotak Mahindra',
    type: 'private',
    rates: { '6m': { g: 6.00, s: 6.50 }, '1y': { g: 7.10, s: 7.60 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 6.20, s: 6.70 } },
  },
  {
    name: 'Axis Bank',
    type: 'private',
    rates: { '6m': { g: 5.75, s: 6.25 }, '1y': { g: 7.00, s: 7.50 }, '2y': { g: 7.01, s: 7.51 }, '3y': { g: 7.10, s: 7.60 }, '5y': { g: 7.00, s: 7.75 } },
  },
  {
    name: 'HDFC Bank',
    type: 'private',
    rates: { '6m': { g: 5.75, s: 6.25 }, '1y': { g: 7.00, s: 7.50 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 7.00, s: 7.75 } },
  },
  {
    name: 'ICICI Bank',
    type: 'private',
    rates: { '6m': { g: 5.75, s: 6.25 }, '1y': { g: 7.00, s: 7.50 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 7.00, s: 7.50 } },
  },
  {
    name: 'Bank of Baroda',
    type: 'public',
    rates: { '6m': { g: 5.50, s: 6.00 }, '1y': { g: 6.85, s: 7.35 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 6.75, s: 7.25 }, '5y': { g: 6.50, s: 7.15 } },
  },
  {
    name: 'SBI',
    type: 'public',
    rates: { '6m': { g: 5.50, s: 6.00 }, '1y': { g: 6.80, s: 7.30 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 6.75, s: 7.25 }, '5y': { g: 6.50, s: 7.50 } },
  },
  {
    name: 'Canara Bank',
    type: 'public',
    rates: { '6m': { g: 5.50, s: 6.00 }, '1y': { g: 6.80, s: 7.30 }, '2y': { g: 6.85, s: 7.35 }, '3y': { g: 6.80, s: 7.30 }, '5y': { g: 6.70, s: 7.20 } },
  },
  {
    name: 'PNB',
    type: 'public',
    rates: { '6m': { g: 5.50, s: 6.00 }, '1y': { g: 6.80, s: 7.30 }, '2y': { g: 6.80, s: 7.30 }, '3y': { g: 6.50, s: 7.00 }, '5y': { g: 6.50, s: 7.25 } },
  },
  {
    name: 'Post Office TD',
    type: 'govt',
    rates: { '6m': { g: null, s: null }, '1y': { g: 6.90, s: 6.90 }, '2y': { g: 7.00, s: 7.00 }, '3y': { g: 7.10, s: 7.10 }, '5y': { g: 7.50, s: 7.50 } },
    note: 'Government backed. 5Y qualifies for 80C deduction.',
  },
]

const RD_BANKS = [
  { name: 'DCB Bank',       type: 'private', rates: { '6m': { g: 7.00, s: 7.50 }, '1y': { g: 7.75, s: 8.25 }, '2y': { g: 7.75, s: 8.25 }, '3y': { g: 7.50, s: 8.00 }, '5y': { g: 7.25, s: 7.75 } } },
  { name: 'RBL Bank',       type: 'private', rates: { '6m': { g: 6.75, s: 7.25 }, '1y': { g: 7.50, s: 8.00 }, '2y': { g: 7.25, s: 7.75 }, '3y': { g: 7.25, s: 7.75 }, '5y': { g: 7.00, s: 7.50 } } },
  { name: 'IndusInd Bank',  type: 'private', rates: { '6m': { g: 6.75, s: 7.25 }, '1y': { g: 7.75, s: 8.25 }, '2y': { g: 7.25, s: 7.75 }, '3y': { g: 7.25, s: 7.75 }, '5y': { g: 7.25, s: 7.75 } } },
  { name: 'Yes Bank',       type: 'private', rates: { '6m': { g: 6.50, s: 7.00 }, '1y': { g: 7.50, s: 8.00 }, '2y': { g: 7.25, s: 7.75 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 7.00, s: 7.50 } } },
  { name: 'IDFC First',     type: 'private', rates: { '6m': { g: 6.25, s: 6.75 }, '1y': { g: 7.50, s: 8.00 }, '2y': { g: 7.25, s: 7.75 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 6.75, s: 7.25 } } },
  { name: 'Kotak Mahindra', type: 'private', rates: { '6m': { g: 6.00, s: 6.50 }, '1y': { g: 7.10, s: 7.60 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 6.20, s: 6.70 } } },
  { name: 'Axis Bank',      type: 'private', rates: { '6m': { g: 5.75, s: 6.25 }, '1y': { g: 7.00, s: 7.50 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 7.10, s: 7.60 }, '5y': { g: 7.00, s: 7.75 } } },
  { name: 'HDFC Bank',      type: 'private', rates: { '6m': { g: 5.75, s: 6.25 }, '1y': { g: 7.00, s: 7.50 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 7.00, s: 7.75 } } },
  { name: 'ICICI Bank',     type: 'private', rates: { '6m': { g: 5.75, s: 6.25 }, '1y': { g: 7.00, s: 7.50 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 7.00, s: 7.50 }, '5y': { g: 7.00, s: 7.50 } } },
  { name: 'SBI',            type: 'public',  rates: { '6m': { g: 5.50, s: 6.00 }, '1y': { g: 6.80, s: 7.30 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 6.75, s: 7.25 }, '5y': { g: 6.50, s: 7.50 } } },
  { name: 'Bank of Baroda', type: 'public',  rates: { '6m': { g: 5.50, s: 6.00 }, '1y': { g: 6.85, s: 7.35 }, '2y': { g: 7.00, s: 7.50 }, '3y': { g: 6.75, s: 7.25 }, '5y': { g: 6.50, s: 7.15 } } },
  { name: 'PNB',            type: 'public',  rates: { '6m': { g: 5.50, s: 6.00 }, '1y': { g: 6.80, s: 7.30 }, '2y': { g: 6.80, s: 7.30 }, '3y': { g: 6.50, s: 7.00 }, '5y': { g: 6.50, s: 7.25 } } },
  { name: 'Post Office RD', type: 'govt',    rates: { '6m': { g: null, s: null }, '1y': { g: null, s: null }, '2y': { g: null, s: null }, '3y': { g: null, s: null }, '5y': { g: 6.70, s: 6.70 } }, note: '5-year RD only. Govt backed.' },
]

const DURATIONS = [
  { id: '6m', label: '6 Months' },
  { id: '1y', label: '1 Year' },
  { id: '2y', label: '2 Years' },
  { id: '3y', label: '3 Years' },
  { id: '5y', label: '5 Years' },
]

const TYPE_COLORS = { private: 'text-accent-400', public: 'text-brand-400', govt: 'text-yellow-400' }
const TYPE_LABELS = { private: 'Pvt', public: 'PSU', govt: 'Govt' }

// ── Calculator helpers ─────────────────────────────────────────────────────────
function fdMaturity(principal, ratePercent, years) {
  // Quarterly compounding
  const r = ratePercent / 100 / 4
  const n = years * 4
  return principal * Math.pow(1 + r, n)
}

function rdMaturity(monthly, ratePercent, years) {
  const r = ratePercent / 100 / 4
  const months = years * 12
  let mat = 0
  for (let i = 1; i <= months; i++) {
    const quartersLeft = (months - i) / 3
    mat += monthly * Math.pow(1 + r, quartersLeft)
  }
  return mat
}

function formatINR(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function durationToYears(d) {
  if (d === '6m') return 0.5
  return parseInt(d)
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function BankRateRow({ bank, duration, senior, rank }) {
  const rateObj = bank.rates[duration]
  const rate = senior ? rateObj?.s : rateObj?.g
  if (rate == null) return null
  const isBest = rank === 0

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/[0.04] ${isBest ? 'bg-brand-500/5 border border-brand-500/15' : ''}`}>
      {isBest && <span className="text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Best</span>}
      {!isBest && <span className="w-6 text-center text-white/25 text-xs flex-shrink-0">#{rank + 1}</span>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white/90 font-semibold text-sm truncate">{bank.name}</p>
          <span className={`text-[10px] font-bold ${TYPE_COLORS[bank.type]}`}>{TYPE_LABELS[bank.type]}</span>
        </div>
        {bank.note && <p className="text-white/30 text-xs mt-0.5">{bank.note}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-brand-400 font-bold tabular-nums">{rate.toFixed(2)}% p.a.</span>
        {senior && <p className="text-yellow-500/70 text-[10px] mt-0.5">Senior rate</p>}
      </div>
    </div>
  )
}

function FDCalc({ onAskAI }) {
  const [principal, setPrincipal] = useState(100000)
  const [rate, setRate]           = useState(7.5)
  const [years, setYears]         = useState(1)

  const maturity   = useMemo(() => fdMaturity(principal, rate, years), [principal, rate, years])
  const interest   = useMemo(() => maturity - principal, [maturity, principal])
  const sliderClass = "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-white/10"

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <h3 className="text-white font-bold text-base flex items-center gap-2"><span>🧮</span> FD Maturity Calculator</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Principal Amount</span>
            <span className="text-brand-400 font-bold">{formatINR(principal)}</span>
          </div>
          <input type="range" className={sliderClass} min={10000} max={5000000} step={10000}
            value={principal} onChange={e => setPrincipal(+e.target.value)} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Interest Rate</span>
            <span className="text-brand-400 font-bold">{rate.toFixed(2)}% p.a.</span>
          </div>
          <input type="range" className={sliderClass} min={4} max={10} step={0.05}
            value={rate} onChange={e => setRate(+e.target.value)} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Duration</span>
            <span className="text-brand-400 font-bold">{years} year{years > 1 ? 's' : ''}</span>
          </div>
          <input type="range" className={sliderClass} min={0.5} max={10} step={0.5}
            value={years} onChange={e => setYears(+e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Maturity Value', value: formatINR(maturity) },
          { label: 'Interest Earned', value: formatINR(interest) },
        ].map(({ label, value }) => (
          <div key={label} className="glass-light rounded-xl p-3 text-center">
            <p className="text-brand-400 font-bold text-sm">{value}</p>
            <p className="text-white/35 text-[10px] mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <button onClick={() => onAskAI(`I want to invest ${formatINR(principal)} in a Fixed Deposit for ${years} year(s) at ${rate.toFixed(2)}% interest. Maturity value: ${formatINR(maturity)}. Which bank offers the best FD rate? Is FD the right choice for me?`)}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-sm font-semibold hover:from-brand-500 hover:to-accent-400 transition-all duration-200 active:scale-[0.98]">
        Ask Finsight about this FD →
      </button>
    </div>
  )
}

function RDCalc({ onAskAI }) {
  const [monthly, setMonthly] = useState(5000)
  const [rate, setRate]       = useState(7.0)
  const [years, setYears]     = useState(1)

  const maturity  = useMemo(() => rdMaturity(monthly, rate, years), [monthly, rate, years])
  const invested  = useMemo(() => monthly * years * 12, [monthly, years])
  const interest  = useMemo(() => maturity - invested, [maturity, invested])
  const sliderClass = "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-white/10"

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <h3 className="text-white font-bold text-base flex items-center gap-2"><span>🧮</span> RD Maturity Calculator</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Monthly Deposit</span>
            <span className="text-brand-400 font-bold">{formatINR(monthly)}/mo</span>
          </div>
          <input type="range" className={sliderClass} min={500} max={100000} step={500}
            value={monthly} onChange={e => setMonthly(+e.target.value)} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Interest Rate</span>
            <span className="text-brand-400 font-bold">{rate.toFixed(2)}% p.a.</span>
          </div>
          <input type="range" className={sliderClass} min={4} max={10} step={0.05}
            value={rate} onChange={e => setRate(+e.target.value)} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Duration</span>
            <span className="text-brand-400 font-bold">{years} year{years > 1 ? 's' : ''}</span>
          </div>
          <input type="range" className={sliderClass} min={1} max={10} step={1}
            value={years} onChange={e => setYears(+e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Maturity Value', value: formatINR(maturity) },
          { label: 'Amount Invested', value: formatINR(invested) },
          { label: 'Interest Earned', value: formatINR(interest) },
        ].map(({ label, value }) => (
          <div key={label} className="glass-light rounded-xl p-3 text-center">
            <p className="text-brand-400 font-bold text-sm">{value}</p>
            <p className="text-white/35 text-[10px] mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>
      <button onClick={() => onAskAI(`I want to start an RD with ${formatINR(monthly)}/month for ${years} year(s) at ${rate.toFixed(2)}% rate. Maturity will be ${formatINR(maturity)}. Which bank gives the best RD rate? Is this better than a SIP?`)}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-sm font-semibold hover:from-brand-500 hover:to-accent-400 transition-all duration-200 active:scale-[0.98]">
        Ask Finsight about this RD →
      </button>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function FDRDPage({ onAskAI }) {
  const [tab, setTab]         = useState('fd')
  const [duration, setDur]    = useState('1y')
  const [senior, setSenior]   = useState(false)

  const banks   = tab === 'fd' ? FD_BANKS : RD_BANKS
  const sorted  = useMemo(() => {
    const key = senior ? 's' : 'g'
    return [...banks]
      .filter(b => b.rates[duration]?.[key] != null)
      .sort((a, b) => (b.rates[duration][key] || 0) - (a.rates[duration][key] || 0))
  }, [banks, duration, senior])

  return (
    <div className="flex-1 overflow-y-auto bg-surface-900">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">FD &amp; RD Rates</h1>
          <p className="text-white/40 text-sm mt-1">Compare Fixed &amp; Recurring Deposit rates — highest rates first</p>
        </div>

        {/* FD / RD toggle + Senior toggle */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2">
            {[
              { id: 'fd', label: '📅 Fixed Deposit' },
              { id: 'rd', label: '🔄 Recurring Deposit' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  tab === t.id
                    ? 'bg-brand-500/20 border border-brand-400/40 text-brand-300'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Senior citizen toggle */}
          <button
            onClick={() => setSenior(s => !s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
              senior
                ? 'bg-yellow-500/15 border-yellow-400/40 text-yellow-300'
                : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70'
            }`}>
            <span>👴</span>
            <span>Senior Citizen</span>
            {senior && <span className="text-yellow-400 text-xs">+0.50% extra</span>}
          </button>
        </div>

        {/* Duration filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DURATIONS.map(d => (
            <button key={d.id} onClick={() => setDur(d.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                duration === d.id
                  ? 'bg-accent-500/20 border border-accent-400/40 text-accent-300'
                  : 'bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70'
              }`}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Rates table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h2 className="text-white font-bold text-sm">
              {tab === 'fd' ? 'Fixed Deposit' : 'Recurring Deposit'} — {DURATIONS.find(d => d.id === duration)?.label}
              {senior ? ' (Senior Citizen)' : ''}
            </h2>
            <div className="flex items-center gap-3 text-[11px]">
              <span className={`${TYPE_COLORS.private} font-semibold`}>● Pvt</span>
              <span className={`${TYPE_COLORS.public} font-semibold`}>● PSU</span>
              <span className={`${TYPE_COLORS.govt} font-semibold`}>● Govt</span>
            </div>
          </div>
          <div className="p-2 space-y-0.5">
            {sorted.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No data available for this duration.</p>
            ) : (
              sorted.map((bank, i) => (
                <BankRateRow key={bank.name} bank={bank} duration={duration} senior={senior} rank={i} />
              ))
            )}
          </div>
        </div>

        {/* Calculator */}
        {tab === 'fd'
          ? <FDCalc onAskAI={onAskAI} />
          : <RDCalc onAskAI={onAskAI} />
        }

        {/* Tips */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm">💡 Smart Tips</h3>
          <ul className="space-y-2">
            {(tab === 'fd' ? [
              'FD interest is fully taxable as per your income slab — consider ELSS or PPF for tax-saving alternatives.',
              '5-year tax-saver FDs (80C) lock your money but save up to ₹46,800 in tax for 30% slab payers.',
              'Laddering FDs (splitting into multiple tenures) gives you liquidity without sacrificing much return.',
              'Senior citizens get 0.25–0.75% extra — this can add up to ₹15,000+ annually on ₹10L deposit.',
            ] : [
              'RD is ideal for building a habit of saving — auto-debit makes it effortless.',
              'RD interest is taxable. For tax efficiency at the same risk level, consider a liquid SIP instead.',
              'You can open RDs at Post Office even without a bank account — government-backed safety.',
              'Missing an RD installment attracts a penalty of ₹1.50–₹2 per ₹100 per month.',
            ]).map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/50 leading-relaxed">
                <span className="text-brand-500 flex-shrink-0 mt-0.5">✦</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/20 text-[11px] text-center leading-relaxed pb-4">
          Rates are indicative and subject to change without notice. Verify directly with the bank before investing.
          DICGC insures deposits up to ₹5 Lakh per depositor per bank.
        </p>
      </div>
    </div>
  )
}
