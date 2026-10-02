import {
  WorkshopDataTable,
  WorkshopResponsiveCollection,
  WorkshopStatsStrip,
  WorkshopStatusBadge,
  type WorkshopStatusTone,
} from '../../../../app/components/shared/workshop/shared.js'

export type AssignmentView = {
  workshop_id: string
  workshop_title: string
  slot_label: string
  status: string
  status_tone?: WorkshopStatusTone
}

export type ParticipationPersonView = {
  id: string
  name: string
  age_label: string
  group_label: string
  assignments: readonly AssignmentView[]
  status: string
  status_tone?: WorkshopStatusTone
}

export function AssignmentCell({ assignment }: { assignment?: AssignmentView }) {
  return assignment ? (
    <div className="grid gap-1 rounded-base border-2 border-border bg-secondary-background p-2 text-sm">
      <strong>{assignment.workshop_title}</strong>
      <span className="text-muted">{assignment.slot_label}</span>
      <WorkshopStatusBadge tone={assignment.status_tone}>{assignment.status}</WorkshopStatusBadge>
    </div>
  ) : (
    <span className="text-muted">—</span>
  )
}

export function ParticipationRow({
  person,
  slot_count: slotCount,
}: {
  person: ParticipationPersonView
  slot_count: number
}) {
  return (
    <tr className="border-b border-border/30 align-top">
      <th scope="row" className="p-3 text-left">
        <div className="grid gap-1">
          <strong>{person.name}</strong>
          <span className="text-sm text-muted">
            {person.age_label} · {person.group_label}
          </span>
        </div>
      </th>
      {Array.from({ length: slotCount }, (_, index) => (
        <td key={index} className="min-w-40 p-3">
          <AssignmentCell assignment={person.assignments[index]} />
        </td>
      ))}
      <td className="p-3">
        <WorkshopStatusBadge tone={person.status_tone}>{person.status}</WorkshopStatusBadge>
      </td>
    </tr>
  )
}

export function AttendancePersonCard({
  person,
  slot_count: slotCount,
}: {
  person: ParticipationPersonView
  slot_count: number
}) {
  return (
    <li className="grid gap-3 rounded-base border-2 border-border bg-secondary-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{person.name}</h3>
          <p className="text-sm text-muted">
            {person.age_label} · {person.group_label}
          </p>
        </div>
        <WorkshopStatusBadge tone={person.status_tone}>{person.status}</WorkshopStatusBadge>
      </div>
      <ol className="grid gap-2">
        {Array.from({ length: slotCount }, (_, index) => (
          <li key={index} className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Slot {index + 1}
            </span>
            <AssignmentCell assignment={person.assignments[index]} />
          </li>
        ))}
      </ol>
    </li>
  )
}

export function AttendanceMatrix({
  people,
  slots,
}: {
  people: readonly ParticipationPersonView[]
  slots: readonly string[]
}) {
  const table = (
    <WorkshopDataTable
      caption="Teilnahmen nach Person und Slot"
      columns={[
        { key: 'person', label: 'Person' },
        ...slots.map((slot, index) => ({ key: `slot-${index}`, label: slot })),
        { key: 'status', label: 'Abdeckung' },
      ]}
      rows={people}
      rowKey={(person) => person.id}
      renderRow={(person) => (
        <ParticipationRow key={person.id} person={person} slot_count={slots.length} />
      )}
    />
  )
  return (
    <WorkshopResponsiveCollection
      wide={table}
      narrow={
        <ul className="grid gap-3">
          {people.map((person) => (
            <AttendancePersonCard key={person.id} person={person} slot_count={slots.length} />
          ))}
        </ul>
      }
    />
  )
}

export type GroupSummaryView = {
  id: string
  label: string
  people: number
  assigned: number
  unassigned: number
  open_cases: number
}

