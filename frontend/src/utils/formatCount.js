/** Compact count for votes/comments (e.g. 1.6k). */
export function formatCount(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(num)
}
