import { id } from '@/i18n/id'

export type ResultSummary = {
  percent: number
  message: string
  stars: number
}

export function getResultSummary(score: number, maxScore: number): ResultSummary {
  const percent =
    maxScore > 0 ? Math.min(100, Math.max(0, Math.round((score / maxScore) * 100))) : 0

  if (percent >= 80) {
    return { percent, message: id.player.result.stampGreat, stars: 3 }
  }

  if (percent >= 50) {
    return { percent, message: id.player.result.stampGood, stars: 2 }
  }

  return { percent, message: id.player.result.stampTry, stars: 1 }
}
