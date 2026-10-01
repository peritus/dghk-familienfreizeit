import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TertiaryNavigationItem = {
  value: string
  label: string
}

/**
 * Page-local navigation for a small set of sibling views. Optional controls
 * share its baseline but remain independent from the selected view.
 */
export function TertiaryNavigation({
  aria_label: ariaLabel,
  value,
  items,
  onChange,
  controls,
  className,
}: {
  aria_label: string
  value: string
  items: readonly TertiaryNavigationItem[]
  onChange: (value: string) => void
  controls?: ReactNode
  className?: string
}) {
  const idPrefix = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length
    const next = items[nextIndex]
    if (!next) return
    onChange(next.value)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-x-6 gap-y-0 border-b-2 border-black/30 max-sm:flex-col max-sm:items-stretch',
        className,
      )}
    >
      <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map((item, index) => {
          const selected = item.value === value
          const tabId = `${idPrefix}-${item.value}`
          return (
            <button
              key={item.value}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              id={tabId}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'min-h-11 border-b-4 border-transparent px-0.5 pt-2 pb-1 text-left font-bold text-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
                selected && 'border-black text-foreground',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {controls ? <div className="pb-2 max-sm:w-full max-sm:pt-2">{controls}</div> : null}
    </div>
  )
}
