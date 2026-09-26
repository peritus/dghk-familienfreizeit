import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import type { StatusTone } from '../../organiser/accommodation-ui/types.js'

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
  className,
  ...props
}: ComponentProps<'span'> & { tone?: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center rounded-base border-2 border-black px-2 py-0.5 text-xs font-bold leading-tight',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
