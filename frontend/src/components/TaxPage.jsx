/**
 * TaxPage.jsx — Old Regime vs New Regime comparison (FY 2024-25).
 * Visual bar chart + breakdown table + winner highlight.
 */
import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts'

// ── Tax calculation logic ─────────────────────────────────────────────────────

function calcNewRegimeTax(income) {
  // FY 2024-25 New Regime slabs (after standard deduction of ₹75,000)
  const taxable = Math.max(income - 75000, 0)
  if (taxable <= 300000)  return 0
  if (taxable <= 700000)  return (taxable - 300000) * 0.05
  if (taxable <= 1000000) return 20000 + (taxable - 700000) * 0.10
  if (taxable <= 1200000) return 50000 + (taxable - 1000000) * 0.15
  if (taxable <= 1500000) return 80000 + (taxable - 1200000) * 0.20
  return 140000 + (taxable - 1500000) * 0.30
}

function calcOldRegimeTax(income, deductions) {
  // Standard deduction ₹50,000 + user deductions
  const taxable = Math.max(income - 50000 - deductions, 0)
  if (taxable <= 250000)  return 0
  if (taxable <= 500000)  return (taxable - 250000) * 0.05
  if (taxable <= 1000000) return 12500 + (taxable - 500000) * 0.20
  return 112500 + (taxable - 1000000) * 0.30
}

// Add 4% cess
function withCess(tax) { return Math.round(tax * 1.04) }

// 87A rebate: if taxable ≤ 7L (new) or ≤ 5L (old), no tax
function applyRebate(tax, taxable, limit) {
  return taxable <= limit ? 0 : tax
}

