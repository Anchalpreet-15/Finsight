/**
 * ChatInput.jsx — Message input with voice assistant.
 * • Mic button: Web Speech API speech-to-text
 * • Speaker button: toggle TTS (auto-speak AI replies)
 * • Props: onSend, disabled, onVoiceModeChange, voiceMode
 */
import { useEffect, useRef, useState, useCallback } from 'react'

// ── Speech Recognition singleton ──────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const hasSpeechAPI = !!SpeechRecognition

export default function ChatInput({ onSend, disabled, voiceMode, onVoiceModeChange }) {
  const [text, setText]         = useState('')
  const [listening, setListen]  = useState(false)
  const [pulse, setPulse]       = useState(false)
  const textareaRef             = useRef(null)
  const recognitionRef          = useRef(null)

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  const resize = (ta) => {
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }

  const handleChange = (e) => {
    setText(e.target.value)
    resize(e.target)
  }

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, disabled, onSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Speech Recognition ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!hasSpeechAPI || listening) return

    const rec = new SpeechRecognition()
    rec.continuous      = false
    rec.interimResults  = true
    rec.lang            = 'en-IN'
    rec.maxAlternatives = 1

    rec.onstart = () => { setListen(true); setPulse(true) }

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('')
      setText(transcript)
      resize(textareaRef.current)
    }

    rec.onend = () => {
      setListen(false)
      setPulse(false)
      // Auto-send if we got text from voice
      setTimeout(() => {
        if (textareaRef.current) {
          const val = textareaRef.current.value.trim()
          if (val) { onSend(val); setText(''); textareaRef.current.style.height = 'auto' }
        }
      }, 400)
    }

    rec.onerror = (e) => {
      console.warn('Speech recognition error:', e.error)
      setListen(false)
      setPulse(false)
    }

    recognitionRef.current = rec
    rec.start()
  }, [listening, onSend])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListen(false)
    setPulse(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  const canSend = text.trim().length > 0 && !disabled

  return (
    <div className="flex items-end gap-2">

      {/* Voice-mode (TTS) toggle */}
      {onVoiceModeChange && (
        <button
          onClick={() => onVoiceModeChange(!voiceMode)}
          title={voiceMode ? 'Voice responses ON — click to mute' : 'Enable voice responses'}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            voiceMode
              ? 'bg-accent-500/20 border border-accent-400/40 text-accent-300'
              : 'bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.07]'
          }`}
        >
          {voiceMode ? (
            /* Speaker with waves */
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
              <path fillRule="evenodd" d="M12.293 7.293a1 1 0 011.414 0A4 4 0 0115 10a4 4 0 01-1.293 2.707 1 1 0 01-1.414-1.414A2 2 0 0013 10a2 2 0 00-.707-1.293 1 1 0 010-1.414z" clipRule="evenodd"/>
              <path fillRule="evenodd" d="M14.657 4.343a1 1 0 011.414 0A8 8 0 0118 10a8 8 0 01-1.929 5.143 1 1 0 01-1.414-1.414A6 6 0 0016 10a6 6 0 00-1.757-4.243 1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          ) : (
            /* Muted speaker */
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0l1 1 1-1a1 1 0 111.414 1.414l-1 1 1 1a1 1 0 01-1.414 1.414l-1-1-1 1a1 1 0 01-1.414-1.414l1-1-1-1a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          )}
        </button>
      )}

      {/* Main input area */}
      <div className={`flex-1 flex items-end gap-2 rounded-2xl px-4 py-3 transition-all duration-200 ${
        disabled
          ? 'glass opacity-50'
          : 'glass focus-within:border-brand-500/40 focus-within:shadow-lg focus-within:shadow-brand-500/10'
      }`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={
            listening ? '🎙️ Listening… speak now'
            : disabled ? 'Finsight is thinking...'
            : 'Ask me anything about your finances...'
          }
          className={`flex-1 resize-none bg-transparent placeholder-white/25 text-sm leading-relaxed outline-none disabled:cursor-not-allowed min-h-[22px] ${
            listening ? 'text-brand-300' : 'text-white/90'
          }`}
        />
      </div>

      {/* Mic button */}
      {hasSpeechAPI && (
        <button
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          title={listening ? 'Stop listening' : 'Speak your question'}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 relative ${
            listening
              ? 'bg-red-500/20 border border-red-400/40 text-red-300'
              : disabled
              ? 'bg-white/[0.03] border border-white/[0.04] text-white/15 cursor-not-allowed'
              : 'bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-brand-400 hover:bg-brand-500/10 hover:border-brand-500/20'
          }`}
        >
          {/* Pulse ring when listening */}
          {pulse && (
            <span className="absolute inset-0 rounded-xl bg-red-400/20 animate-ping" />
          )}
          {listening ? (
            /* Stop icon */
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 relative z-10">
              <rect x="5" y="5" width="10" height="10" rx="1" />
            </svg>
          ) : (
            /* Mic icon */
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
            </svg>
          )}
        </button>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          canSend
            ? 'bg-gradient-to-br from-brand-600 to-accent-500 hover:from-brand-500 hover:to-accent-400 shadow-lg shadow-brand-500/30 active:scale-95'
            : 'bg-white/5 border border-white/[0.06] cursor-not-allowed'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className={`w-4 h-4 -rotate-45 translate-x-px ${canSend ? 'text-white' : 'text-white/20'}`}>
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </div>
  )
}
