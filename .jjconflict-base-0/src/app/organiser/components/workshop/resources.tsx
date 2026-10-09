import type { ReactNode } from 'react'
import { Badge } from '../../../components/shared/ui/badge.js'
import { Button } from '../../../components/shared/ui/button.js'
import { Card, CardContent } from '../../../components/shared/ui/card.js'
import { PropertyTags } from '../../../components/shared/ui/property-tags.js'
import { RowActions } from '../../../components/shared/ui/collection-list.js'

export type WorkshopSpaceView = {
  id: string
  name: string
  location?: string
  capacity?: number
  capabilities: readonly string[]
  blocked_slots: readonly string[]
}

export function SpaceIdentity({
  name,
  location,
  capacity,
}: {
  name: string
  location?: string
  capacity?: number
}) {
  return (
    <div>
      <h3 className="text-metric font-heading">{name}</h3>
      {location || capacity !== undefined ? (
        <p className="mt-1 text-sm text-muted">
          {location ?? '—'}
          {location && capacity !== undefined ? ' · ' : ''}
          {capacity !== undefined ? `${capacity} Plätze` : ''}
        </p>
      ) : null}
    </div>
  )
}

export function SpaceCapabilityList({ capabilities }: { capabilities: readonly string[] }) {
  return (
    <div className="space-y-1 text-sm">
      <strong>Ausstattung</strong>
      <PropertyTags items={capabilities.length ? capabilities : ['keine Angabe']} />
    </div>
  )
}

export function BlockedSlotList({
  blocked_slots: blockedSlots,
}: {
  blocked_slots: readonly string[]
}) {
  if (!blockedSlots.length) return null
  return (
    <p className="text-sm text-muted">
      <strong>Nicht verfügbar:</strong> {blockedSlots.join(', ')}
    </p>
  )
}

export function SpaceRow({ space, action }: { space: WorkshopSpaceView; action?: ReactNode }) {
  return (
    <Card size="sm" className="bg-secondary-background">
      <CardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <SpaceIdentity name={space.name} location={space.location} capacity={space.capacity} />
          <SpaceCapabilityList capabilities={space.capabilities} />
          <BlockedSlotList blocked_slots={space.blocked_slots} />
        </div>
        {action ? <RowActions>{action}</RowActions> : null}
      </CardContent>
    </Card>
  )
}

export type WorkshopSlotView = {
  id: string
  day_label: string
  time_label: string
  workshop_count: number
  conflict?: string
}

export function SlotIdentity({
  day_label: dayLabel,
  time_label: timeLabel,
}: {
  day_label: string
  time_label: string
}) {
  return (
    <strong>
      {dayLabel}, {timeLabel} Uhr
    </strong>
  )
}

export function SlotConflictBadge({ conflict }: { conflict?: string }) {
  return conflict ? <Badge tone="attention">{conflict}</Badge> : null
}

export function SlotRow({ slot, action }: { slot: WorkshopSlotView; action?: ReactNode }) {
  return (
    <Card size="sm" className="bg-secondary-background">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <SlotIdentity day_label={slot.day_label} time_label={slot.time_label} />
            <SlotConflictBadge conflict={slot.conflict} />
          </p>
          <p className="text-sm text-muted">{slot.workshop_count} Workshops im aktuellen Stand</p>
        </div>
        {action ? <RowActions>{action}</RowActions> : null}
      </CardContent>
    </Card>
  )
}

export function SlotDayGroup({
  day_label: dayLabel,
  slots,
  action,
}: {
  day_label: string
  slots: readonly WorkshopSlotView[]
  action?: (slot: WorkshopSlotView) => ReactNode
}) {
  return (
    <section aria-labelledby={`workshop-day-${dayLabel}`} className="space-y-3">
      <h3 id={`workshop-day-${dayLabel}`} className="text-metric font-heading">
        {dayLabel}
      </h3>
      {slots.length ? (
        <div className="grid gap-3">
          {slots.map((slot) => (
            <SlotRow key={slot.id} slot={slot} action={action?.(slot)} />
          ))}
        </div>
      ) : (
        <p className="text-muted">Kein Slot an diesem Tag.</p>
      )}
    </section>
  )
}

export function SpaceSlotToggle({ blocked, onChange }: { blocked: boolean; onChange: () => void }) {
  return (
    <Button type="button" size="sm" variant={blocked ? 'danger' : 'neutral'} onClick={onChange}>
      {blocked ? 'gesperrt' : 'frei'}
    </Button>
  )
}
