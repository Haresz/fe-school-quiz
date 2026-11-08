import { AiApiError } from '@/api/ai'
import { id } from '@/i18n/id'

export function aiErrorMessage(error: unknown): string {
  const code = error instanceof AiApiError ? error.code : 'unknown'
  return id.ai.errors[code]
}
