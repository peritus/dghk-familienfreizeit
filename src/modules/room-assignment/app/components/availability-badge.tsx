import type { ComponentProps } from 'react'
import { Badge } from '../../../../app/components/shared/ui/badge.js'

/**
 * Displays available sleeping places as a capacity status.
 *
 * Availability is a status, not a quiet room property, so it intentionally
 * uses the dashed, bordered `Badge` treatment rather than `Tag`.
 */
export function AvailabilityBadge({
  free,
  ...props
}: Omit<ComponentProps<typeof Badge>, 'children' | 'variant'> & { free: number }) {
  return (
    <Badge variant="free" {...props}>
      {free} frei
    </Badge>
  )
}
