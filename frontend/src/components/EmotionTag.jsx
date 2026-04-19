/**
 * EmotionTag.jsx — Pill badge showing detected emotion on user messages.
 * Glowing design with subtle animation.
 */
export default function EmotionTag({ emotion, score, color }) {
  if (!emotion) return null
  return (
    <span
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}35`,
        color,
        boxShadow: `0 0 12px ${color}15`,
      }}
      className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border font-semibold tracking-wide transition-all duration-300"
    >
      <span
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
      />
      {emotion}
      {score != null && (
        <span style={{ opacity: 0.5 }}>{Math.round(score * 100)}%</span>
      )}
    </span>
  )
}
