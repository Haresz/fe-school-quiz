import { QuizApiError } from '@/api/quiz-errors'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'

export function quizErrorMessage(error: unknown): string {
  if (
    error instanceof QuizApiError &&
    error.code === 'invalid_quiz' &&
    error.detail
  ) {
    return formatMessage(id.editor.validation.invalidQuizFromServer, {
      detail: error.detail,
    })
  }

  const code = error instanceof QuizApiError ? error.code : 'unknown'
  return id.editor.errors[code]
}
