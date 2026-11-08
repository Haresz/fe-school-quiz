import { QuizApiError } from '@/api/quiz-errors'
import { id } from '@/i18n/id'

export function resultsErrorMessage(error: unknown): string {
  const code = error instanceof QuizApiError ? error.code : 'unknown'

  switch (code) {
    case 'not_authenticated':
      return id.results.errors.not_authenticated
    case 'quiz_not_found':
      return id.results.errors.quiz_not_found
    case 'load_failed':
      return id.results.errors.load_failed
    case 'network':
      return id.results.errors.network
    default:
      return id.results.errors.unknown
  }
}
