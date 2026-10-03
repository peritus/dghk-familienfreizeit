import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TabOption = { value: string; label: string; count?: number }

export function Tabs({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: string
  options: readonly TabOption[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      <span className="font-bold">{label}</span>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              className={cn(
                'min-h-11 rounded-base border-2 border-border px-4 py-2 text-left font-bold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'bg-foreground text-background'
                  : 'bg-secondary-background text-foreground hover:bg-main',
              )}
            >
              {option.label}
              {option.count === undefined ? null : (
                <span className="ml-2 text-sm font-normal">{option.count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TabPanel({
  children,
  labelled_by: labelledBy,
}: {
  children: ReactNode
  labelled_by: string
}) {
  return (
    <div role="tabpanel" aria-labelledby={labelledBy}>
      {children}
    </div>
  )
}
