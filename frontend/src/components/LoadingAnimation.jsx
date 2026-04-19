/**
 * LoadingAnimation.jsx — Premium typing indicator while Finsight responds.
 */
export default function LoadingAnimation() {
  return (
    <div className="flex justify-start mb-4 msg-enter">
      <div className="flex items-end gap-2.5">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 mb-1 shadow-lg shadow-brand-500/20 animate-pulse">
          <span className="text-white text-xs font-black">₹</span>
        </div>

        {/* Bubble */}
        <div className="glass rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
            <span className="text-white/30 text-xs font-medium">Analyzing…</span>
          </div>
        </div>
      </div>
    </div>
  )
}