function fmt(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const slider = "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-white/10"

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-2.5 text-xs border border-white/10 space-y-1">
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const DEDUCTION_ITEMS = [
  { key: 'c80',   label: '80C (PPF/ELSS/LIC)', max: 150000 },
  { key: 'd80',   label: '80D (Health Insurance)', max: 75000 },
  { key: 'hra',   label: 'HRA Exemption', max: 200000 },
  { key: 'hl',    label: 'Home Loan Interest', max: 200000 },
  { key: 'nps',   label: 'NPS 80CCD(1B)', max: 50000 },
  { key: 'other', label: 'Other (80E/80G/etc)', max: 100000 },
]

export default function TaxPage({ onAskAI }) {
  const [income, setIncome] = useState(1200000)
  const [deds, setDeds]     = useState({ c80: 150000, d80: 25000, hra: 0, hl: 0, nps: 50000, other: 0 })

  const totalDed = useMemo(() => Object.values(deds).reduce((a, b) => a + b, 0), [deds])

  const oldTaxRaw = useMemo(() => calcOldRegimeTax(income, totalDed), [income, totalDed])
  const newTaxRaw = useMemo(() => calcNewRegimeTax(income), [income])

  // Apply rebates
  const oldTaxable = Math.max(income - 50000 - totalDed, 0)
  const newTaxable = Math.max(income - 75000, 0)
  const oldFinal   = withCess(applyRebate(oldTaxRaw, oldTaxable, 500000))
  const newFinal   = withCess(applyRebate(newTaxRaw, newTaxable, 700000))

  const saving = Math.abs(oldFinal - newFinal)
  const winner = oldFinal < newFinal ? 'old' : newFinal < oldFinal ? 'new' : 'tie'

  const barData = [
    { name: 'Old Regime', tax: oldFinal, fill: '#f59e0b' },
    { name: 'New Regime', tax: newFinal, fill: '#00e676' },
  ]

  const effectiveOld = income > 0 ? ((oldFinal / income) * 100).toFixed(1) : '0'
  const effectiveNew = income > 0 ? ((newFinal / income) * 100).toFixed(1) : '0'

  return (
    <div className="flex-1 overflow-y-auto bg-surface-900">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Tax Comparison</h1>
          <p className="text-white/40 text-sm mt-1">Old Regime vs New Regime — FY 2024-25 (AY 2025-26)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Inputs */}
          <div className="space-y-4">
            {/* Income slider */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold text-sm">Your Gross Annual Income</h3>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/50">Gross Salary (CTC)</span>
                  <span className="text-brand-400 font-bold">{fmt(income)}</span>
                </div>
                <input type="range" className={slider} min={300000} max={10000000} step={50000}
                  value={income} onChange={e => setIncome(+e.target.value)} />
              </div>
            </div>

            {/* Deductions */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold text-sm">Deductions (Old Regime)</h3>
                <span className="text-brand-400 text-xs font-bold">{fmt(totalDed)} total</span>
              </div>
              {DEDUCTION_ITEMS.map(d => (
                <div key={d.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/45">{d.label}</span>
                    <span className="text-white/70 font-medium">{fmt(deds[d.key])}</span>
                  </div>
                  <input type="range" className={slider} min={0} max={d.max} step={5000}
                    value={deds[d.key]}
                    onChange={e => setDeds(prev => ({ ...prev, [d.key]: +e.target.value }))} />
                </div>
              ))}
              <p className="text-white/25 text-[10px]">
                Standard deduction of ₹50,000 (old) and ₹75,000 (new) applied automatically.
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">

            {/* Winner banner */}
            <div className={`rounded-2xl p-4 border text-center ${
              winner === 'old' ? 'bg-yellow-500/10 border-yellow-500/30'
              : winner === 'new' ? 'bg-brand-500/10 border-brand-500/30'
              : 'bg-white/[0.04] border-white/10'
            }`}>
              {winner === 'tie' ? (
                <p className="text-white/60 font-semibold text-sm">Both regimes give the same tax!</p>
              ) : (
                <>
                  <p className={`font-extrabold text-lg ${winner === 'old' ? 'text-yellow-300' : 'text-brand-300'}`}>
                    {winner === 'old' ? '🏆 Old Regime Wins' : '🏆 New Regime Wins'}
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    You save <span className="text-white font-bold">{fmt(saving)}</span> by choosing the{' '}
                    {winner === 'old' ? 'Old' : 'New'} Regime
                  </p>
                </>
              )}
            </div>

            {/* Bar chart */}
            <div className="glass rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis tickFormatter={fmt} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tax" name="Tax Payable" radius={[8, 8, 0, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Side-by-side breakdown */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Old Regime', tax: oldFinal, eff: effectiveOld, color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/20', isWinner: winner === 'old' },
                { label: 'New Regime', tax: newFinal, eff: effectiveNew, color: 'text-brand-300', bg: 'bg-brand-500/10 border-brand-500/20', isWinner: winner === 'new' },
              ].map(r => (
                <div key={r.label} className={`rounded-2xl p-4 border ${r.bg} ${r.isWinner ? 'ring-1 ring-offset-0 ring-white/10' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 text-xs font-medium">{r.label}</p>
                    {r.isWinner && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/60">Best</span>}
                  </div>
                  <p className={`${r.color} font-extrabold text-lg`}>{fmt(r.tax)}</p>
                  <p className="text-white/30 text-xs mt-1">Effective rate: {r.eff}%</p>
                  <p className="text-white/25 text-[10px] mt-0.5">In-hand: {fmt(income - r.tax)}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => onAskAI(`My gross income is ${fmt(income)}. Under Old Regime I pay ${fmt(oldFinal)} tax (${effectiveOld}% effective) and under New Regime I pay ${fmt(newFinal)} tax (${effectiveNew}% effective). The ${winner === 'tie' ? 'regimes are equal' : winner + ' regime saves me ' + fmt(saving)}. Should I switch regimes? What else can I do to reduce my tax?`)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 text-white text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98]">
              Ask Finsight to optimise my tax →
            </button>
          </div>
        </div>

        {/* Key notes */}
        <div className="glass rounded-2xl p-5 space-y-2">
          <h3 className="text-white font-bold text-sm">📌 Key Points</h3>
          <ul className="space-y-1.5 text-xs text-white/50 leading-relaxed">
            <li>• New Regime: No deductions allowed (80C, HRA, home loan interest etc.) but lower slab rates.</li>
            <li>• Old Regime: All deductions apply. Better if total deductions exceed ~₹3.5L–4L.</li>
            <li>• From FY 2023-24, New Regime is the default. Opt for Old Regime explicitly when filing.</li>
            <li>• Rebate u/s 87A: Zero tax if net taxable income ≤ ₹7L (New) or ₹5L (Old).</li>
            <li>• 4% Health & Education cess is included in the amounts shown above.</li>
          </ul>
        </div>

        <p className="text-white/20 text-[11px] text-center pb-4">
          This is an indicative calculation. Consult a CA for exact tax liability.
        </p>
      </div>
    </div>
  )
}
