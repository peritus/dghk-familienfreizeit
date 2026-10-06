import type { ReactNode } from 'react'
import { Badge } from '../../../../app/components/shared/ui/badge.js'
import {
  WorkshopDataTable,
  WorkshopStatusBadge,
} from '../../../../app/components/shared/workshop/shared.js'
import type {
  ProgrammeCellProjection,
  ProgrammeRowProjection,
  UnplacedWorkshopProjection,
  WorkshopOverlapProjection,
} from '../programme-view.js'

export type ProgrammeCellView = ProgrammeCellProjection & { on_open?: () => void }

export function ProgrammeCell({ cell }: { cell: ProgrammeCellView }) {
  if (cell.state === 'blocked') return <td className="bg-background p-3 text-muted">gesperrt</td>
  if (cell.state === 'empty')
    return (
      <td className="p-3 text-muted">
        — <span className="sr-only">frei</span>
      </td>
    )
  return (
    <td className="p-3 align-top">
      {cell.on_open ? (
        <button
          type="button"
          className="text-left font-bold underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          onClick={cell.on_open}
        >
          {cell.title}
          <span className="sr-only">: Teilnahmeliste öffnen</span>
        </button>
      ) : (
        <strong>{cell.title}</strong>
      )}
      {cell.audience || cell.age_range ? (
        <span className="mt-1 block text-sm text-muted">
          {cell.audience}
          {cell.audience && cell.age_range ? ' · ' : ''}
          {cell.age_range}
        </span>
      ) : null}
      {cell.leaders ? <span className="mt-1 block text-sm text-muted">{cell.leaders}</span> : null}
      {cell.capacity_label || cell.demand_label ? (
        <span className="mt-2 flex flex-wrap gap-2 text-sm">
          {cell.fixed ? (
            <WorkshopStatusBadge variant="pinned">Festgelegt</WorkshopStatusBadge>
          ) : null}
          {cell.capacity_label ? (
            <WorkshopStatusBadge variant="free">{cell.capacity_label}</WorkshopStatusBadge>
          ) : null}
          {cell.demand_label ? <Badge tone="attention">{cell.demand_label}</Badge> : null}
        </span>
      ) : null}
    </td>
  )
}

export type ProgrammeRowView = ProgrammeRowProjection & {
  cells: readonly ProgrammeCellView[]
}

export function ProgrammeGrid({
  rooms,
  rows,
}: {
  rooms: readonly { id: string; label: string }[]
  rows: readonly ProgrammeRowView[]
}) {
  return (
    <div className="overflow-x-auto rounded-base border-2 border-border bg-secondary-background print:overflow-visible print:rounded-none print:border">
      <table className="w-full min-w-[48rem] text-left">
        <caption className="sr-only">Workshops nach Raum und Slot</caption>
        <thead>
          <tr className="border-b-2 border-border">
            <th scope="col" className="p-3">
              Slot
            </th>
            {rooms.map((room) => (
              <th scope="col" key={room.id} className="p-3">
                {room.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((row, index) => {
            const previous = rows[index - 1]
            const startsDay = row.day_label && row.day_label !== previous?.day_label
            return [
              ...(startsDay
                ? [
                    <tr key={`${row.id}-day`} className="border-b-2 border-border bg-background">
                      <th scope="colgroup" colSpan={rooms.length + 1} className="p-3 text-left">
                        {row.day_label}
                      </th>
                    </tr>,
                  ]
                : []),
              <tr key={row.id} className="border-b border-border/30 last:border-b-0">
                <th scope="row" className="p-3">
                  {row.slot_label}
                </th>
                {rooms.map((room, cellIndex) => (
                  <ProgrammeCell
                    key={`${row.id}-${room.id}`}
                    cell={row.cells[cellIndex] ?? { id: `${row.id}-${room.id}`, state: 'empty' }}
                  />
                ))}
              </tr>,
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

export type UnplacedWorkshopView = UnplacedWorkshopProjection

export function UnplacedWorkshopRow({
  workshop,
  action,
}: {
  workshop: UnplacedWorkshopView
  action?: ReactNode
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 border-b border-border/30 bg-secondary-background p-4 last:border-b-0 print:break-inside-avoid">
      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-heading">{workshop.title}</h3>
        <p className="mt-1">
          <WorkshopStatusBadge tone="attention">Nicht eingeplant</WorkshopStatusBadge>
        </p>
        <p className="mt-2 text-sm text-muted">{workshop.reason}</p>
        {workshop.demand_label ? (
          <p className="mt-1 text-sm text-muted">{workshop.demand_label}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </li>
  )
}

export type WorkshopOverlapView = WorkshopOverlapProjection

export function WorkshopOverlapRow({ overlap }: { overlap: WorkshopOverlapView }) {
  return (
    <tr className="border-b border-border/30">
      <th scope="row" className="p-3">
        {overlap.workshops}
      </th>
      <td className="p-3">{overlap.slot}</td>
      <td className="p-3 text-right">{overlap.people_count}</td>
      <td className="p-3">{overlap.people.join(', ')}</td>
    </tr>
  )
}

export function WorkshopOverlapTable({ overlaps }: { overlaps: readonly WorkshopOverlapView[] }) {
  return (
    <WorkshopDataTable
      caption="Überschneidungen"
      columns={[
        { key: 'workshops', label: 'Workshops' },
        { key: 'slot', label: 'Slot' },
        { key: 'people', label: 'Personen', numeric: true },
        { key: 'names', label: 'Wer' },
      ]}
      rows={overlaps}
      rowKey={(overlap) => overlap.id}
      renderRow={(overlap) => <WorkshopOverlapRow key={overlap.id} overlap={overlap} />}
    />
  )
}
