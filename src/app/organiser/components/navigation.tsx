import { useLocation } from 'wouter'
import type { OrganiserPath } from '../../../organiser/routes.js'
import { isOrganiserPathActive } from '../../../organiser/routes.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import { cn } from '../../lib/utils.js'

export type PrimaryNavigationItem = {
  href: OrganiserPath
  match: string
  label: string
  include_descendants: boolean
}

/** The organiser-wide navigation shown in the application bar. */
export function PrimaryNavigation({
  items,
  aria_label: ariaLabel = 'Hauptnavigation',
}: {
  items: readonly PrimaryNavigationItem[]
  aria_label?: string
}) {
  const [location] = useLocation()

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = isOrganiserPathActive(location, item.match, item.include_descendants)
        return (
          <OrganiserLink
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'min-h-11 rounded-base border-2 px-4 py-2 font-bold',
              active ? 'border-black bg-black text-white' : 'border-transparent hover:border-black',
            )}
          >
            {item.label}
          </OrganiserLink>
        )
      })}
    </nav>
  )
}

export type SecondaryNavigationItem = {
  href: OrganiserPath
  label: string
}

/** Route-level navigation for sibling organiser screens within one area. */
export function SecondaryNavigation({
  aria_label: ariaLabel,
  items,
}: {
  aria_label: string
  items: readonly SecondaryNavigationItem[]
}) {
  const [location] = useLocation()

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2 print:hidden">
      {items.map((item) => {
        const active = location === item.href
        return (
          <OrganiserLink
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'min-h-11 rounded-base border-2 px-4 py-2 font-bold',
              active ? 'border-black bg-black text-white' : 'border-black bg-white hover:bg-main',
            )}
          >
            {item.label}
          </OrganiserLink>
        )
      })}
    </nav>
  )
}
