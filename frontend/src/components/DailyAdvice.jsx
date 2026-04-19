/**
 * DailyAdvice.jsx — Daily financial tip notification card.
 * Fetches from /api/daily-advice, caches in localStorage (per day).
 * Dismissable per session. Shows at the top of the welcome screen.
 */
import { useEffect, useState } from 'react'
import axios from 'axios'

const CACHE_KEY = 'fs_daily_advice'

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getCachedAdvice() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { date, advice } = JSON.parse(raw)
    if (date === getTodayStr()) return advice
    return null
  } catch {
    return null
  }
}

function cacheAdvice(advice) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: getTodayStr(), advice }))
  } catch { /* ignore */ }
}

export default function DailyAdvice() {
  const [advice, setAdvice]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [dismissed, setDismiss] = useState(false)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    const cached = getCachedAdvice()
    if (cached) { setAdvice(cached); setLoading(false); return }

    axios.get('/api/daily-advice')
      .then(res => {
        const text = res.data.advice || ''
        setAdvice(text)
        cacheAdvice(text)
      })
      .catch(() => {
        // Use a generic fallback silently
        setAdvice("Keep 3–6 months of expenses in a liquid fund — not just a savings account. Today's action: Check if your emergency fund earns at least 6% interest.")
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = () => {
    if (!advice) return
    navigator.clipboard?.writeText(advice).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (dismissed || (!loading && !advice)) return null

  return (
    <div className="w-full max-w-lg mx-auto animate-slide-up">
      <div className="glass rounded-2xl p-4 border border-brand-500/20 relative overflow-hidden">

        {/* Ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">💡</span>
            </div>
            <div>
              <p className="text-brand-400 text-xs font-bold uppercase tracking-[0.15em]">Daily Tip</p>
              <p className="text-white/25 text-[10px]">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              title="Copy tip"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150"
            >
              {copied
                ? <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-brand-400"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><rect x="5" y="2" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 5h2M2 8h2M2 11h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><rect x="2" y="4" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              }
            </button>
            <button
              onClick={() => setDismiss(true)}
              title="Dismiss"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-white/[0.06] rounded-full w-full animate-pulse" />
            <div className="h-3 bg-white/[0.06] rounded-full w-4/5 animate-pulse" />
            <div className="h-3 bg-white/[0.06] rounded-full w-3/5 animate-pulse" />
          </div>
        ) : (
          <p className="text-white/75 text-sm leading-relaxed">{advice}</p>
        )}

        {/* Current affairs badge */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse flex-shrink-0" />
          <span className="text-white/25 text-[10px]">Based on current market &amp; economic conditions</span>
        </div>
      </div>
    </div>
  )
}
