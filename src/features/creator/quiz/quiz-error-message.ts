import { QuizApiError } from '@/api/quiz-errors'
import { id } from '@/i18n/id'

export function quizErrorMessage(error: unknown): string {
  const code = error instanceof QuizApiError ? error.code : 'unknown'
  return id.editor.errors[code]
}
