import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** A quiet, borderless property label. Use Badge for state or action. */
export function Tag({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-base bg-background px-2 py-0.5 text-sm text-muted',
        className,
      )}
      {...props}
    />
  )
}
