import type { ReactNode } from 'react'
import { Card } from './Card'

export type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-start gap-3 border-dashed">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {description ? <p className="max-w-prose text-base text-ink-muted">{description}</p> : null}
      {action}
    </Card>
  )
}
