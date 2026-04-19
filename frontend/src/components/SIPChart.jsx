/**
 * SIPChart.jsx — SIP growth visualisation.
 * Line chart: corpus growth at 7%, 10%, 12%, 15% over time.
 * Also shows total amount invested as a reference area.
 */
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart
} from 'recharts'

const RATES  = [
  { rate: 7,  color: '#94a3b8', label: '7% (Conservative)' },
  { rate: 10, color: '#2dd4bf', label: '10% (Moderate)' },
  { rate: 12, color: '#00e676', label: '12% (Aggressive)' },
  { rate: 15, color: '#f59e0b', label: '15% (Equity Best)' },
]

function sipCorpus(monthly, ratePercent, years) {
  const r = ratePercent / 100 / 12
  const n = years * 12
  if (r === 0) return monthly * n
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

function formatY(val) {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(1)}Cr`
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)}L`
  return `₹${(val / 1000).toFixed(0)}K`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs space-y-1.5 border border-brand-500/20 shadow-xl min-w-[180px]">
      <p className="text-white/60 font-semibold border-b border-white/[0.06] pb-1.5 mb-1.5">Year {label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name.split(' ')[0]}</span>
          <span className="text-white font-bold">{formatY(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function SIPChart({ monthly = 5000, maxYears = 30 }) {
  const data = useMemo(() => {
    return Array.from({ length: maxYears }, (_, i) => {
      const yr = i + 1
      const invested = monthly * 12 * yr
      const point = { year: yr, invested }
      RATES.forEach(({ rate, label }) => {
        point[label] = Math.round(sipCorpus(monthly, rate, yr))
      })
      return point
    })
  }, [monthly, maxYears])

  const finalValues = RATES.map(r => ({
    ...r,
    final: Math.round(sipCorpus(monthly, r.rate, maxYears)),
  }))

  return (
    <div className="space-y-4">
      {/* Final value cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {finalValues.map(r => (
          <div key={r.rate} className="glass-light rounded-xl p-3 text-center">
            <p className="font-bold text-sm" style={{ color: r.color }}>{formatY(r.final)}</p>
            <p className="text-white/35 text-[10px] mt-0.5">at {r.rate}% in {maxYears}yr</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass rounded-2xl p-4">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#475569" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              tickFormatter={v => `${v}y`} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              tickFormatter={formatY} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
              formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.5)' }}>{v}</span>} />
            {/* Invested area */}
            <Area type="monotone" dataKey="invested" name="Invested"
              fill="url(#investedGrad)" stroke="#475569" strokeWidth={1.5}
              strokeDasharray="4 4" dot={false} />
            {/* Return lines */}
            {RATES.map(r => (
              <Line key={r.rate} type="monotone" dataKey={r.label}
                stroke={r.color} strokeWidth={2} dot={false}
                activeDot={{ r: 4, fill: r.color }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-white/20 text-[10px] text-center mt-2">
          Monthly SIP: ₹{monthly.toLocaleString('en-IN')} · Returns are indicative, not guaranteed
        </p>
      </div>
    </div>
  )
}
