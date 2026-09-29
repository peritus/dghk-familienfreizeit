import { useLocation } from 'wouter'
import type { OrganiserPath } from '../../../organiser/routes.js'
import { OrganiserLink } from '../../components/organiser-link.js'
import { cn } from '../../lib/utils.js'

export type OrganiserSectionNavigationItem = {
  href: OrganiserPath
  label: string
}

export function OrganiserSectionNavigation({
  ariaLabel,
  items,
}: {
  ariaLabel: string
  items: readonly OrganiserSectionNavigationItem[]
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
