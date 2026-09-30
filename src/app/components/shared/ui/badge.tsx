import type { ComponentProps } from 'react'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusTone } from '../../organiser/ui-types.js'

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-white text-foreground',
  success: 'bg-white text-foreground',
  attention: 'bg-main text-main-foreground',
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
        'inline-flex min-h-7 items-center rounded-base border-2 border-black px-2 py-0.5 text-xs font-bold leading-tight',
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
