import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-input border-2 font-body font-bold transition-[transform,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary:
    'border-ink bg-blue text-white shadow-press active:translate-y-[2px] active:shadow-none',
  secondary:
    'border-ink bg-white text-ink shadow-press active:translate-y-[2px] active:shadow-none',
  danger:
    'border-ink bg-coral text-white shadow-press active:translate-y-[2px] active:shadow-none',
  ghost: 'border-transparent bg-transparent text-blue hover:bg-blue-tint',
}

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
