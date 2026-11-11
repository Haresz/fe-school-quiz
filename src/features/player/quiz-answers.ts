import type { PlayerQuestion } from '@/api/player'

export type QuizAnswerValue = number | string

export function isAnswered(
  question: PlayerQuestion,
  answer: QuizAnswerValue | undefined,
): boolean {
  if (typeof answer === 'number') {
    return answer >= 0 && answer < (question.options?.length ?? 0)
  }

  return typeof answer === 'string' && answer.trim().length > 0
}
