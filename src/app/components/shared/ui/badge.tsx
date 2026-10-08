import type { ComponentProps } from 'react'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusTone } from './status-tone.js'

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-secondary-background text-foreground',
  success: 'bg-secondary-background text-foreground',
  attention: 'border-dashed bg-warning-bg text-foreground',
  danger: 'bg-danger text-foreground',
  draft: 'blueprint bg-paper text-foreground',
  held: 'bg-secondary-background text-muted',
}

export function Badge({
  tone = 'neutral',
  variant = 'default',
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: StatusTone; variant?: 'default' | 'free' | 'pinned' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center rounded-base border-2 border-border px-2 py-0.5 text-xs font-bold leading-tight',
        toneClasses[tone],
        variant === 'free' && 'border-dashed',
        variant === 'pinned' && 'bg-paper',
        className,
      )}
      {...props}
    >
      {variant === 'pinned' ? <Pin aria-hidden="true" className="size-3.5" /> : null}
      {children}
    </span>
  )
}
