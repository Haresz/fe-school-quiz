export type QuizErrorCode =
  | 'not_authenticated'
  | 'quiz_not_found'
  | 'quiz_has_attempts'
  | 'invalid_quiz'
  | 'load_failed'
  | 'network'
  | 'unknown'

export class QuizApiError extends Error {
  code: QuizErrorCode
  detail?: string

  constructor(code: QuizErrorCode, detail?: string) {
    super(detail ?? code)
    this.name = 'QuizApiError'
    this.code = code
    this.detail = detail
  }
}

function readMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

function readName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: unknown }).name
    if (typeof name === 'string') return name
  }
  return ''
}

export function mapQuizError(error: unknown): QuizApiError {
  if (error instanceof QuizApiError) return error

  const message = readMessage(error)
  const name = readName(error)

  if (message === 'not_authenticated') return new QuizApiError('not_authenticated')
  if (message === 'quiz_not_found') return new QuizApiError('quiz_not_found')
  if (message === 'quiz_has_attempts') return new QuizApiError('quiz_has_attempts')
  if (message.startsWith('invalid_quiz')) {
    return new QuizApiError('invalid_quiz', message.replace(/^invalid_quiz:\s*/, ''))
  }

  if (
    name === 'AuthRetryableFetchError' ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed')
  ) {
    return new QuizApiError('network')
  }

  return new QuizApiError('unknown')
}

export function mapQuizLoadError(error: unknown): QuizApiError {
  const mapped = mapQuizError(error)
  if (mapped.code === 'network' || mapped.code === 'quiz_not_found') return mapped
  return new QuizApiError('load_failed')
}
