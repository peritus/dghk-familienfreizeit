import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Presents a successful empty or completed state with the shared check icon.
 *
 * Pass the message without a leading checkmark; the icon is part of this
 * component's visual contract.
 */
export function SuccessState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-muted', className)}>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-black"
      >
        <Check className="size-4" />
      </span>
      <span>{children}</span>
    </div>
  )
}
