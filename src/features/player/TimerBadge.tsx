import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'
import { formatMessage } from '@/lib/message'

const ANNOUNCE_THRESHOLDS = [60, 30, 10]

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export type TimerBadgeProps = {
  remainingSeconds: number
  totalSeconds: number
}

export function TimerBadge({ remainingSeconds, totalSeconds }: TimerBadgeProps) {
  const urgent = remainingSeconds <= 10
  const announcement = ANNOUNCE_THRESHOLDS.includes(remainingSeconds)
    ? formatMessage(id.player.timer.announce, { seconds: remainingSeconds })
    : ''
  const percent =
    totalSeconds > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100))
      : 0

  return (
    <div className="space-y-1">
      <p
        className={cn(
          'text-lg font-bold',
          urgent ? 'text-ink' : 'text-ink-muted',
        )}
      >
        {urgent
          ? id.player.timer.hurry
          : formatMessage(id.player.timer.remaining, {
              time: formatClock(remainingSeconds),
            })}
      </p>
      <div
        aria-hidden="true"
        className={cn(
          'h-2 overflow-hidden rounded-pill',
          urgent ? 'bg-yellow-tint' : 'bg-blue-tint',
        )}
      >
        <div
          className={cn(
            'h-full rounded-pill transition-[width] duration-300 motion-reduce:transition-none',
            urgent ? 'bg-yellow' : 'bg-blue',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
