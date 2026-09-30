import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { AvailabilityBadge } from './availability-badge.js'
import { Badge } from './badge.js'

/**
 * Displays a room's total sleeping places together with its availability.
 *
 * Keep these values together wherever a room summary is shown. A negative
 * availability is rendered as an over-capacity status instead of an
 * availability badge.
 */
export function RoomCapacitySummary({
  capacity,
  free,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  capacity: number
  free: number
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)} {...props}>
      <span className="font-bold tabular-nums">
        {capacity} {capacity === 1 ? 'Platz' : 'Plätze'}
      </span>
      {free < 0 ? (
        <Badge tone="danger">
          {Math.abs(free)} {Math.abs(free) === 1 ? 'Platz' : 'Plätze'} zu wenig
        </Badge>
      ) : (
        <AvailabilityBadge free={free} />
      )}
    </div>
  )
}
