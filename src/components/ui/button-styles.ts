import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerGhost' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-input border-2 font-body font-bold transition-[transform,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-ink bg-blue text-white shadow-press active:translate-y-[2px] active:shadow-none',
  secondary:
    'border-ink bg-white text-ink shadow-press active:translate-y-[2px] active:shadow-none',
  danger:
    'border-ink bg-coral text-white shadow-press active:translate-y-[2px] active:shadow-none',
  dangerGhost: 'border-transparent bg-transparent text-coral hover:bg-coral-tint',
  ghost: 'border-transparent bg-transparent text-blue hover:bg-blue-tint',
}

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
}

export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className)
}
