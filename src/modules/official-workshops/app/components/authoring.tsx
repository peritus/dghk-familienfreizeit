import type { ReactNode } from 'react'
import { Badge } from '../../../../app/components/shared/ui/badge.js'
import {
  CompactMeta,
  CollectionRow,
  RowActions,
} from '../../../../app/components/shared/ui/collection-list.js'

export type WorkshopAuthoringView = {
  id: string
  title: string
  description?: string
  audience: string
  age_range: string
  capacity: number
  participation_mode: string
  leaders: readonly string[]
  requirement?: string
  demand?: string
  placement?: {
    label: string
    tone?: 'neutral' | 'success' | 'attention' | 'danger' | 'draft' | 'held'
  }
  attention?: string
}

export function WorkshopIdentity({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-xl font-heading">{title}</h3>
      {description ? <p className="mt-1 text-muted">{description}</p> : null}
    </div>
  )
}

export function WorkshopBadgeGroup({
  audience,
  participation_mode: participationMode,
  source,
  example = false,
}: {
  audience: string
  participation_mode: string
  source?: string
  example?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {source ? <Badge>{source}</Badge> : null}
      <Badge>{audience}</Badge>
      <Badge>{participationMode}</Badge>
      {example ? <Badge variant="free">Beispiel</Badge> : null}
    </div>
  )
}

export function WorkshopFacts({
  age_range: ageRange,
  capacity,
  requirement,
  demand,
}: {
  age_range: string
  capacity: number
  requirement?: string
  demand?: string
}) {
  return (
    <p className="text-sm text-muted">
      {ageRange} · {capacity} {capacity === 1 ? 'Platz' : 'Plätze'}
      {requirement ? ` · braucht: ${requirement}` : ''}
      {demand ? ` · ${demand}` : ''}
    </p>
  )
}

export function WorkshopLeaderSummary({
  leaders,
  label = 'Leitung',
}: {
  leaders: readonly string[]
  label?: string
}) {
  return (
    <p className="text-sm">
      <strong>{label}:</strong> {leaders.length ? leaders.join(', ') : '—'}
    </p>
  )
}

export function WorkshopPlacementStatus({
  placement,
  attention,
}: {
  placement?: {
    label: string
    tone?: 'neutral' | 'success' | 'attention' | 'danger' | 'draft' | 'held'
  }
  attention?: string
}) {
  return (
    <div className="space-y-1 text-sm">
      {placement ? <Badge tone={placement.tone}>{placement.label}</Badge> : null}
      {attention ? <p className="font-bold text-muted">{attention}</p> : null}
    </div>
  )
}

export function WorkshopSummaryRow({
  workshop,
  action,
}: {
  workshop: WorkshopAuthoringView
  action?: ReactNode
}) {
  return (
    <article className="flex flex-wrap items-start justify-between gap-4 bg-secondary-background p-4 sm:p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <WorkshopIdentity title={workshop.title} description={workshop.description} />
        <WorkshopBadgeGroup
          audience={workshop.audience}
          participation_mode={workshop.participation_mode}
        />
        <WorkshopFacts
          age_range={workshop.age_range}
          capacity={workshop.capacity}
          requirement={workshop.requirement}
          demand={workshop.demand}
        />
        <WorkshopLeaderSummary leaders={workshop.leaders} />
        <WorkshopPlacementStatus placement={workshop.placement} attention={workshop.attention} />
      </div>
      {action ? <RowActions>{action}</RowActions> : null}
    </article>
  )
}

export type InternalLeaderView = {
  id: string
  name: string
  age_label: string
  leads: readonly string[]
  participation_count: number
}

export function InternalLeaderRow({ leader }: { leader: InternalLeaderView }) {
  return (
    <tr className="border-b border-border/30">
      <th scope="row" className="p-3">
        {leader.name}
      </th>
      <td className="p-3">{leader.age_label}</td>
      <td className="p-3">{leader.leads.length ? leader.leads.join(', ') : '—'}</td>
      <td className="p-3 text-right">{leader.participation_count}</td>
    </tr>
  )
}

export type ExternalLeaderView = {
  id: string
  name: string
  phone?: string
  availability: readonly string[]
  leads: readonly string[]
}

export function LeaderAvailability({
  slots,
  total_slots: totalSlots,
}: {
  slots: readonly string[]
  total_slots?: number
}) {
  if (totalSlots !== undefined && slots.length === totalSlots) return <>alle Slots</>
  return slots.length ? (
    <span className="inline-flex flex-wrap gap-x-2">
      {slots.map((slot) => (
        <span key={slot}>{slot}</span>
      ))}
    </span>
  ) : (
    <>kein Slot</>
  )
}

export function ExternalLeaderRow({
  leader,
  action,
  total_slots: totalSlots,
}: {
  leader: ExternalLeaderView
  action?: ReactNode
  total_slots?: number
}) {
  return (
    <CollectionRow action={action ? <RowActions>{action}</RowActions> : null}>
      <div className="space-y-1">
        <p>
          <strong>{leader.name}</strong> <Badge>extern</Badge>
          {leader.phone ? <span className="ml-2 text-sm text-muted">· {leader.phone}</span> : null}
        </p>
        <CompactMeta label="Leitet">
          {leader.leads.length ? leader.leads.join(', ') : '—'}
        </CompactMeta>
        <CompactMeta label="Verfügbar">
          <LeaderAvailability slots={leader.availability} total_slots={totalSlots} />
        </CompactMeta>
      </div>
    </CollectionRow>
  )
}
