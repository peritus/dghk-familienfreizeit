import type { ReactNode } from 'react'
import { Badge } from '../../../components/ui/badge.js'
import { WorkshopDataTable, WorkshopStatusBadge } from './shared.js'

export type ProgrammeCellView = {
  id: string
  state: 'blocked' | 'empty' | 'placed'
  title?: string
  audience?: string
  age_range?: string
  leaders?: string
  capacity_label?: string
  demand_label?: string
  on_open?: () => void
}

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
          className="text-left font-bold underline decoration-black/25 underline-offset-4 hover:decoration-black"
          onClick={cell.on_open}
        >
          {cell.title}
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
          {cell.capacity_label ? (
            <WorkshopStatusBadge variant="free">{cell.capacity_label}</WorkshopStatusBadge>
          ) : null}
          {cell.demand_label ? <Badge tone="attention">{cell.demand_label}</Badge> : null}
        </span>
      ) : null}
    </td>
  )
}

export type ProgrammeRowView = {
  id: string
  slot_label: string
  cells: readonly ProgrammeCellView[]
}

export function ProgrammeGrid({
  rooms,
  rows,
  day_rows: dayRows = [],
}: {
  rooms: readonly { id: string; label: string }[]
  rows: readonly ProgrammeRowView[]
  day_rows?: readonly { id: string; label: string }[]
}) {
  const dayById = new Map(dayRows.map((day) => [day.id, day.label]))
  return (
    <div className="overflow-x-auto rounded-base border-2 border-black bg-white">
      <table className="w-full min-w-[48rem] text-left">
        <caption className="sr-only">Workshops nach Raum und Slot</caption>
        <thead>
          <tr className="border-b-2 border-black">
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
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-black/30">
              <th scope="row" className="p-3">
                {dayById.get(row.id) ? (
                  <span className="block text-sm text-muted">{dayById.get(row.id)}</span>
                ) : null}
                {row.slot_label}
              </th>
              {rooms.map((room, index) => (
                <ProgrammeCell
                  key={`${row.id}-${room.id}`}
                  cell={row.cells[index] ?? { id: `${row.id}-${room.id}`, state: 'empty' }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export type UnplacedWorkshopView = {
  id: string
  title: string
  reason: string
  demand_label?: string
}

export function UnplacedWorkshopRow({
  workshop,
  action,
}: {
  workshop: UnplacedWorkshopView
  action?: ReactNode
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 border-b border-black/30 bg-white p-4">
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

export type WorkshopOverlapView = {
  id: string
  workshops: string
  slot: string
  people_count: number
  people: readonly string[]
}

export function WorkshopOverlapRow({ overlap }: { overlap: WorkshopOverlapView }) {
  return (
    <tr className="border-b border-black/30">
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
