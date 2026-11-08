export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'weak_password'
  | 'rate_limited'
  | 'network'
  | 'unknown'

export class AuthApiError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'AuthApiError'
    this.code = code
  }
}

function readStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

function readCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function readName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const name = (error as { name?: unknown }).name
  return typeof name === 'string' ? name : undefined
}

function readMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message
  return undefined
}

export function mapAuthError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) return error

  const code = readCode(error)
  const status = readStatus(error)
  const message = readMessage(error)

  if (code === 'invalid_credentials') {
    return new AuthApiError('invalid_credentials', message)
  }

  if (code === 'email_not_confirmed') {
    return new AuthApiError('email_not_confirmed', message)
  }

  if (code === 'user_already_exists' || code === 'email_exists') {
    return new AuthApiError('user_already_exists', message)
  }

  if (code === 'weak_password') {
    return new AuthApiError('weak_password', message)
  }

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    code === 'over_sms_send_rate_limit' ||
    status === 429
  ) {
    return new AuthApiError('rate_limited', message)
  }

  if (
    readName(error) === 'AuthRetryableFetchError' ||
    status === 0 ||
    (status !== undefined && status >= 500)
  ) {
    return new AuthApiError('network', message)
  }

  return new AuthApiError('unknown', message)
}
