/**
 * InvestmentViz.jsx — Inline investment visualisation rendered inside ChatBubble.
 * Triggered when AI response contains INVEST_VIZ:{...} JSON block.
 * Shows: Asset Allocation donut | Sector Allocation donut | 10-yr Projection line
 */
import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ComposedChart, Area
} from 'recharts'

// ── Colour palettes ───────────────────────────────────────────────────────────
const ASSET_COLORS  = ['#00e676', '#2dd4bf', '#f59e0b', '#a78bfa']
const SECTOR_COLORS = ['#00e676', '#2dd4bf', '#f59e0b', '#f472b6', '#60a5fa', '#fb923c', '#a3e635', '#e879f9']

const RETURN_RATES = { conservative: 8, moderate: 11, aggressive: 14 }

function sipCorpus(monthly, ratePercent, years) {
  const r = ratePercent / 100 / 12
  const n = years * 12
  if (r === 0) return monthly * n
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

function fmt(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="glass rounded-xl p-2.5 text-xs border border-white/10 shadow-xl">
      <p style={{ color: d.payload.fill || d.fill }} className="font-semibold">{d.name}</p>
      <p className="text-white font-bold">{d.value}%</p>
      {d.payload.why && <p className="text-white/40 mt-1 max-w-[150px] leading-relaxed">{d.payload.why}</p>}
    </div>
  )
}

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs border border-brand-500/20 shadow-xl min-w-[160px]">
      <p className="text-white/50 font-semibold mb-1.5 border-b border-white/[0.06] pb-1.5">Year {label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ data, colors, title, centerLabel }) {
  const dataWithColor = data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }))
  return (
    <div className="space-y-2">
      <p className="text-white/60 text-xs font-semibold text-center">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={dataWithColor} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
            paddingAngle={2} dataKey="value">
            {dataWithColor.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="space-y-1 px-2">
        {dataWithColor.map(d => (
          <div key={d.name} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
              <span className="text-white/60 truncate max-w-[130px]">{d.name}</span>
            </div>
            <span className="font-bold" style={{ color: d.fill }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Projection chart ──────────────────────────────────────────────────────────
function ProjectionChart({ monthly, years = 10 }) {
  const data = useMemo(() => (
    Array.from({ length: years }, (_, i) => {
      const yr = i + 1
      return {
        year:     yr,
        invested: monthly * 12 * yr,
        conservative: Math.round(sipCorpus(monthly, RETURN_RATES.conservative, yr)),
        moderate:     Math.round(sipCorpus(monthly, RETURN_RATES.moderate,     yr)),
        aggressive:   Math.round(sipCorpus(monthly, RETURN_RATES.aggressive,   yr)),
      }
    })
  ), [monthly, years])

  return (
    <div className="space-y-2">
      <p className="text-white/60 text-xs font-semibold text-center">10-Year Growth Projection</p>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#475569" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={v => `${v}y`} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={fmt} width={50} />
          <Tooltip content={<LineTooltip />} />
          <Area type="monotone" dataKey="invested" name="Invested"
            fill="url(#investGrad)" stroke="#475569" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          <Line type="monotone" dataKey="conservative" name="Conservative (8%)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="moderate"     name="Moderate (11%)"    stroke="#2dd4bf" strokeWidth={2}   dot={false} />
          <Line type="monotone" dataKey="aggressive"   name="Aggressive (14%)"  stroke="#00e676" strokeWidth={2}   dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 flex-wrap">
        {[
          { label: 'Conservative', color: '#94a3b8', key: 'conservative' },
          { label: 'Moderate',     color: '#2dd4bf', key: 'moderate'     },
          { label: 'Aggressive',   color: '#00e676', key: 'aggressive'   },
        ].map(s => (
          <div key={s.key} className="text-center">
            <p className="text-[10px] font-bold" style={{ color: s.color }}>{fmt(data[years - 1][s.key])}</p>
            <p className="text-white/25 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InvestmentViz({ data }) {
  const { amount, monthly, asset_allocation, sector_allocation, summary } = data

  const displayMonthly = monthly || amount || 5000

  return (
    <div className="mt-3 space-y-4 border-t border-brand-500/20 pt-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-brand-500/20 flex items-center justify-center text-xs flex-shrink-0">📊</span>
        <p className="text-brand-400 text-xs font-bold uppercase tracking-[0.15em]">Investment Visualisation</p>
      </div>

      {summary && (
        <p className="text-white/50 text-xs leading-relaxed">{summary}</p>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Asset allocation */}
        {asset_allocation?.length > 0 && (
          <div className="glass-light rounded-xl p-3">
            <DonutChart
              data={asset_allocation}
              colors={ASSET_COLORS}
              title="Asset Allocation"
            />
          </div>
        )}

        {/* Sector allocation */}
        {sector_allocation?.length > 0 && (
          <div className="glass-light rounded-xl p-3">
            <DonutChart
              data={sector_allocation}
              colors={SECTOR_COLORS}
              title="Equity Sector Split"
            />
          </div>
        )}
      </div>

      {/* Projection */}
      <div className="glass-light rounded-xl p-3">
        <ProjectionChart monthly={displayMonthly} years={10} />
        <p className="text-white/20 text-[10px] text-center mt-2">
          Monthly investment: {fmt(displayMonthly)} · Returns are indicative
        </p>
      </div>
    </div>
  )
}

// ── Parser: extract INVEST_VIZ block from AI text ─────────────────────────────
// Uses brace-depth counting instead of a regex so nested JSON is handled correctly.
export function extractInvestViz(text) {
  const prefixMatch = text.match(/INVEST_VIZ:\s*\{/i)
  if (!prefixMatch) return { clean: text, vizData: null }

  const jsonStart = prefixMatch.index + prefixMatch[0].lastIndexOf('{')
  let depth = 0
  let inString = false
  let jsonEnd = -1

  for (let i = jsonStart; i < text.length; i++) {
    const c = text[i]
    if (c === '"' && text[i - 1] !== '\\') inString = !inString
    if (!inString) {
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) { jsonEnd = i + 1; break }
      }
    }
  }

  if (jsonEnd === -1) return { clean: text, vizData: null }

  try {
    const vizData = JSON.parse(text.slice(jsonStart, jsonEnd))
    const clean = (text.slice(0, prefixMatch.index) + text.slice(jsonEnd)).trim()
    return { clean, vizData }
  } catch {
    return { clean: text, vizData: null }
  }
}
