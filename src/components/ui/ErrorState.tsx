import { id } from '@/i18n/id'
import { Button } from './Button'
import { Card } from './Card'

export type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = id.common.errorTitle,
  description = id.common.errorBody,
  onRetry,
  retryLabel = id.common.retry,
}: ErrorStateProps) {
  return (
    <Card role="alert" className="flex flex-col items-start gap-3 border-coral-tint bg-coral-tint/40">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="max-w-prose text-base text-ink-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </Card>
  )
}
