export type PlayerErrorCode =
  | 'quiz_not_found'
  | 'quiz_not_published'
  | 'invalid_quiz'
  | 'load_failed'
  | 'attempt_failed'
  | 'network'
  | 'unknown'

export class PlayerApiError extends Error {
  code: PlayerErrorCode
  detail?: string

  constructor(code: PlayerErrorCode, detail?: string) {
    super(detail ?? code)
    this.name = 'PlayerApiError'
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

export function mapPlayerError(error: unknown): PlayerApiError {
  if (error instanceof PlayerApiError) return error

  const message = readMessage(error)
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('quiz_not_found') ||
    lowerMessage.includes('quiz not found') ||
    lowerMessage.includes('kode tidak ditemukan')
  ) {
    return new PlayerApiError('quiz_not_found')
  }

  if (
    lowerMessage.includes('quiz_not_published') ||
    lowerMessage.includes('quiz not published') ||
    lowerMessage.includes('belum terbit')
  ) {
    return new PlayerApiError('quiz_not_published')
  }

  if (lowerMessage.includes('invalid_quiz')) {
    return new PlayerApiError(
      'invalid_quiz',
      message.replace(/^.*invalid_quiz:\s*/, ''),
    )
  }

  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed')
  ) {
    return new PlayerApiError('network')
  }

  return new PlayerApiError('unknown')
}

export function mapPlayerLoadError(error: unknown): PlayerApiError {
  const mapped = mapPlayerError(error)
  if (
    mapped.code === 'quiz_not_found' ||
    mapped.code === 'quiz_not_published' ||
    mapped.code === 'network'
  ) {
    return mapped
  }
  return new PlayerApiError('load_failed')
}

export function mapPlayerSubmitError(error: unknown): PlayerApiError {
  const mapped = mapPlayerError(error)
  if (mapped.code === 'network' || mapped.code === 'invalid_quiz') {
    return mapped
  }
  return new PlayerApiError('attempt_failed')
}
