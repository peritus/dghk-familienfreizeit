import { useLocation } from 'wouter'
import type { OrganiserPath } from '../../../organiser/routes.js'
import { isOrganiserPathActive } from '../../../organiser/routes.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import {
  PrimaryNavigation as SharedPrimaryNavigation,
  SecondaryNavigation as SharedSecondaryNavigation,
} from '../../components/shared/ui/navigation.js'

export type PrimaryNavigationItem = {
  href: OrganiserPath
  match: string
  label: string
  include_descendants: boolean
}

export function PrimaryNavigation({
  items,
  aria_label: ariaLabel = 'Hauptnavigation',
}: {
  items: readonly PrimaryNavigationItem[]
  aria_label?: string
}) {
  const [location] = useLocation()
  return (
    <SharedPrimaryNavigation
      aria_label={ariaLabel}
      items={items.map((item) => ({
        id: item.href,
        label: item.label,
        active: isOrganiserPathActive(location, item.match, item.include_descendants),
        link: <OrganiserLink href={item.href} />,
      }))}
    />
  )
}

export type SecondaryNavigationItem = {
  href: OrganiserPath
  active_paths: readonly [OrganiserPath, ...OrganiserPath[]]
  label: string
}

export function SecondaryNavigation({
  items,
  aria_label: ariaLabel,
}: {
  items: readonly SecondaryNavigationItem[]
  aria_label: string
}) {
  const [location] = useLocation()
  return (
    <SharedSecondaryNavigation
      aria_label={ariaLabel}
      items={items.map((item) => ({
        id: item.href,
        label: item.label,
        active: item.active_paths.some((path) => isOrganiserPathActive(location, path)),
        link: <OrganiserLink href={item.href} />,
      }))}
    />
  )
}
