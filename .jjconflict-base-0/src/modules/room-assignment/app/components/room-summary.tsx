import { OrganiserLink } from '../../../../app/components/application/organiser-link.js'
import type { OrganiserPath } from '../../../../organiser/routes.js'
import { RoomCapacitySummary } from './room-capacity-summary.js'

/**
 * Shared room identity, location, and capacity summary.
 *
 * Room cards and room overview rows must use this component so the same room
 * information keeps the same hierarchy, typography, and availability treatment
 * everywhere it appears.
 */
export function RoomSummary({
  name,
  building,
  floor,
  href,
  capacity,
  free,
}: {
  name: string
  building: string
  floor: string
  href: OrganiserPath
  capacity: number
  free: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <OrganiserLink
          className="text-xl font-heading underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          href={href}
        >
          {name}
        </OrganiserLink>
        <RoomCapacitySummary capacity={capacity} free={free} />
      </div>
      <p className="text-sm text-muted">
        {building} · {floor}
      </p>
    </div>
  )
}