export function GroupSummaryTable({ groups }: { groups: readonly GroupSummaryView[] }) {
  return (
    <WorkshopDataTable
      caption="Teilnahmen nach Gruppe"
      columns={[
        { key: 'group', label: 'Gruppe' },
        { key: 'people', label: 'Personen', numeric: true },
        { key: 'assigned', label: 'zugeordnet', numeric: true },
        { key: 'unassigned', label: 'ohne Platz', numeric: true },
        { key: 'cases', label: 'offene Fälle', numeric: true },
      ]}
      rows={groups}
      rowKey={(group) => group.id}
      renderRow={(group) => (
        <tr key={group.id} className="border-b border-border/30">
          <th scope="row" className="p-3 text-left">
            {group.label}
          </th>
          <td className="p-3 text-right">{group.people}</td>
          <td className="p-3 text-right">{group.assigned}</td>
          <td className="p-3 text-right">{group.unassigned}</td>
          <td className="p-3 text-right">{group.open_cases}</td>
        </tr>
      )}
    />
  )
}

export function ParticipationDistribution({
  total,
  assigned,
  unassigned,
  open_cases: openCases,
}: {
  total: number
  assigned: number
  unassigned: number
  open_cases: number
}) {
  return (
    <WorkshopStatsStrip
      items={[
        { label: 'Personen', value: total },
        { label: 'zugeordnet', value: assigned },
        { label: 'ohne Platz', value: unassigned },
        { label: 'offene Fälle', value: openCases },
      ]}
    />
  )
}

export type UnrequestedAssignmentView = {
  id: string
  person: string
  age_label: string
  workshop_title: string
  reason: string
  priority: string
  priority_tone?: WorkshopStatusTone
}

export function UnrequestedAssignmentRow({
  assignment,
}: {
  assignment: UnrequestedAssignmentView
}) {
  return (
    <tr className="border-b border-border/30">
      <th scope="row" className="p-3 text-left">
        {assignment.person}
      </th>
      <td className="p-3">{assignment.age_label}</td>
      <td className="p-3">{assignment.workshop_title}</td>
      <td className="p-3">{assignment.reason}</td>
      <td className="p-3">
        <WorkshopStatusBadge tone={assignment.priority_tone}>
          {assignment.priority}
        </WorkshopStatusBadge>
      </td>
    </tr>
  )
}

export function UnrequestedAssignmentsTable({
  assignments,
}: {
  assignments: readonly UnrequestedAssignmentView[]
}) {
  return (
    <WorkshopDataTable
      caption="Zuordnungen ohne passenden Wunsch"
      columns={[
        { key: 'person', label: 'Person' },
        { key: 'age', label: 'Alter' },
        { key: 'workshop', label: 'Workshop' },
        { key: 'reason', label: 'Grund' },
        { key: 'priority', label: 'Priorität' },
      ]}
      rows={assignments}
      rowKey={(assignment) => assignment.id}
      renderRow={(assignment) => (
        <UnrequestedAssignmentRow key={assignment.id} assignment={assignment} />
      )}
    />
  )
}

export type OpenParticipationCaseView = {
  id: string
  person: string
  kind: string
  detail: string
  action: string
  status: string
  status_tone?: WorkshopStatusTone
}

export function OpenParticipationCaseRow({
  case_item: caseItem,
}: {
  case_item: OpenParticipationCaseView
}) {
  return (
    <tr className="border-b border-border/30 align-top">
      <th scope="row" className="p-3 text-left">
        {caseItem.person}
      </th>
      <td className="p-3">{caseItem.kind}</td>
      <td className="p-3">{caseItem.detail}</td>
      <td className="p-3">{caseItem.action}</td>
      <td className="p-3">
        <WorkshopStatusBadge tone={caseItem.status_tone}>{caseItem.status}</WorkshopStatusBadge>
      </td>
    </tr>
  )
}

export function OpenParticipationCasesTable({
  cases,
}: {
  cases: readonly OpenParticipationCaseView[]
}) {
  return (
    <WorkshopDataTable
      caption="Offene Teilnahmefälle"
      columns={[
        { key: 'person', label: 'Person' },
        { key: 'kind', label: 'Fall' },
        { key: 'detail', label: 'Details' },
        { key: 'action', label: 'Nächster Schritt' },
        { key: 'status', label: 'Status' },
      ]}
      rows={cases}
      rowKey={(caseItem) => caseItem.id}
      renderRow={(caseItem) => <OpenParticipationCaseRow key={caseItem.id} case_item={caseItem} />}
    />
  )
}
