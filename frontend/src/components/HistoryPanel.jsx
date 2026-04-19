/**
 * HistoryPanel.jsx — Past chat sessions sidebar panel.
 * Sessions stored in localStorage as fs_sessions[] with id, preview, date.
 * Clicking a session loads it via the passed onLoadSession callback.
 */
import { useEffect, useState } from 'react'

const SESSIONS_KEY = 'fs_sessions'

export function saveSessionToHistory(sessionId, firstMessage) {
  if (!sessionId || !firstMessage) return
  try {
    const sessions = getStoredSessions()
    const exists = sessions.find(s => s.id === sessionId)
    if (exists) return  // already saved
    const entry = {
      id:      sessionId,
      preview: firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : ''),
      date:    new Date().toISOString(),
    }
    // Keep last 20 sessions
    const updated = [entry, ...sessions].slice(0, 20)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

export function getStoredSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []
  } catch {
    return []
  }
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function HistoryPanel({ currentSessionId, onLoadSession, onNewChat }) {
  const [sessions, setSessions] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    setSessions(getStoredSessions())
  }, [currentSessionId])  // refresh when session changes

  const handleDelete = (id, e) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      const updated = sessions.filter(s => s.id !== id)
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
      setSessions(updated)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 2500)
    }
  }

  const clearAll = () => {
    localStorage.removeItem(SESSIONS_KEY)
    setSessions([])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] font-semibold">Chat History</p>
        {sessions.length > 0 && (
          <button onClick={clearAll}
            className="text-[10px] text-white/25 hover:text-red-400 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <span className="text-2xl mb-2">💬</span>
            <p className="text-white/25 text-xs">No saved sessions yet.</p>
            <p className="text-white/15 text-[10px] mt-1">Start a chat — it'll appear here.</p>
          </div>
        ) : (
          sessions.map(s => {
            const isCurrent = s.id === currentSessionId
            return (
              <button
                key={s.id}
                onClick={() => onLoadSession(s.id)}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group relative ${
                  isCurrent
                    ? 'bg-brand-500/15 border border-brand-500/20'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isCurrent ? 'bg-brand-500/25' : 'bg-white/[0.06]'
                }`}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3.5 h-3.5 ${isCurrent ? 'text-brand-400' : 'text-white/30'}`}>
                    <path fillRule="evenodd" d="M2.5 3A1.5 1.5 0 001 4.5v7A1.5 1.5 0 002.5 13h11A1.5 1.5 0 0015 11.5V6.621a1.5 1.5 0 00-.44-1.06l-2.121-2.122A1.5 1.5 0 0011.379 3H2.5zM8 7a1 1 0 100 2 1 1 0 000-2zM5 8a1 1 0 112 0 1 1 0 01-2 0zm5 0a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-snug truncate ${isCurrent ? 'text-brand-300' : 'text-white/60 group-hover:text-white/80'}`}>
                    {s.preview}
                  </p>
                  <p className="text-white/25 text-[10px] mt-0.5">{formatDate(s.date)}</p>
                </div>
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all duration-150 ${
                    confirmDelete === s.id
                      ? 'bg-red-500/20 text-red-400 opacity-100'
                      : 'opacity-0 group-hover:opacity-100 text-white/25 hover:text-white/60 hover:bg-white/[0.06]'
                  }`}
                  title={confirmDelete === s.id ? 'Click again to confirm' : 'Delete'}
                >
                  <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </button>
            )
          })
        )}
      </div>

      {/* New chat button */}
      <div className="px-3 py-3 border-t border-white/[0.04]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 text-brand-300 text-xs font-medium transition-all duration-200 active:scale-[0.98]"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"/>
          </svg>
          New Chat
        </button>
      </div>
    </div>
  )
}
