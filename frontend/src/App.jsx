/**
 * App.jsx — Root component.
 * Navigation: Chat | Calculators | Tax | Loans | FD & RD
 * Sidebar: profile, goal, history panel, quick prompts
 * Voice: mic input + TTS output
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import ChatBubble       from './components/ChatBubble'
import ChatInput        from './components/ChatInput'
import LoadingAnimation from './components/LoadingAnimation'
import Onboarding       from './components/Onboarding'
import DailyAdvice      from './components/DailyAdvice'
import LoansPage        from './components/LoansPage'
import FDRDPage         from './components/FDRDPage'
import CalculatorsPage  from './components/CalculatorsPage'
import TaxPage          from './components/TaxPage'
import HistoryPanel, { saveSessionToHistory, getStoredSessions } from './components/HistoryPanel'
import AuthModal        from './components/AuthModal'
import { useChat }      from './hooks/useChat'
import { useAuth }      from './hooks/useAuth'
import axios            from 'axios'

// ── Static data ───────────────────────────────────────────────────────────────
const PROMPTS_BY_GOAL = {
  save: [
    { text: 'Where does my salary disappear every month?', icon: '💸' },
    { text: 'How do I build an emergency fund?',           icon: '🛡️' },
    { text: 'How to make a monthly budget?',              icon: '📋' },
    { text: 'What is the 50/30/20 rule?',                 icon: '📊' },
  ],
  'debt-free': [
    { text: 'My credit card bill is way too high',        icon: '💳' },
    { text: 'Which EMI should I pay off first?',          icon: '📅' },
    { text: 'How do I improve my CIBIL score?',           icon: '📈' },
    { text: 'How do I get out of a personal loan?',       icon: '🔓' },
  ],
  invest: [
    { text: 'How to start a SIP with just ₹500?',         icon: '🌱' },
    { text: 'What is the difference between PPF and ELSS?', icon: '🔍' },
    { text: 'What are index funds?',                      icon: '📊' },
    { text: 'How do I open a Zerodha account?',           icon: '💼' },
  ],
  'buy-asset': [
    { text: 'How much salary do I need for a home loan?', icon: '🏠' },
    { text: 'How do I save for a down payment?',          icon: '💰' },
    { text: 'Should I buy a home or car first?',          icon: '🚗' },
    { text: 'How much EMI can I safely afford?',          icon: '📐' },
  ],
  default: [
    { text: 'I got paid but I am broke again',            icon: '😅' },
    { text: 'How do I start a SIP?',                      icon: '🌱' },
    { text: 'My credit card bill is too high',            icon: '💳' },
    { text: 'PPF vs ELSS — which is better?',             icon: '⚖️' },
  ],
}

const GOAL_META = {
  save:        { label: 'Save More Money',   icon: '🏦' },
  'debt-free': { label: 'Get Debt-Free',     icon: '🔓' },
  invest:      { label: 'Start Investing',   icon: '📊' },
  'buy-asset': { label: 'Buy a Home or Car', icon: '🏠' },
}
const INCOME_LABELS  = { 'below-25k': 'Below ₹25k', '25k-50k': '₹25k–50k', '50k-1L': '₹50k–1L', 'above-1L': 'Above ₹1L' }
const AGE_LABELS     = { '18-25': '18–25', '26-35': '26–35', '36-45': '36–45', '45+': '45+' }
const SAVINGS_LABELS = { 'savings-account': 'Savings A/c', 'fd-rd': 'FD / RD', 'mutual-funds': 'Mutual Funds', 'ppf-nps': 'PPF / NPS' }

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'chat',  label: 'Chat',        mobileLabel: 'Chat',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/></svg> },
  { id: 'calc',  label: 'Calculators', mobileLabel: 'Calc',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7z" clipRule="evenodd"/></svg> },
  { id: 'tax',   label: 'Tax',         mobileLabel: 'Tax',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg> },
  { id: 'loans', label: 'Loans',       mobileLabel: 'Loans',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/></svg> },
  { id: 'fdrd',  label: 'FD & RD',     mobileLabel: 'FD/RD',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/></svg> },
]

// ── TTS helper ────────────────────────────────────────────────────────────────
function speakText(text, onEnd) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const clean = text
    .replace(/INVEST_VIZ:\s*\{[\s\S]*?\}/i, '')
    .replace(/SUGGESTIONS:.*$/im, '')
    .replace(/[*#_`~>]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 600)
  const utt = new SpeechSynthesisUtterance(clean)
  utt.lang = 'en-IN'; utt.rate = 0.95; utt.pitch = 1.0
  const voices = window.speechSynthesis.getVoices()
  const pref = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'))
  if (pref) utt.voice = pref
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { user, login, logout } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fs_profile')) } catch { return null }
  })
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('fs_session_id') || null)
  const [view, setView]           = useState('chat')
  const [sidePanel, setSidePanel] = useState('prompts')  // 'prompts' | 'history'
  const [voiceMode, setVoiceMode] = useState(() => localStorage.getItem('fs_voice') === '1')
  const [isSpeaking, setSpeak]    = useState(false)
  const prevMsgCount              = useRef(0)
  const savedFirstMsg             = useRef(false)

  useEffect(() => { if (sessionId) localStorage.setItem('fs_session_id', sessionId) }, [sessionId])
  useEffect(() => { localStorage.setItem('fs_voice', voiceMode ? '1' : '0') }, [voiceMode])

  const { messages, isLoading, suggestions, sendChatMessage, loadHistory } = useChat(sessionId, setSessionId, profile)

  // Save first user message to history
  useEffect(() => {
    if (savedFirstMsg.current || !sessionId || messages.length === 0) return
    const first = messages.find(m => m.role === 'user')
    if (first) { saveSessionToHistory(sessionId, first.content); savedFirstMsg.current = true }
  }, [messages, sessionId])

  // Auto-speak new AI messages
  useEffect(() => {
    if (!voiceMode || messages.length === 0) return
    const newCount = messages.length
    if (newCount <= prevMsgCount.current) { prevMsgCount.current = newCount; return }
    prevMsgCount.current = newCount
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant' && last?.content) {
      setSpeak(true)
      speakText(last.content, () => setSpeak(false))
    }
  }, [messages, voiceMode])

  const bottomRef = useRef(null)
  const mainRef   = useRef(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  useEffect(() => {
    if (view === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, view])

  const handleScroll = useCallback(() => {
    const el = mainRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200)
  }, [])

  const handleNewChat = () => {
    localStorage.removeItem('fs_session_id')
    localStorage.removeItem('fs_profile')
    setSessionId(null); setProfile(null)
    window.location.reload()
  }

  const handleLoadSession = useCallback(async (id) => {
    setView('chat')
    setSidePanel('prompts')
    try {
      const res = await axios.get(`/api/history/${id}`)
      if (res.data?.messages?.length > 0) {
        loadHistory(id, res.data.messages)
      }
    } catch { /* silently ignore */ }
  }, [loadHistory])

  const handleAskFromPage = useCallback((question) => {
    setView('chat')
    setTimeout(() => sendChatMessage(question), 100)
  }, [sendChatMessage])

  if (!profile) return <Onboarding onComplete={(a) => { localStorage.setItem('fs_profile', JSON.stringify(a)); setProfile(a) }} />

  const prompts  = PROMPTS_BY_GOAL[profile.goal] || PROMPTS_BY_GOAL.default
  const goalMeta = GOAL_META[profile.goal] || { label: 'Financial Freedom', icon: '💪' }
  const historyCount = getStoredSessions().length

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900 relative">
      {showAuth && (
        <AuthModal
          onSuccess={(userData, token) => { login(userData, token); setShowAuth(false) }}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] w-[500px] h-[500px] rounded-full bg-brand-600/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-accent-500/6 blur-[100px]" />
      </div>

      {/* ── Desktop Sidebar ───────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-surface-950/80 backdrop-blur-xl flex-shrink-0 border-r border-white/[0.04] relative z-10">

        {/* Brand */}
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg brand-glow">
                <span className="text-white text-lg font-black">₹</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-500 rounded-full border-2 border-surface-950" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-base leading-none tracking-tight">Finsight</h1>
              <p className="gradient-text text-xs mt-0.5 font-semibold">AI Finance Advisor</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3 py-3 border-b border-white/[0.04]">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  view === item.id
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                }`}>
                <span className={view === item.id ? 'text-brand-400' : 'text-white/25'}>{item.icon}</span>
                {item.label}
                {item.id === 'chat' && messages.length > 0 && (
                  <span className="ml-auto text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full">{messages.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Profile */}
        {(profile.age || profile.income) && (
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">Your Profile</p>
            <div className="glass-light rounded-xl p-3 space-y-1.5">
              {profile.age    && <div className="flex justify-between text-xs"><span className="text-white/35">Age</span><span className="text-white/80 font-semibold">{AGE_LABELS[profile.age]}</span></div>}
              {profile.income && <div className="flex justify-between text-xs"><span className="text-white/35">Income</span><span className="text-white/80 font-semibold">{INCOME_LABELS[profile.income]}</span></div>}
              {profile.savings && <div className="flex justify-between text-xs"><span className="text-white/35">Saves via</span><span className="text-white/80 font-semibold">{SAVINGS_LABELS[profile.savings]}</span></div>}
            </div>
          </div>
        )}

        {/* Goal */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <span className="text-lg">{goalMeta.icon}</span>
            <span className="text-brand-300 font-semibold text-xs leading-tight">{goalMeta.label}</span>
          </div>
        </div>

        {/* Prompts / History toggle */}
        <div className="px-3 pt-3 pb-1 flex gap-1.5">
          {[
            { id: 'prompts', label: 'Quick Ask' },
            { id: 'history', label: `History${historyCount > 0 ? ` (${historyCount})` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setSidePanel(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                sidePanel === t.id
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {sidePanel === 'prompts' ? (
            <div className="h-full overflow-y-auto px-3 py-2 space-y-0.5">
              {prompts.map(p => (
                <button key={p.text} onClick={() => { setView('chat'); sendChatMessage(p.text) }}
                  className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl text-white/40 hover:text-white/90 hover:bg-white/[0.04] transition-all group">
                  <span className="text-base flex-shrink-0 mt-px group-hover:scale-110 transition-transform">{p.icon}</span>
                  <span className="text-xs leading-relaxed group-hover:text-white/80">{p.text}</span>
                </button>
              ))}
            </div>
          ) : (
            <HistoryPanel
              currentSessionId={sessionId}
              onLoadSession={handleLoadSession}
              onNewChat={handleNewChat}
            />
          )}
        </div>

        {/* User / Login */}
        <div className="px-4 pt-3 pb-1 border-t border-white/[0.04]">
          {user ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass-light">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white text-sm font-bold">{user.name[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-xs font-semibold truncate">{user.name}</p>
                <p className="text-white/30 text-[10px] truncate">{user.email}</p>
              </div>
              <button onClick={logout} title="Sign out"
                className="text-white/25 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/[0.06] flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd"/>
                  <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/35 text-brand-300 hover:text-brand-200 text-xs font-semibold transition-all active:scale-[0.98]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd"/>
              </svg>
              Sign In / Register
            </button>
          )}
        </div>

        {/* New Chat */}
        <div className="px-4 py-3">
          <button onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/50 hover:text-white text-xs font-medium transition-all active:scale-[0.98]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
            New Chat
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 relative z-10">

        {/* Mobile header */}
        <header className="lg:hidden bg-surface-900/90 backdrop-blur-xl border-b border-white/[0.04] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white text-sm font-black">₹</span>
            </div>
            <div>
              <h1 className="text-white font-extrabold text-sm leading-none">Finsight</h1>
              <p className="text-accent-400 text-xs mt-0.5 font-medium">Online · Ready</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 font-medium">
              {goalMeta.icon} {goalMeta.label}
            </span>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">{user.name[0].toUpperCase()}</span>
                </div>
                <button onClick={logout}
                  className="text-xs text-white/40 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg transition-all font-medium border border-white/[0.06]">
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="text-xs text-brand-300 hover:text-brand-200 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1.5 rounded-lg transition-all font-semibold border border-brand-500/20">
                Sign In
              </button>
            )}
            <button onClick={handleNewChat}
              className="text-xs text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-all font-medium border border-white/[0.06]">
              + New
            </button>
          </div>
        </header>

        {/* ── Page views ─────────────────────────────────────────── */}
        {view === 'loans' && <LoansPage       onAskAI={handleAskFromPage} />}
        {view === 'fdrd'  && <FDRDPage         onAskAI={handleAskFromPage} />}
        {view === 'calc'  && <CalculatorsPage  onAskAI={handleAskFromPage} />}
        {view === 'tax'   && <TaxPage          onAskAI={handleAskFromPage} />}

        {/* ── Chat view ──────────────────────────────────────────── */}
        {view === 'chat' && (
          <>
            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="bg-accent-500/10 border-b border-accent-500/20 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent-300 text-xs font-medium">
                  <span className="flex gap-0.5 items-center">
                    {[0, 0.15, 0.3].map(d => (
                      <span key={d} className="w-1 h-3 bg-accent-400 rounded-full animate-typing" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </span>
                  Speaking response…
                </div>
                <button onClick={() => { window.speechSynthesis?.cancel(); setSpeak(false) }}
                  className="text-xs text-white/40 hover:text-white/70">Stop</button>
              </div>
            )}

            {/* Messages */}
            <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto relative">
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-1">

                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center py-8 sm:py-12 space-y-8 px-2">
                    <div className="text-center space-y-5">
                      <div className="relative inline-block animate-float" style={{ animationDuration: '5s' }}>
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto shadow-2xl brand-glow">
                          <span className="text-white text-4xl font-black">₹</span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full border-2 border-surface-900 flex items-center justify-center">
                          <svg viewBox="0 0 8 8" fill="none" className="w-3 h-3">
                            <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </div>
                      <div>
                        <h2 className="text-white text-2xl sm:text-3xl font-extrabold mb-3 tracking-tight">
                          Hi! I'm <span className="text-brand-500">Finsight</span> 👋
                        </h2>
                        <p className="text-white/40 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                          Your AI finance advisor. You want to{' '}
                          <span className="text-brand-400 font-semibold">{goalMeta.label.toLowerCase()}</span> — let's figure it out together.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-5 text-xs text-white/25">
                        <span>🔒 Private</span>
                        <span>🇮🇳 India-focused</span>
                        <span>📊 Visual insights</span>
                        <span>🎙️ Voice-enabled</span>
                      </div>
                    </div>

                    <DailyAdvice />

                    <div className="w-full max-w-lg">
                      <p className="text-white/25 text-xs text-center mb-4 font-semibold uppercase tracking-[0.2em]">Try asking me</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {prompts.map(p => (
                          <button key={p.text} onClick={() => sendChatMessage(p.text)}
                            className="flex items-center gap-3 glass hover:bg-white/[0.06] hover:border-brand-500/25 text-left px-4 py-3.5 rounded-2xl transition-all group shadow-sm hover:shadow-lg active:scale-[0.98] hover-lift">
                            <span className="text-xl flex-shrink-0 group-hover:scale-110 transition-transform">{p.icon}</span>
                            <span className="text-white/60 group-hover:text-white/90 text-sm flex-1">{p.text}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/10 group-hover:text-brand-400 flex-shrink-0 transition-all group-hover:translate-x-0.5">
                              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-white/15 text-xs">Ask in English · tap mic to speak 🎙️</p>
                  </div>
                )}

                {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                {isLoading && <LoadingAnimation />}
                <div ref={bottomRef} />
              </div>
            </main>

            {showScrollBtn && (
              <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-28 right-6 z-20 w-10 h-10 flex items-center justify-center glass rounded-full shadow-xl hover:bg-white/[0.08] transition-all active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/50">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {/* Input bar */}
            <div className="bg-surface-900/80 backdrop-blur-xl border-t border-white/[0.04]">
              {suggestions.length > 0 && !isLoading && (
                <div className="max-w-2xl mx-auto px-4 pt-3 pb-1">
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(s => (
                      <button key={s} onClick={() => sendChatMessage(s)}
                        className="flex items-center gap-1.5 bg-brand-500/8 hover:bg-brand-500/15 border border-brand-500/15 hover:border-brand-500/30 text-brand-300 text-xs px-3.5 py-1.5 rounded-full transition-all active:scale-95 font-medium">
                        <span className="text-brand-400 text-[10px]">✦</span>{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="max-w-2xl mx-auto px-4 py-3">
                <ChatInput onSend={sendChatMessage} disabled={isLoading} voiceMode={voiceMode} onVoiceModeChange={setVoiceMode} />
                <p className="text-white/15 text-xs text-center mt-2">Enter to send · Shift+Enter for new line · 🎙️ tap mic to speak</p>
              </div>
            </div>
          </>
        )}

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-950/95 backdrop-blur-xl border-t border-white/[0.06]">
          <div className="flex">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
                  view === item.id ? 'text-brand-400' : 'text-white/30 hover:text-white/60'
                }`}>
                {item.icon}
                <span className="text-[9px] font-medium">{item.mobileLabel}</span>
                {view === item.id && <span className="absolute bottom-0 w-6 h-0.5 bg-brand-500 rounded-full" />}
              </button>
            ))}
          </div>
        </nav>

        <div className="lg:hidden h-14 flex-shrink-0" />
      </div>
    </div>
  )
}
