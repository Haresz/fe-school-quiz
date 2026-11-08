import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export type CardProps = ComponentProps<'div'>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-card border border-paper-line bg-white p-6', className)}
      {...props}
    />
  )
}
