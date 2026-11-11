import type { QuizSettings, QuizTimerSettings } from '@/types/database'

export const MIN_PER_QUESTION_SECONDS = 5
export const MAX_PER_QUESTION_SECONDS = 600
export const MIN_TOTAL_SECONDS = 60
export const MAX_TOTAL_SECONDS = 7200

export const DEFAULT_PER_QUESTION_SECONDS = 30
export const DEFAULT_TOTAL_MINUTES = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}

export function readQuizTimer(value: unknown): QuizTimerSettings {
  if (!isRecord(value)) return { mode: 'none' }

  if (value.mode === 'per_question') {
    return isIntegerInRange(
      value.seconds,
      MIN_PER_QUESTION_SECONDS,
      MAX_PER_QUESTION_SECONDS,
    )
      ? { mode: 'per_question', seconds: value.seconds }
      : { mode: 'none' }
  }

  if (value.mode === 'total') {
    return isIntegerInRange(value.seconds, MIN_TOTAL_SECONDS, MAX_TOTAL_SECONDS)
      ? { mode: 'total', seconds: value.seconds }
      : { mode: 'none' }
  }

  return { mode: 'none' }
}

export function readRevealAnswers(settings: QuizSettings): boolean {
  return settings.reveal_answers !== false
}

export function defaultNewQuizSettings(): QuizSettings {
  return {
    reveal_answers: true,
    shuffle_questions: true,
    shuffle_options: true,
    timer: { mode: 'none' },
  }
}
