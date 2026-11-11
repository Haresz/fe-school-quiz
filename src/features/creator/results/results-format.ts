const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatResultDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

export function percentOf(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)))
}
