import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A bordered group of buttons for choosing one of a few options, per
 * spec/ui/design-system.md#forms (§5 of the inventory guideline additions):
 * use instead of a <select> when there are <=4 options and seeing them
 * helps (bed type, Schlafraum).
 *
 * `render_icon` is a render function, not a component reference: calling it
 * inline avoids the "component created during render" pitfall a per-option
 * component reference would hit if assigned to a local variable and used as
 * a JSX tag.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  render_icon: renderIcon,
  className,
  presentation = 'choice',
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  render_icon?: (value: T) => ReactNode
  className?: string
  presentation?: 'choice' | 'filter'
}) {
  return (
    <div
      data-slot="segmented-control"
      className={cn(presentation === 'filter' ? 'w-full sm:w-auto' : 'grid gap-1', className)}
    >
      <span className={presentation === 'filter' ? 'sr-only' : 'font-bold'}>{label}</span>
      <div
        role="group"
        aria-label={label}
        className={cn(
          'overflow-hidden rounded-base border-2 border-border bg-secondary-background',
          presentation === 'filter'
            ? 'flex w-full sm:inline-flex sm:w-auto'
            : 'grid auto-cols-fr grid-flow-col max-sm:grid-flow-row max-sm:grid-cols-1',
        )}
      >
        {options.map((option, index) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 px-3 text-sm',
                presentation === 'filter' ? 'flex-1 font-medium sm:flex-none' : 'font-bold',
                presentation === 'choice' && 'max-sm:flex-col max-sm:min-h-14 max-sm:gap-0.5',
                index > 0 &&
                  cn(
                    'border-l-2 border-border',
                    presentation === 'choice' && 'max-sm:border-l-0 max-sm:border-t-2',
                  ),
                selected
                  ? 'bg-foreground font-bold text-background'
                  : 'bg-secondary-background text-foreground',
              )}
            >
              {renderIcon?.(option.value)}
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
