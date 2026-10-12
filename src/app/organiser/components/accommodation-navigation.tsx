import { SecondaryNavigation } from './navigation.js'
import { organiserPaths } from '../../../organiser/routes.js'

export function AccommodationNavigation() {
  return (
    <SecondaryNavigation
      aria_label="Unterbringungsbereiche"
      items={[
        {
          href: organiserPaths.inventory(),
          active_paths: [organiserPaths.inventory()],
          label: 'Unterkunft',
        },
        {
          href: organiserPaths.assignment_board(),
          active_paths: [organiserPaths.assignment_board()],
          label: 'Belegung',
        },
        {
          href: organiserPaths.assignment_trace(),
          active_paths: [organiserPaths.assignment_trace()],
          label: 'Verlauf',
        },
      ]}
    />
  )
}
