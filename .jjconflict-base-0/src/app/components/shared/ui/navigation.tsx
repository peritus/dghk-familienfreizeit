import { cloneElement, useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../../lib/utils.js'

export type NavigationItem = {
  id: string
  label: string
  active: boolean
  link: ReactElement<{ className?: string; 'aria-current'?: 'page'; children?: ReactNode }>
}

/** Keep horizontal navigation usable without moving the document's vertical scroll. */
export function useActiveNavigation(activeId: string | undefined) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const nav = ref.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"]')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    const outer = nav.getBoundingClientRect()
    const item = active.getBoundingClientRect()
    nav.scrollLeft += item.left - outer.left - (nav.clientWidth - item.width) / 2
  }, [activeId])
  return ref
}

function Navigation({
  items,
  aria_label: ariaLabel,
  level,
}: {
  items: readonly NavigationItem[]
  aria_label: string
  level: 'primary' | 'secondary'
}) {
  const ref = useActiveNavigation(items.find((item) => item.active)?.id)
  return (
    <nav
      ref={ref}
      data-slot={`${level}-navigation`}
      aria-label={ariaLabel}
      className={cn(
        'flex whitespace-nowrap print:hidden',
        level === 'primary'
          ? '-mb-0.5 -ml-[14px] sm:-ml-4 items-end gap-0.5 overflow-x-auto'
          : 'mx-auto max-w-5xl gap-1 sm:gap-2 overflow-x-auto py-2 sm:py-2.5 pr-4 pl-0.5',
      )}
    >
      {items.map((item) =>
        cloneElement(
          item.link,
          {
            key: item.id,
            'aria-current': item.active ? 'page' : undefined,
            className: cn(
              'inline-flex flex-none items-center border-2 focus-visible:outline-offset-[-2px]',
              level === 'primary'
                ? 'h-11 sm:h-12 rounded-t-[6px] border-b-0 px-3 sm:px-4 text-nav1 font-bold'
                : 'min-h-10 sm:min-h-11 rounded-base px-2.5 sm:px-3 text-nav2',
              item.active
                ? level === 'primary'
                  ? 'border-border bg-main-soft'
                  : 'border-border bg-secondary-background font-bold shadow-md'
                : level === 'primary'
                  ? 'border-transparent hover:border-border/30 hover:bg-paper'
                  : 'liftable border-transparent font-medium',
              item.link.props.className,
            ),
          },
          item.label,
        ),
      )}
    </nav>
  )
}
export function PrimaryNavigation({
  items,
  aria_label: ariaLabel = 'Hauptnavigation',
}: {
  items: readonly NavigationItem[]
  aria_label?: string
}) {
  return <Navigation items={items} aria_label={ariaLabel} level="primary" />
}

export function SecondaryNavigation({
  items,
  aria_label: ariaLabel,
}: {
  items: readonly NavigationItem[]
  aria_label: string
}) {
  return <Navigation items={items} aria_label={ariaLabel} level="secondary" />
}
