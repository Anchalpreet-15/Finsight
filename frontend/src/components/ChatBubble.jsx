/**
 * ChatBubble.jsx — Single chat message bubble with markdown rendering + copy button.
 * Premium dark glassmorphism design with rich typography.
 */
import { useState } from 'react'
import EmotionTag    from './EmotionTag'
import AgentActivity from './AgentActivity'
import InvestmentViz, { extractInvestViz } from './InvestmentViz'

// ── Inline markdown → HTML ────────────────────────────────────────────────────
function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/80">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-brand-500/15 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/(₹[\d,]+(?:\.\d+)?(?:\s*(?:lakh|crore|L|Cr))?)/g, '<span class="text-accent-400 font-semibold">$1</span>')
}

function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let listItems = []
  let key = 0

  const flushList = () => {
    if (listItems.length === 0) return
    elements.push(
      <ul key={key++} className="space-y-1.5 my-2">
        {listItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-white/70 text-sm leading-relaxed">
            <span className="text-brand-400 mt-1 flex-shrink-0 select-none text-[10px]">◆</span>
            <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={key++} className="text-white font-bold text-sm mt-3 mb-1.5 pb-1.5 border-b border-white/[0.06] flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-brand-500 to-accent-500 flex-shrink-0" />
          {line.slice(3)}
        </h3>
      )
      continue
    }
    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h4 key={key++} className="text-white/90 font-semibold text-sm mt-2 mb-0.5">
          {line.slice(4)}
        </h4>
      )
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2))
      continue
    }
    const numbered = line.match(/^(\d+)\.\s+(.+)/)
    if (numbered) {
      flushList()
      elements.push(
        <div key={key++} className="flex items-start gap-2.5 my-1">
          <span className="bg-brand-500/15 text-brand-300 font-bold text-[10px] mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center">
            {numbered[1]}
          </span>
          <span className="text-white/70 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlineMarkdown(numbered[2]) }} />
        </div>
      )
      continue
    }
    if (line.trim() === '') {
      flushList()
      if (elements.length > 0) elements.push(<div key={key++} className="h-1.5" />)
      continue
    }
    flushList()
    elements.push(
      <p key={key++} className="text-white/70 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
    )
  }
  flushList()
  return elements
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy response'}
      className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 hover:border-white/10"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 text-accent-400">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-accent-400 font-medium">Copied</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h5a1.5 1.5 0 0 0 1.5-1.5v-7a.5.5 0 0 0-.146-.354l-3-3A.5.5 0 0 0 6.5 2h-3Z" />
            <path d="M6.5 2.5V5H9L6.5 2.5ZM11 5.5A1.5 1.5 0 0 1 12.5 7v5A1.5 1.5 0 0 1 11 13.5H7.5a.5.5 0 0 1 0-1H11a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-.5-.5V5.5Z" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  const time   = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Extract investment visualisation block from AI messages
  const { clean: displayContent, vizData } = !isUser
    ? extractInvestViz(message.content || '')
    : { clean: message.content || '', vizData: null }

  return (
    <div className={`flex msg-enter ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-end gap-2.5 ${isUser ? 'max-w-[85%] sm:max-w-[75%]' : 'max-w-[92%] sm:max-w-[85%]'} ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* AI avatar */}
        {!isUser && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 mb-1 shadow-lg shadow-brand-500/20">
            <span className="text-white text-xs font-black">₹</span>
          </div>
        )}

        <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'} group w-full`}>

          {/* Emotion tag */}
          {isUser && message.emotion && (
            <EmotionTag emotion={message.emotion} score={message.emotion_score} color={message.emotion_color} />
          )}

          {/* Agent activity */}
          {!isUser && message.agent_steps?.length > 0 && (
            <AgentActivity steps={message.agent_steps} />
          )}

          {/* Bubble */}
          {isUser ? (
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed shadow-lg shadow-brand-500/15">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <div className="glass px-4 py-3 rounded-2xl rounded-bl-sm shadow-lg space-y-1 w-full">
              {renderMarkdown(displayContent)}
              {/* Investment visualisation charts */}
              {vizData && <InvestmentViz data={vizData} />}
            </div>
          )}

          {/* Time + copy button row */}
          <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-white/20 text-[10px] font-medium">{time}</span>
            {!isUser && <CopyButton text={displayContent} />}
          </div>
        </div>
      </div>
    </div>
  )
}
