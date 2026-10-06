import type { ReactNode } from 'react'
import { TertiaryNavigation } from '../../../components/shared/ui/tertiary-navigation.js'
import {
  WorkshopDataTable,
  WorkshopListPicker,
  type WorkshopListOption,
  WorkshopPrintDocument,
  WorkshopResponsiveCollection,
  WorkshopStatusBadge,
} from '../../../components/shared/workshop/shared.js'

export type WorkshopRosterEntry = {
  id: string
  name: string
  age_label: string
  health?: string
  attendance?: boolean
}

export function WorkshopRosterTable({
  entries,
  show_health: showHealth = true,
  show_attendance: showAttendance = false,
}: {
  entries: readonly WorkshopRosterEntry[]
  show_health?: boolean
  show_attendance?: boolean
}) {
  return (
    <WorkshopDataTable
      caption="Teilnahmeliste"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'age', label: 'Alter' },
        ...(showHealth ? [{ key: 'health', label: 'Allergien und Gesundheit' }] : []),
        ...(showAttendance ? [{ key: 'attendance', label: 'Anwesend' }] : []),
      ]}
      rows={entries}
      rowKey={(entry) => entry.id}
      renderRow={(entry) => (
        <tr key={entry.id} className="border-b border-border/30">
          <th scope="row" className="p-3">
            {entry.name}
          </th>
          <td className="p-3">{entry.age_label}</td>
          {showHealth ? (
            <td className="p-3">
              {entry.health ?? <span className="text-muted">keine Angabe</span>}
            </td>
          ) : null}
          {showAttendance ? (
            <td className="p-3">
              <AttendanceCheckCell checked={entry.attendance} />
            </td>
          ) : null}
        </tr>
      )}
    />
  )
}

export function WorkshopRosterCards({ entries }: { entries: readonly WorkshopRosterEntry[] }) {
  return (
    <ul className="grid gap-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="grid gap-1 rounded-base border-2 border-border bg-secondary-background p-4"
        >
          <strong>{entry.name}</strong>
          <span className="text-sm text-muted">{entry.age_label}</span>
          {entry.health ? <strong className="text-sm">{entry.health}</strong> : null}
        </li>
      ))}
    </ul>
  )
}

export function AttendanceCheckCell({ checked = false }: { checked?: boolean }) {
  return (
    <span
      aria-label={checked ? 'anwesend' : 'nicht markiert'}
      className="inline-block size-5 border-2 border-border"
    >
      {checked ? '✓' : null}
    </span>
  )
}

export type PersonPlanEntry = {
  id: string
  slot: string
  workshop?: string
  room?: string
  role?: string
  status?:
    | 'open'
    | 'assigned'
    | 'fixed'
    | 'lead'
    | 'signup'
    | 'interest'
    | 'free'
    | 'available'
    | 'unavailable'
}

function emptyPlanSlot(status: PersonPlanEntry['status']): string {
  return status === 'open' ? 'Offen' : status === 'free' ? 'frei' : '—'
}

export function PersonPlanTable({ entries }: { entries: readonly PersonPlanEntry[] }) {
  return (
    <WorkshopDataTable
      caption="Workshopplan einer Person"
      columns={[
        { key: 'slot', label: 'Slot' },
        { key: 'workshop', label: 'Workshop' },
        { key: 'room', label: 'Raum' },
        { key: 'role', label: 'Rolle' },
      ]}
      rows={entries}
      rowKey={(entry) => entry.id}
      renderRow={(entry) => (
        <tr key={entry.id} className="border-b border-border/30">
          <th scope="row" className="p-3">
            {entry.slot}
          </th>
          <td className="p-3">
            {entry.workshop ? (
              <strong>{entry.workshop}</strong>
            ) : entry.status === 'open' ? (
              <WorkshopStatusBadge tone="attention">Offen</WorkshopStatusBadge>
            ) : (
              <span className="text-muted">{emptyPlanSlot(entry.status)}</span>
            )}
          </td>
          <td className="p-3">{entry.room ?? '—'}</td>
          <td className="p-3">{entry.role ?? '—'}</td>
        </tr>
      )}
    />
  )
}

