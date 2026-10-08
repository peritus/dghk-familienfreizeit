import { Clock, TriangleAlert } from 'lucide-react'
import { pluralDe } from '../../../../app/lib/plural-de.js'
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
  unknown_leader_count?: number
  requirement?: string
  demand?: string
  count?: number
  wishes?: number
  notes?: readonly string[]
  placement?: {
    label: string
    tone?: 'neutral' | 'success' | 'attention' | 'danger' | 'draft' | 'held'
  }
  attention?: string
}

export function WorkshopIdentity({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-lg font-heading">{title}</h3>
      {description ? <p className="mt-1 text-sm font-normal text-muted">{description}</p> : null}
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
      <span className="text-sm text-muted">{audience}</span>
      {participationMode === 'Anmeldung' ? (
        <Badge>Anmeldung statt Wahl</Badge>
      ) : participationMode === 'Interesse' ? (
        <Badge>Interesse</Badge>
      ) : null}
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
  unknown_count: unknownCount = 0,
}: {
  leaders: readonly string[]
  label?: string
  unknown_count?: number
}) {
  return (
    <p className="text-sm">
      <span className="text-muted">{label}:</span>{' '}
      {leaders.length ? leaders.join(', ') : unknownCount ? '' : '—'}
      {unknownCount
        ? ` + ${unknownCount} ${pluralDe(unknownCount, 'unbekannte Person', 'unbekannte Personen')}`
        : ''}
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
  const count = workshop.count ?? 0
  const metric =
    workshop.count !== undefined ? (
      <div className="space-y-1 text-sm">
        <p>
          <strong className="text-xl tabular-nums">
            {count}/{workshop.capacity}
          </strong>
          <span className="text-xs text-muted">
            {' '}
            {pluralDe(workshop.capacity, 'Platz', 'Plätze')}
          </span>
        </p>
        <div
          role="img"
          aria-label={`${count} von ${workshop.capacity} ${pluralDe(workshop.capacity, 'Platz', 'Plätzen')} belegt`}
          className="h-2 overflow-hidden rounded-full border-[1.5px] border-border bg-secondary-background"
        >
          <div
            className="h-full bg-foreground"
            style={{
              width: `${workshop.capacity > 0 ? Math.min(100, (count / workshop.capacity) * 100) : 0}%`,
            }}
          />
        </div>
        <p
          className={
            workshop.wishes !== undefined && workshop.wishes > workshop.capacity
              ? 'font-bold'
              : 'text-muted'
          }
        >
          {count === 0 && workshop.wishes === undefined ? 'Noch keine ' : ''}
          {pluralDe(
            count === 0 && workshop.wishes === undefined ? 2 : count,
            workshop.participation_mode === 'Anmeldung'
              ? 'Anmeldung'
              : workshop.participation_mode === 'Interesse'
                ? 'Interessensbekundung'
                : 'zugeordnet',
            workshop.participation_mode === 'Anmeldung'
              ? 'Anmeldungen'
              : workshop.participation_mode === 'Interesse'
                ? 'Interessensbekundungen'
                : 'zugeordnet',
          )}
          {workshop.wishes !== undefined
            ? workshop.wishes === 0
              ? ' · Noch keine Wünsche'
              : ` · ${workshop.wishes} ${pluralDe(workshop.wishes, 'Wunsch', 'Wünsche')}${workshop.wishes > workshop.capacity ? ` für ${workshop.capacity} ${pluralDe(workshop.capacity, 'Platz', 'Plätze')}` : ''}`
            : ''}
        </p>
      </div>
    ) : workshop.demand ? (
      <p className="text-sm">{workshop.demand}</p>
    ) : undefined
  return (
    <CollectionRow
      id={`workshop-${workshop.id}`}
      action={action}
      metric={metric}
      className="target:bg-main-soft target:outline-2 target:outline-border focus:bg-main-soft focus:outline-2 focus:outline-border focus:outline-offset-2"
    >
      <div className="space-y-2">
        <WorkshopIdentity title={workshop.title} description={workshop.description} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <WorkshopBadgeGroup
            audience={workshop.audience}
            participation_mode={workshop.participation_mode}
          />
          <span className="text-sm text-muted">{workshop.age_range}</span>
          {workshop.requirement ? (
            <span className="text-sm text-muted">braucht: {workshop.requirement}</span>
          ) : null}
        </div>
        {workshop.placement ? (
          <p
            className={
              workshop.placement.tone === 'attention'
                ? 'inline-flex items-center gap-1 rounded-base border-[1.5px] border-dashed border-border bg-warning-bg px-2 py-1 text-xs font-bold'
                : 'flex items-center gap-1 text-sm font-medium'
            }
          >
            {workshop.placement.tone === 'attention' ? (
              <TriangleAlert aria-hidden="true" className="size-3" />
            ) : (
              <Clock aria-hidden="true" className="size-3.5" />
            )}
            {workshop.placement.label}
          </p>
        ) : null}
        <WorkshopLeaderSummary
          leaders={workshop.leaders}
          unknown_count={workshop.unknown_leader_count}
        />
        {workshop.notes?.map((note) => (
          <p
            key={note}
            className="flex items-start gap-2 rounded-base border-[1.5px] border-dashed border-border bg-warning-bg px-3 py-2 text-sm font-medium"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {note}
          </p>
        ))}
        {workshop.attention ? <p className="text-sm text-muted">{workshop.attention}</p> : null}
      </div>
    </CollectionRow>
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
