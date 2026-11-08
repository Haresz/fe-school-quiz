import { PlayerApiError } from '@/api/player-errors'
import { id } from '@/i18n/id'

export function playerErrorMessage(error: unknown): string {
  const code = error instanceof PlayerApiError ? error.code : 'unknown'
  return id.player.errors[code]
}
