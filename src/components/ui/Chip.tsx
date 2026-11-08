import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'

type ChipVariant = 'draft' | 'published' | 'ai'

const styles: Record<ChipVariant, string> = {
  draft: 'bg-yellow-tint text-ink',
  published: 'bg-green-tint text-ink',
  ai: 'bg-violet-tint text-ink',
}

const labels: Record<ChipVariant, string> = {
  draft: id.status.draft,
  published: id.status.published,
  ai: id.status.ai,
}

function ChipIcon({ variant }: { variant: ChipVariant }) {
  if (variant === 'published') {
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
        <path
          d="m3.5 8.5 3 3 6-7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (variant === 'ai') {
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="currentColor">
        <path d="M8 1.5 9.4 6l4.1 1.5-4.1 1.5L8 13.5 6.6 9 2.5 7.5 6.6 6 8 1.5Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
      <path
        d="M3 12.5 11.5 4a1.6 1.6 0 0 1 2.3 2.3L5.2 14.5H3v-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export type ChipProps = {
  variant: ChipVariant
  className?: string
}

export function Chip({ variant, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-base font-bold',
        styles[variant],
        className,
      )}
    >
      <ChipIcon variant={variant} />
      {labels[variant]}
    </span>
  )
}
