/**
 * Onboarding.jsx — Multi-step financial profile questionnaire.
 * Premium dark-themed glassmorphism design with micro-animations.
 */
import { useState } from 'react'

const STEPS = [
  {
    id:       'age',
    step:     1,
    emoji:    '👋',
    headline: 'First, how old are you?',
    sub:      'Helps me suggest the right investment horizon for you.',
    options:  [
      { label: '18 – 25 years', value: '18-25',  icon: '🌱', desc: 'Early starter' },
      { label: '26 – 35 years', value: '26-35',  icon: '💪', desc: 'Building years' },
      { label: '36 – 45 years', value: '36-45',  icon: '🏡', desc: 'Growth phase' },
      { label: '45+ years',     value: '45+',    icon: '⭐', desc: 'Pre-retirement' },
    ],
  },
  {
    id:       'income',
    step:     2,
    emoji:    '💰',
    headline: "What's your monthly take-home?",
    sub:      'No judgment — this helps me give you accurate, realistic advice.',
    options:  [
      { label: 'Below ₹25,000',        value: 'below-25k', icon: '🌿', desc: 'Starting out' },
      { label: '₹25,000 – ₹50,000',    value: '25k-50k',   icon: '📈', desc: 'Growing income' },
      { label: '₹50,000 – ₹1,00,000',  value: '50k-1L',    icon: '💼', desc: 'Mid-level' },
      { label: 'Above ₹1,00,000',       value: 'above-1L',  icon: '🚀', desc: 'High earner' },
    ],
  },
  {
    id:       'savings',
    step:     3,
    emoji:    '🏦',
    headline: 'How do you currently save?',
    sub:      "I'll recommend the best savings instruments for your profile.",
    options:  [
      { label: 'Savings Account',         value: 'savings-account', icon: '🏦', desc: 'Bank savings only' },
      { label: 'Fixed / Recurring Deposit', value: 'fd-rd',         icon: '📅', desc: 'FD or RD in bank' },
      { label: 'Mutual Funds / SIP',       value: 'mutual-funds',   icon: '📊', desc: 'Market-linked' },
      { label: 'PPF / NPS / EPF',          value: 'ppf-nps',        icon: '🔒', desc: 'Long-term lock-in' },
    ],
  },
  {
    id:       'goal',
    step:     4,
    emoji:    '🎯',
    headline: "What's your #1 financial goal?",
    sub:      "I'll personalise everything around this one goal.",
    options:  [
      { label: 'Save more money',        value: 'save',      icon: '🏦', desc: 'Build a buffer' },
      { label: 'Get out of debt / EMIs', value: 'debt-free', icon: '🔓', desc: 'Clear the load' },
      { label: 'Start investing',        value: 'invest',    icon: '📊', desc: 'Grow wealth' },
      { label: 'Buy a home or vehicle',  value: 'buy-asset', icon: '🏠', desc: 'Big purchase' },
    ],
  },
  {
    id:       'challenge',
    step:     5,
    emoji:    '🤝',
    headline: 'What feels hardest right now?',
    sub:      'Be honest — this stays between us.',
    options:  [
      { label: 'Salary runs out before month-end', value: 'salary-gone',        icon: '💸', desc: 'Cash crunch' },
      { label: "Don't know where to invest",       value: 'investing-confused', icon: '🤔', desc: 'Knowledge gap' },
      { label: 'Too many EMIs to manage',          value: 'too-many-emis',      icon: '😰', desc: 'Debt load' },
      { label: 'No savings at all right now',      value: 'no-savings',         icon: '😔', desc: 'Starting fresh' },
    ],
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep]         = useState(0)
  const [answers, setAnswers]   = useState({})
  const [selected, setSelected] = useState(null)
  const [animating, setAnimating] = useState(false)

  const current  = STEPS[step]
  const isLast   = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  const handleSelect = (value) => {
    setSelected(value)
  }

  const handleNext = () => {
    if (!selected || animating) return
    const newAnswers = { ...answers, [current.id]: selected }
    setAnswers(newAnswers)
    if (isLast) { onComplete(newAnswers); return }

    setAnimating(true)
    setTimeout(() => {
      setStep((s) => s + 1)
      setSelected(null)
      setAnimating(false)
    }, 250)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-900 relative overflow-hidden">

      {/* Background ambient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-500/8 blur-[100px]" />
      </div>

      {/* ── Left panel (brand + context) ─── */}
      <div className="hidden lg:flex flex-col justify-between w-80 xl:w-96 bg-surface-950/80 backdrop-blur-xl p-10 flex-shrink-0 border-r border-white/5 relative z-10">

        {/* Brand */}
        <div>
          <div className="flex items-center gap-3.5 mb-12">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-xl brand-glow">
                <span className="text-white text-xl font-black">₹</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-500 rounded-full border-2 border-surface-950" />
            </div>
            <div>
              <h1 className="text-brand-500 font-extrabold text-xl leading-none tracking-tight">Finsight</h1>
              <p className="text-accent-500 text-xs mt-1 font-semibold">AI-Powered Finance</p>
            </div>
          </div>

          {/* Value props */}
          <div className="space-y-5">
            {[
              { icon: '🔒', title: 'Completely Private', desc: 'Your data never leaves your device.' },
              { icon: '🇮🇳', title: 'Built for India', desc: 'SIP, PPF, ELSS, CIBIL — we speak your language.' },
              { icon: '💬', title: 'No Judgment', desc: 'Talk about money without embarrassment.' },
              { icon: '🧠', title: 'Emotionally Smart', desc: 'I understand how you feel, not just what you ask.' },
            ].map((v) => (
              <div key={v.title} className="flex items-start gap-3.5 group">
                <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200">{v.icon}</span>
                <div>
                  <p className="text-white/90 font-semibold text-sm">{v.title}</p>
                  <p className="text-white/40 text-xs leading-relaxed mt-0.5">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress steps */}
        <div className="mt-10">
          <p className="text-white/30 text-[10px] mb-4 uppercase tracking-[0.2em] font-semibold">Setup Progress</p>
          <div className="space-y-2.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all duration-300 ${
                  i < step  ? 'bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold shadow-md shadow-brand-500/30'
                : i === step ? 'bg-brand-500/15 border-2 border-brand-400 text-brand-300 font-bold'
                : 'bg-white/5 border border-white/10 text-white/30'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs transition-colors duration-300 ${i === step ? 'text-white font-medium' : i < step ? 'text-white/50' : 'text-white/25'}`}>
                  {s.headline}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative z-10">

        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg brand-glow">
              <span className="text-white text-lg font-black">₹</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-500 rounded-full border-2 border-surface-900" />
          </div>
          <div>
            <h1 className="text-brand-500 font-extrabold text-lg leading-none">Finsight</h1>
            <p className="text-accent-500 text-xs mt-0.5 font-semibold">AI-Powered Finance</p>
          </div>
        </div>

        {/* Mobile progress bar */}
        <div className="lg:hidden w-full max-w-md mb-6">
          <div className="flex justify-between text-xs text-white/40 mb-2">
            <span className="font-medium">Step {step + 1} of {STEPS.length}</span>
            <span className="text-brand-400 font-semibold">{Math.round(progress)}% done</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step card */}
        <div
          className={`w-full max-w-md glass rounded-3xl p-7 transition-all duration-250 ${
            animating ? 'opacity-0 translate-y-4 scale-[0.97]' : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          {/* Step emoji + headline */}
          <div className="mb-6">
            <div className="text-4xl mb-3 animate-float" style={{ animationDuration: '3s' }}>{current.emoji}</div>
            <h2 className="text-white text-xl font-bold leading-tight mb-1.5">{current.headline}</h2>
            <p className="text-white/45 text-sm leading-relaxed">{current.sub}</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            {current.options.map((opt) => {
              const isSelected = selected === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.97] hover-lift ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-400/60 shadow-lg shadow-brand-500/10 option-selected'
                      : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{opt.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-sm leading-tight ${isSelected ? 'text-brand-300' : 'text-white/80'}`}>
                      {opt.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-brand-400/60' : 'text-white/30'}`}>{opt.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    isSelected ? 'bg-gradient-to-br from-brand-500 to-accent-500 border-transparent' : 'border-white/20'
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Continue / Get started */}
          <button
            onClick={handleNext}
            disabled={!selected}
            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 ${
              selected
                ? 'bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-500 hover:to-accent-400 text-white shadow-xl shadow-brand-500/25 active:scale-[0.98]'
                : 'bg-white/5 text-white/25 cursor-not-allowed border border-white/[0.06]'
            }`}
          >
            {isLast ? '🚀  Get Started' : 'Continue →'}
          </button>
        </div>

        {/* Skip link */}
        <button
          onClick={() => onComplete({})}
          className="mt-5 text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-4"
        >
          Skip setup — start chatting now
        </button>
      </div>
    </div>
  )
}
