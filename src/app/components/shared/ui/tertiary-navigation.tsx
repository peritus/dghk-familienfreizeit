import { cloneElement, useId, useRef, type KeyboardEvent, type ReactNode, type ReactElement } from 'react'
import { useActiveNavigation } from './navigation.js'
import { cn } from '@/lib/utils'

export type TertiaryNavigationItem = {
  value: string
  label: string
  count?: number
  link?: ReactElement<{ className?: string; 'aria-current'?: 'page'; children?: ReactNode }>
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
  const navigationRef = useActiveNavigation(value)
  const routeBacked = items.every((item) => Boolean(item.link))
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
      data-slot="tertiary-navigation"
      className={cn(
        'print:hidden flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-[1.5px] border-border/20 max-sm:flex-col max-sm:items-stretch',
        className,
      )}
    >
      <nav ref={navigationRef} role={routeBacked ? undefined : "tablist"} aria-label={ariaLabel} className="flex max-w-full gap-x-5 overflow-x-auto whitespace-nowrap">
        {items.map((item, index) => {
          const selected = item.value === value
          const tabId = `${idPrefix}-${item.value}`
          const label = <>{item.label}{item.count !== undefined ? <span className="ml-1 font-normal text-muted">{item.count}</span> : null}</>
          if (item.link) return cloneElement(item.link, {
            key: item.value, 'aria-current': selected ? 'page' : undefined,
            className: cn('inline-flex min-h-11 flex-none items-center border-b-2 border-transparent px-0.5 py-2 text-sm font-medium text-muted hover:border-border/35 hover:text-foreground focus-visible:outline-offset-[-2px]', selected && 'border-border font-bold text-foreground', item.link.props.className),
          }, label)
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
                'min-h-11 flex-none border-b-2 border-transparent px-0.5 pt-2 pb-1 text-left text-sm font-medium text-muted hover:border-border/35 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected && 'border-border font-bold text-foreground',
              )}
            >
              {label}
            </button>
          )
        })}
      </nav>
      {controls ? <div className="pb-2 max-sm:w-full max-sm:pt-2">{controls}</div> : null}
    </div>
  )
}
