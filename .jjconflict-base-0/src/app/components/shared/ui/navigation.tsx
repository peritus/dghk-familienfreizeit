import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../../lib/utils.js'

export type NavigationItem = {
  id: string
  label: string
  active: boolean
  link: ReactElement<{ className?: string; 'aria-current'?: 'page'; children?: ReactNode }>
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
  return (
    <nav
      data-slot={`${level}-navigation`}
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 print:hidden"
    >
      {items.map((item) =>
        cloneElement(
          item.link,
          {
            key: item.id,
            'aria-current': item.active ? 'page' : undefined,
            className: cn(
              'min-h-11 rounded-base border-2 px-4 py-2 font-bold',
              item.active
                ? 'border-border bg-foreground text-background'
                : level === 'primary'
                  ? 'border-transparent hover:border-border'
                  : 'border-border bg-secondary-background hover:bg-main',
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