export function PersonPlanCards({ entries }: { entries: readonly PersonPlanEntry[] }) {
  return (
    <ul className="grid gap-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="grid gap-1 rounded-base border-2 border-border bg-secondary-background p-4"
        >
          <strong>{entry.slot}</strong>
          <span>{entry.workshop ?? emptyPlanSlot(entry.status)}</span>
          <span className="text-sm text-muted">
            {entry.room ?? '—'} · {entry.role ?? '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

export type FamilyPlanSlot = {
  id: string
  label: string
  members: readonly { id: string; name: string; detail?: ReactNode; value: ReactNode }[]
}

export function FamilyPlanTable({ slots }: { slots: readonly FamilyPlanSlot[] }) {
  const members = slots[0]?.members ?? []
  return (
    <div className="overflow-x-auto rounded-base border-2 border-border bg-secondary-background">
      <table className="w-full min-w-[42rem] text-left">
        <caption className="sr-only">Familienplan</caption>
        <thead>
          <tr className="border-b-2 border-border">
            <th scope="col" className="p-3">
              Slot
            </th>
            {members.map((member) => (
              <th scope="col" key={member.id} className="p-3 align-top">
                {member.name}
                {member.detail ? (
                  <span className="block text-sm font-normal text-muted">{member.detail}</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.id} className="border-b border-border/30">
              <th scope="row" className="p-3">
                {slot.label}
              </th>
              {slot.members.map((member) => (
                <td key={member.id} className="p-3">
                  {member.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FamilyPlanCards({ slots }: { slots: readonly FamilyPlanSlot[] }) {
  return (
    <ul className="grid gap-3">
      {slots.map((slot) => (
        <li
          key={slot.id}
          className="grid gap-2 rounded-base border-2 border-border bg-secondary-background p-4"
        >
          <strong>{slot.label}</strong>
          {slot.members.map((member) => (
            <div key={member.id} className="text-sm">
              <strong>{member.name}:</strong> {member.value}
            </div>
          ))}
        </li>
      ))}
    </ul>
  )
}

export type RoomPlanEntry = {
  id: string
  time: string
  workshop?: string
  audience?: string
  leaders?: string
}

export function RoomPlanTable({ entries }: { entries: readonly RoomPlanEntry[] }) {
  return (
    <WorkshopDataTable
      caption="Raumplan"
      columns={[
        { key: 'time', label: 'Zeit' },
        { key: 'workshop', label: 'Workshop' },
        { key: 'audience', label: 'Für' },
        { key: 'leaders', label: 'Leitung' },
      ]}
      rows={entries}
      rowKey={(entry) => entry.id}
      renderRow={(entry) => (
        <tr key={entry.id} className="border-b border-border/30">
          <th scope="row" className="p-3">
            {entry.time}
          </th>
          <td className="p-3">{entry.workshop ?? <span className="text-muted">—</span>}</td>
          <td className="p-3">{entry.audience ?? '—'}</td>
          <td className="p-3">{entry.leaders ?? '—'}</td>
        </tr>
      )}
    />
  )
}

export function RoomPlanCards({ entries }: { entries: readonly RoomPlanEntry[] }) {
  return (
    <ul className="grid gap-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="grid gap-1 rounded-base border-2 border-border bg-secondary-background p-4"
        >
          <strong>{entry.time}</strong>
          <span>{entry.workshop ?? '—'}</span>
          <span className="text-sm text-muted">
            {entry.audience ?? '—'} · {entry.leaders ?? '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function WorkshopListKinds({
  value,
  onChange,
}: {
  value: 'workshop' | 'person' | 'family' | 'room'
  onChange: (value: 'workshop' | 'person' | 'family' | 'room') => void
}) {
  return (
    <TertiaryNavigation
      aria_label="Art der Liste"
      value={value}
      onChange={(next) => onChange(next as 'workshop' | 'person' | 'family' | 'room')}
      items={[
        { value: 'workshop', label: 'Workshop' },
        { value: 'person', label: 'Person' },
        { value: 'family', label: 'Familie' },
        { value: 'room', label: 'Raum' },
      ]}
    />
  )
}

export function WorkshopRosterDocument({
  title,
  metadata,
  entries,
  confidential = true,
  show_attendance: showAttendance = false,
}: {
  title: string
  metadata: readonly ReactNode[]
  entries: readonly WorkshopRosterEntry[]
  confidential?: boolean
  show_attendance?: boolean
}) {
  return (
    <WorkshopPrintDocument title={title} metadata={metadata} confidential={confidential}>
      <WorkshopResponsiveCollection
        wide={<WorkshopRosterTable entries={entries} show_attendance={showAttendance} />}
        narrow={<WorkshopRosterCards entries={entries} />}
      />
    </WorkshopPrintDocument>
  )
}

export function WorkshopPersonPlanDocument({
  title,
  metadata,
  entries,
}: {
  title: string
  metadata: readonly ReactNode[]
  entries: readonly PersonPlanEntry[]
}) {
  return (
    <WorkshopPrintDocument title={title} metadata={metadata}>
      <WorkshopResponsiveCollection
        wide={<PersonPlanTable entries={entries} />}
        narrow={<PersonPlanCards entries={entries} />}
      />
    </WorkshopPrintDocument>
  )
}

export function WorkshopFamilyPlanDocument({
  title,
  metadata,
  slots,
}: {
  title: string
  metadata: readonly ReactNode[]
  slots: readonly FamilyPlanSlot[]
}) {
  return (
    <WorkshopPrintDocument title={title} metadata={metadata}>
      <WorkshopResponsiveCollection
        wide={<FamilyPlanTable slots={slots} />}
        narrow={<FamilyPlanCards slots={slots} />}
      />
    </WorkshopPrintDocument>
  )
}

export function WorkshopRoomPlanDocument({
  title,
  metadata,
  entries,
}: {
  title: string
  metadata: readonly ReactNode[]
  entries: readonly RoomPlanEntry[]
}) {
  return (
    <WorkshopPrintDocument title={title} metadata={metadata}>
      <WorkshopResponsiveCollection
        wide={<RoomPlanTable entries={entries} />}
        narrow={<RoomPlanCards entries={entries} />}
      />
    </WorkshopPrintDocument>
  )
}

export function WorkshopListPickerWithDocument({
  label,
  value,
  options,
  onChange,
  children,
}: {
  label: string
  value: string
  options: readonly WorkshopListOption[]
  onChange: (value: string) => void
  children: ReactNode
}) {
  const index = options.findIndex((option) => option.value === value)
  const previous = index > 0 ? options[index - 1] : undefined
  const next = index >= 0 && index < options.length - 1 ? options[index + 1] : undefined
  return (
    <div className="space-y-5">
      <WorkshopListPicker
        label={label}
        value={value}
        options={options}
        onChange={onChange}
        onPrevious={previous ? () => onChange(previous.value) : undefined}
        onNext={next ? () => onChange(next.value) : undefined}
      />
      {children}
    </div>
  )
}
