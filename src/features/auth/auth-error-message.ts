import { AuthApiError } from '@/api/auth-errors'
import { id } from '@/i18n/id'

export function authErrorMessage(error: unknown): string {
  const code = error instanceof AuthApiError ? error.code : 'unknown'
  return id.auth.errors[code]
}
