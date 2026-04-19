/**
 * AgentActivity.jsx — Shows which financial tools the agent used for this response.
 * Premium dark collapsible design with gradient accents.
 */
import { useState } from 'react'

export default function AgentActivity({ steps }) {
  const [expanded, setExpanded] = useState(false)

  if (!steps || steps.length === 0) return null

  const stepLabel = steps.length === 1
    ? `Used ${steps[0].label}`
    : `Used ${steps.length} tools`

  return (
    <div className="mb-2">
      {/* Collapsed trigger */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors duration-200 group"
      >
        {/* Animated dots */}
        <span className="flex items-center gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-accent-400"
              style={{ opacity: 0.4 + i * 0.25 }}
            />
          ))}
        </span>

        <span className="font-medium gradient-text">
          {stepLabel}
        </span>

        {/* Expand/collapse arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expanded tool details */}
      {expanded && (
        <div className="mt-2.5 space-y-2 ml-4 border-l-2 border-brand-500/20 pl-3">
          {steps.map((step, i) => (
            <div key={i} className="glass rounded-xl p-3">
              {/* Tool header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{step.icon}</span>
                <span className="text-xs font-semibold text-brand-300">{step.label}</span>
                <span className="ml-auto bg-brand-500/10 text-brand-400 text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border border-brand-500/15">
                  {step.tool}
                </span>
              </div>
              {/* Tool result */}
              <pre className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap font-mono bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 overflow-auto max-h-48">
                {step.result}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
