/**
 * CalculatorsPage.jsx — All financial calculators in one place.
 * Tabs: SIP | EMI | Savings Goal | Emergency Fund | Debt Payoff
 * Each has interactive sliders + Recharts visualisation.
 */
import { useMemo, useState } from 'react'
import SIPChart from './SIPChart'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function calcEMI(p, r, y) {
  const rm = r / 12 / 100, n = y * 12
  if (rm === 0) return p / n
  return (p * rm * Math.pow(1 + rm, n)) / (Math.pow(1 + rm, n) - 1)
}

function sipCorpus(monthly, ratePercent, years) {
  const r = ratePercent / 100 / 12
  const n = years * 12
  if (r === 0) return monthly * n
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

const slider = "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-white/10"

const CustomBar = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-2.5 text-xs border border-white/10">
      <p className="text-white/60">{payload[0].name}</p>
      <p className="text-brand-400 font-bold">{fmt(payload[0].value)}</p>
    </div>
  )
}

// ── SIP Calculator tab ────────────────────────────────────────────────────────
function SIPCalc({ onAskAI }) {
  const [monthly, setMonthly] = useState(5000)
  const [years, setYears]     = useState(20)
  const [rate, setRate]       = useState(12)

  const corpus   = useMemo(() => sipCorpus(monthly, rate, years), [monthly, rate, years])
  const invested = useMemo(() => monthly * 12 * years, [monthly, years])
  const gain     = useMemo(() => corpus - invested, [corpus, invested])

  const barData = [
    { name: 'Invested', value: Math.round(invested) },
    { name: 'Gain',     value: Math.round(gain) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="glass rounded-2xl p-5 space-y-5">
          <h3 className="text-white font-bold text-sm">SIP Parameters</h3>
          {[
            { label: 'Monthly SIP', value: monthly, set: setMonthly, min: 500, max: 100000, step: 500, fmt: v => fmt(v) + '/mo' },
            { label: 'Expected Return', value: rate, set: setRate, min: 5, max: 24, step: 0.5, fmt: v => v + '% p.a.' },
            { label: 'Duration', value: years, set: setYears, min: 1, max: 40, step: 1, fmt: v => v + ' years' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/50">{s.label}</span>
                <span className="text-brand-400 font-bold">{s.fmt(s.value)}</span>
              </div>
              <input type="range" className={slider} min={s.min} max={s.max} step={s.step}
                value={s.value} onChange={e => s.set(+e.target.value)} />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { label: 'Corpus', value: fmt(corpus), highlight: true },
              { label: 'Invested', value: fmt(invested) },
              { label: 'Gain', value: fmt(gain) },
            ].map(c => (
              <div key={c.label} className={`rounded-xl p-2.5 text-center ${c.highlight ? 'bg-brand-500/15 border border-brand-500/25' : 'glass-light'}`}>
                <p className={`font-bold text-xs ${c.highlight ? 'text-brand-300' : 'text-white/80'}`}>{c.value}</p>
                <p className="text-white/30 text-[10px] mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <button onClick={() => onAskAI(`I want to do a SIP of ${fmt(monthly)}/month for ${years} years. At ${rate}% return, my corpus will be ${fmt(corpus)}. Is this a good plan? What funds should I choose?`)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98]">
            Ask Finsight about this plan →
          </button>
        </div>

        {/* Bar breakdown */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm">Invested vs Gain</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} width={55} />
              <Tooltip content={<CustomBar />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#475569" />
                <Cell fill="#00e676" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-white/30 text-xs text-center">
            Wealth multiplier: <span className="text-brand-400 font-bold">{(corpus / invested).toFixed(1)}x</span>
          </p>
        </div>
      </div>

      {/* Multi-rate growth chart */}
      <div>
        <h3 className="text-white font-bold text-sm mb-3">Growth at Different Return Rates</h3>
        <SIPChart monthly={monthly} maxYears={Math.min(years, 30)} />
      </div>
    </div>
  )
}

// ── EMI Calculator tab ────────────────────────────────────────────────────────
function EMICalc({ onAskAI }) {
  const [principal, setPrincipal] = useState(2000000)
  const [rate, setRate]           = useState(8.5)
  const [years, setYears]         = useState(20)

  const emi      = useMemo(() => calcEMI(principal, rate, years), [principal, rate, years])
  const total    = useMemo(() => emi * years * 12, [emi, years])
  const interest = useMemo(() => total - principal, [total, principal])

  const pieData = [
    { name: 'Principal', value: Math.round(principal) },
    { name: 'Interest',  value: Math.round(interest) },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass rounded-2xl p-5 space-y-5">
        <h3 className="text-white font-bold text-sm">Loan Parameters</h3>
        {[
          { label: 'Loan Amount', value: principal, set: setPrincipal, min: 100000, max: 10000000, step: 50000, fmt: v => fmt(v) },
          { label: 'Interest Rate', value: rate, set: setRate, min: 5, max: 25, step: 0.05, fmt: v => v.toFixed(2) + '% p.a.' },
          { label: 'Tenure', value: years, set: setYears, min: 1, max: 30, step: 1, fmt: v => v + ' years' },
        ].map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/50">{s.label}</span>
              <span className="text-brand-400 font-bold">{s.fmt(s.value)}</span>
            </div>
            <input type="range" className={slider} min={s.min} max={s.max} step={s.step}
              value={s.value} onChange={e => s.set(+e.target.value)} />
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2 pt-2">
          {[
            { label: 'Monthly EMI', value: fmt(emi), highlight: true },
            { label: 'Total Interest', value: fmt(interest) },
            { label: 'Total Payment', value: fmt(total) },
          ].map(c => (
            <div key={c.label} className={`rounded-xl p-2.5 text-center ${c.highlight ? 'bg-brand-500/15 border border-brand-500/25' : 'glass-light'}`}>
              <p className={`font-bold text-xs ${c.highlight ? 'text-brand-300' : 'text-white/80'}`}>{c.value}</p>
              <p className="text-white/30 text-[10px] mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <button onClick={() => onAskAI(`I'm planning a ${fmt(principal)} loan at ${rate}% for ${years} years. EMI will be ${fmt(emi)} and I'll pay ${fmt(interest)} as interest. Is this affordable? Which bank should I approach?`)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98]">
          Ask Finsight about this loan →
        </button>
      </div>

      <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center space-y-3">
        <h3 className="text-white font-bold text-sm self-start">Principal vs Interest</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
              paddingAngle={3} dataKey="value">
              <Cell fill="#475569" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1a2225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
            <Legend formatter={(v, e) => <span style={{ color: e.color, fontSize: '11px' }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-white/30 text-xs text-center">
          You pay <span className="text-red-400 font-bold">{((interest / total) * 100).toFixed(0)}%</span> of total as interest
        </p>
      </div>
    </div>
  )
}

// ── Savings Goal tab ──────────────────────────────────────────────────────────
function SavingsGoalCalc({ onAskAI }) {
  const [goal, setGoal]     = useState(1000000)
  const [years, setYears]   = useState(5)
  const [rate, setRate]     = useState(10)
  const [saved, setSaved]   = useState(0)

  const remaining = Math.max(goal - saved, 0)
  const r = rate / 100 / 12
  const n = years * 12
  const monthly = r === 0 ? remaining / n
    : remaining * r / (Math.pow(1 + r, n) - 1)

  const milestones = [1, 2, 3, 4, 5].filter(y => y <= years).map(y => ({
    year: y,
    saved: Math.round(sipCorpus(monthly, rate, y) + saved),
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass rounded-2xl p-5 space-y-5">
        <h3 className="text-white font-bold text-sm">Goal Planner</h3>
        {[
          { label: 'Target Amount', value: goal, set: setGoal, min: 100000, max: 50000000, step: 100000, fmt: v => fmt(v) },
          { label: 'Already Saved', value: saved, set: setSaved, min: 0, max: goal, step: 10000, fmt: v => fmt(v) },
          { label: 'Expected Return', value: rate, set: setRate, min: 4, max: 20, step: 0.5, fmt: v => v + '% p.a.' },
          { label: 'Time Available', value: years, set: setYears, min: 1, max: 30, step: 1, fmt: v => v + ' years' },
        ].map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/50">{s.label}</span>
              <span className="text-brand-400 font-bold">{s.fmt(s.value)}</span>
            </div>
            <input type="range" className={slider} min={s.min} max={s.max} step={s.step}
              value={s.value} onChange={e => s.set(+e.target.value)} />
          </div>
        ))}

        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 text-center">
          <p className="text-brand-300 text-lg font-extrabold">{fmt(monthly)}<span className="text-sm font-normal text-brand-400">/month</span></p>
          <p className="text-white/40 text-xs mt-0.5">needed to reach your goal</p>
        </div>

        <button onClick={() => onAskAI(`My goal is to save ${fmt(goal)} in ${years} years. I already have ${fmt(saved)} saved. I need to invest ${fmt(monthly)}/month at ${rate}% return. What's the best way to invest this monthly amount?`)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98]">
          Ask Finsight how to invest →
        </button>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">Year-by-Year Progress</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={milestones} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <YAxis tickFormatter={fmt} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} width={55} />
            <Tooltip content={<CustomBar />} />
            <Bar dataKey="saved" name="Savings" radius={[6, 6, 0, 0]} fill="#00e676" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between text-xs px-1">
          <span className="text-white/30">Target: <span className="text-brand-400 font-bold">{fmt(goal)}</span></span>
          <span className="text-white/30">{years}yr at {rate}%</span>
        </div>
      </div>
    </div>
  )
}

// ── Emergency Fund tab ────────────────────────────────────────────────────────
function EmergencyFundCalc({ onAskAI }) {
  const [monthly, setMonthly]   = useState(40000)
  const [months, setMonths]     = useState(6)
  const [existing, setExisting] = useState(0)

  const target   = monthly * months
  const gap      = Math.max(target - existing, 0)
  const covered  = existing >= target

  const pieData = [
    { name: 'Have', value: Math.min(existing, target) },
    { name: 'Need', value: gap },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass rounded-2xl p-5 space-y-5">
        <h3 className="text-white font-bold text-sm">Emergency Fund Calculator</h3>
        {[
          { label: 'Monthly Expenses', value: monthly, set: setMonthly, min: 10000, max: 500000, step: 5000, fmt: v => fmt(v) + '/mo' },
          { label: 'Months of Cover', value: months, set: setMonths, min: 3, max: 12, step: 1, fmt: v => v + ' months' },
          { label: 'Already Saved', value: existing, set: setExisting, min: 0, max: target || 500000, step: 10000, fmt: v => fmt(v) },
        ].map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/50">{s.label}</span>
              <span className="text-brand-400 font-bold">{s.fmt(s.value)}</span>
            </div>
            <input type="range" className={slider} min={s.min} max={s.max} step={s.step}
              value={s.value} onChange={e => s.set(+e.target.value)} />
          </div>
        ))}

        <div className={`rounded-xl p-3 text-center border ${covered ? 'bg-brand-500/10 border-brand-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          {covered ? (
            <>
              <p className="text-brand-300 font-bold text-sm">✅ You're covered!</p>
              <p className="text-white/40 text-xs mt-0.5">Target: {fmt(target)}</p>
            </>
          ) : (
            <>
              <p className="text-red-300 font-bold text-sm">Gap: {fmt(gap)}</p>
              <p className="text-white/40 text-xs mt-0.5">Target: {fmt(target)}</p>
            </>
          )}
        </div>

        <button onClick={() => onAskAI(`My monthly expenses are ${fmt(monthly)}. I need a ${months}-month emergency fund of ${fmt(target)}. I currently have ${fmt(existing)} saved. Where should I keep my emergency fund to get good returns with instant access?`)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98]">
          Ask Finsight where to keep it →
        </button>
      </div>

      <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center space-y-3">
        <h3 className="text-white font-bold text-sm self-start">Fund Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
              <Cell fill="#00e676" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#1a2225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
            <Legend formatter={(v, e) => <span style={{ color: e.color, fontSize: '11px' }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-white/30 text-xs text-center">
          {covered ? 'Fully funded' : `${Math.round((existing / target) * 100)}% of target funded`}
        </p>
      </div>
    </div>
  )
}

// ── Tabs config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'sip',       label: 'SIP',            icon: '📈' },
  { id: 'emi',       label: 'EMI',            icon: '🏠' },
  { id: 'goal',      label: 'Savings Goal',   icon: '🎯' },
  { id: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
]

// ── Main export ───────────────────────────────────────────────────────────────
export default function CalculatorsPage({ onAskAI }) {
  const [tab, setTab] = useState('sip')

  return (
    <div className="flex-1 overflow-y-auto bg-surface-900">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Calculators</h1>
          <p className="text-white/40 text-sm mt-1">Interactive financial calculators with visual breakdowns</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                tab === t.id
                  ? 'bg-brand-500/20 border border-brand-400/40 text-brand-300'
                  : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.07]'
              }`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'sip'       && <SIPCalc       onAskAI={onAskAI} />}
        {tab === 'emi'       && <EMICalc        onAskAI={onAskAI} />}
        {tab === 'goal'      && <SavingsGoalCalc onAskAI={onAskAI} />}
        {tab === 'emergency' && <EmergencyFundCalc onAskAI={onAskAI} />}
      </div>
    </div>
  )
}
