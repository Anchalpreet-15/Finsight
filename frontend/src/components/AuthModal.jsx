import { useState } from 'react'
import { loginUser, registerUser } from '../services/api'

export default function AuthModal({ onSuccess, onClose }) {
  const [tab, setTab]         = useState('login')   // 'login' | 'register'
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => { setError(''); setLoading(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = tab === 'login'
        ? await loginUser(email, password)
        : await registerUser(name, email, password)
      onSuccess(data.user, data.token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-surface-900 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-base">₹</span>
              </div>
              <div>
                <h2 className="text-white font-extrabold text-sm leading-none">Finsight</h2>
                <p className="gradient-text text-[11px] font-semibold mt-0.5">AI Finance Advisor</p>
              </div>
            </div>
            <button onClick={onClose}
              className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-surface-950/60 rounded-xl p-1 gap-1">
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); reset() }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all capitalize ${
                  tab === t
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/25'
                    : 'text-white/35 hover:text-white/60'
                }`}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          {tab === 'register' && (
            <div>
              <label className="text-white/40 text-xs font-medium block mb-1.5">Full Name</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full bg-surface-950/60 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-brand-500/50 focus:bg-surface-950/80 transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-white/40 text-xs font-medium block mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface-950/60 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-brand-500/50 focus:bg-surface-950/80 transition-all"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs font-medium block mb-1.5">Password</label>
            <input
              type="password" required value={password} onChange={e => setPass(e.target.value)}
              placeholder={tab === 'register' ? 'Min. 6 characters' : '••••••••'}
              className="w-full bg-surface-950/60 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-brand-500/50 focus:bg-surface-950/80 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg mt-1">
            {loading
              ? (tab === 'login' ? 'Signing in…' : 'Creating account…')
              : (tab === 'login' ? 'Sign In' : 'Create Account')}
          </button>

          <p className="text-white/20 text-xs text-center pt-1">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); reset() }}
              className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
