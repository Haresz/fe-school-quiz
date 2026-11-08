import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'

export type SpinnerProps = {
  label?: string
  className?: string
}

export function Spinner({ label = id.common.loading, className }: SpinnerProps) {
  return (
    <div role="status" className={cn('inline-flex items-center gap-2 text-ink-muted', className)}>
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-pill border-2 border-paper-line border-t-blue"
      />
      <span className="text-sm font-bold">{label}</span>
    </div>
  )
}
