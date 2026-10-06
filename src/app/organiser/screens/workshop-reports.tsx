import { useMemo, type ReactNode } from 'react'
import { useLocation, useSearch } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import {
  WorkshopEmptyState,
  WorkshopErrorState,
  WorkshopLoadingState,
  WorkshopScreenHeader,
  WorkshopStatusBadge,
  type WorkshopListOption,
} from '../../components/shared/workshop/shared.js'
import { WorkshopNavigation } from './workshops.js'
import { useOrganiser } from '../context.js'
import {
  WorkshopFamilyPlanDocument,
  WorkshopListKinds,
  WorkshopListPickerWithDocument,
  WorkshopPersonPlanDocument,
  WorkshopRoomPlanDocument,
  WorkshopRosterDocument,
  type FamilyPlanSlot,
  type PersonPlanEntry,
  type RoomPlanEntry,
  type WorkshopRosterEntry,
} from '../components/workshop/reports.js'
import {
  buildWorkshopReportsProjection,
  type WorkshopReportFamily,
  type WorkshopReportFamilyCell,
  type WorkshopReportPerson,
  type WorkshopReportRoom,
  type WorkshopReportWorkshop,
} from '../../../modules/workshop-assignment/app/workshop-reports-view.js'

type WorkshopListKind = 'workshop' | 'person' | 'family' | 'room'

function listKind(pathname: string): WorkshopListKind {
  if (pathname.endsWith('/persons')) return 'person'
  if (pathname.endsWith('/families')) return 'family'
  if (pathname.endsWith('/rooms')) return 'room'
  return 'workshop'
}

function listPath(kind: WorkshopListKind): string {
  return {
    workshop: organiserPaths.workshop_workshop_list(),
    person: organiserPaths.workshop_person_list(),
    family: organiserPaths.workshop_family_list(),
    room: organiserPaths.workshop_room_list(),
  }[kind]
}

function personen(count: number): string {
  return `${count} ${count === 1 ? 'Person' : 'Personen'}`
}

function workshopOptions(workshops: readonly WorkshopReportWorkshop[]): WorkshopListOption[] {
  return workshops.map((workshop) => ({
    value: workshop.id,
    label: `${workshop.title} · ${personen(workshop.participant_count)}`,
    group: workshop.slot_label,
  }))
}

function personOptions(persons: readonly WorkshopReportPerson[]): WorkshopListOption[] {
  return persons.map((person) => ({
    value: person.id,
    label: person.kind === 'external' ? `${person.name} (extern)` : person.name,
  }))
}

function familyOptions(families: readonly WorkshopReportFamily[]): WorkshopListOption[] {
  return families.map((family) => ({
    value: family.id,
    label: `${family.name} · ${personen(family.members.length)}`,
  }))
}

function roomOptions(rooms: readonly WorkshopReportRoom[]): WorkshopListOption[] {
  return rooms.map((room) => ({ value: room.id, label: room.name }))
}

function rosterEntries(workshop: WorkshopReportWorkshop): WorkshopRosterEntry[] {
  return workshop.roster.map((entry) => ({
    id: entry.id,
    name: entry.name,
    age_label: entry.age_label,
    health: entry.health,
  }))
}

function personPlanEntries(person: WorkshopReportPerson): PersonPlanEntry[] {
  return person.entries.map((entry) => ({
    id: entry.id,
    slot: entry.slot_label,
    workshop: entry.workshop ?? undefined,
    room: entry.space ?? undefined,
    role: entry.role_label,
    status: entry.status,
  }))
}

function OpenNotice({ reason }: { reason: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <WorkshopStatusBadge tone="attention">Offen</WorkshopStatusBadge>
      {reason}
    </span>
  )
}

function FamilyCell({ cell }: { cell: WorkshopReportFamilyCell }) {
  if (!cell.workshop) return <span className="text-muted">—</span>
  return (
    <span className="grid gap-0.5">
      <span className="inline-flex flex-wrap items-center gap-2">
        <strong>{cell.workshop}</strong>
        {cell.lead ? <WorkshopStatusBadge>leitet</WorkshopStatusBadge> : null}
      </span>
      {cell.space ? <span className="text-sm text-muted">{cell.space}</span> : null}
    </span>
  )
}

function familyPlanSlots(family: WorkshopReportFamily): FamilyPlanSlot[] {
  return family.slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    members: family.members.map((member, index) => ({
      id: member.id,
      name: member.first_name,
      detail: member.open_reason ? (
        <>
          {member.age_label} <OpenNotice reason={member.open_reason} />
        </>
      ) : (
        member.age_label
      ),
      value: <FamilyCell cell={slot.cells[index]!} />,
    })),
  }))
}

function roomPlanEntries(room: WorkshopReportRoom): RoomPlanEntry[] {
  return room.entries.map((entry) => ({
    id: entry.id,
    time: entry.time,
    workshop: entry.workshop ?? undefined,
    audience: entry.audience ?? undefined,
    leaders: entry.leaders ?? undefined,
  }))
}

function WorkshopReport({ workshop }: { workshop: WorkshopReportWorkshop }) {
  return (
    <WorkshopRosterDocument
      title={workshop.title}
      metadata={[
        `${workshop.slot_label} · ${workshop.space_name}`,
        `Leitung: ${workshop.leaders.join(', ') || '—'}`,
        <>
          <strong>{personen(workshop.participant_count)}</strong> von {workshop.capacity}{' '}
          {workshop.capacity === 1 ? 'Platz' : 'Plätzen'} · {workshop.audience},{' '}
          {workshop.age_label}
          {workshop.health_count
            ? ` · ${personen(workshop.health_count)} mit Gesundheitshinweis`
            : ''}
          {workshop.interest_count ? ` · ${workshop.interest_count} Interessen` : ''}
        </>,
      ]}
      entries={rosterEntries(workshop)}
      confidential
      show_attendance
    />
  )
}

function PersonReport({ person }: { person: WorkshopReportPerson }) {
  const led = person.led_workshops.length ? ` · leitet ${person.led_workshops.join(', ')}` : ''
  const metadata: ReactNode[] =
    person.kind === 'external'
      ? [
          person.age_label,
          person.led_workshops.length
            ? `leitet ${person.led_workshops.join(', ')}`
            : 'Leitet keinen eingeplanten Workshop',
        ]
      : [
          `${person.age_label}${person.family_name ? ` · Familie ${person.family_name}` : ''}`,
          `${person.workshop_count} ${person.workshop_count === 1 ? 'Workshop' : 'Workshops'}${led}`,
        ]
  if (person.open_reason) metadata.push(<OpenNotice reason={person.open_reason} />)
  return (
    <WorkshopPersonPlanDocument
      title={person.name}
      metadata={metadata}
      entries={personPlanEntries(person)}
    />
  )
}

function FamilyReport({ family }: { family: WorkshopReportFamily }) {
  return (
    <WorkshopFamilyPlanDocument
      title={`Familie ${family.name}`}
      metadata={[family.members.map((member) => member.first_name).join(', ')]}
      slots={familyPlanSlots(family)}
    />
  )
}

function RoomReport({ room }: { room: WorkshopReportRoom }) {
  return (
    <WorkshopRoomPlanDocument
      title={room.name}
      metadata={[
        `${room.workshop_count} ${room.workshop_count === 1 ? 'Workshop' : 'Workshops'} in diesem Raum`,
      ]}
      entries={roomPlanEntries(room)}
    />
  )
}

export function WorkshopLists() {
  useDocumentTitle('Listen · Workshops · Familienfreizeit')
  // wouter's location is the pathname only; the selected documents live in the query.
  const [location, navigate] = useLocation()
  const search = useSearch()
  const { state, world, current_plan: currentPlan } = useOrganiser()
  const kind = listKind(location)
  const projection = useMemo(
    () =>
      world && currentPlan
        ? buildWorkshopReportsProjection({
            world,
            plan: currentPlan,
            time_zone: activeProfile.meta.timezone,
          })
        : null,
    [currentPlan, world],
  )

  const navigateWithQuery = (path: string, updates: Record<string, string | null>) => {
    const query = new URLSearchParams(search)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) query.delete(key)
      else query.set(key, value)
    }
    const suffix = query.toString()
    void navigate(`${path}${suffix ? `?${suffix}` : ''}`)
  }

  if (state.status === 'error' || state.status === 'stale_head') {
    return (
      <WorkshopErrorState title="Die Listen konnten nicht berechnet werden.">
        {state.error}
      </WorkshopErrorState>
    )
  }
  if (!projection) return <WorkshopLoadingState message="Workshoplisten werden berechnet …" />

  const query = new URLSearchParams(search)
  const selectedWorkshop =
    projection.workshops.find((item) => item.id === query.get('workshop')) ??
    projection.workshops[0]
  const selectedPerson =
    projection.persons.find((item) => item.id === query.get('person')) ?? projection.persons[0]
  const selectedFamily =
    projection.families.find((item) => item.id === query.get('family')) ?? projection.families[0]
  const selectedRoom =
    projection.rooms.find((item) => item.id === query.get('room')) ?? projection.rooms[0]

  const selectedDocument =
    kind === 'workshop' && selectedWorkshop ? (
      <WorkshopListPickerWithDocument
        label="Workshop auswählen"
        value={selectedWorkshop.id}
        options={workshopOptions(projection.workshops)}
        onChange={(value) => navigateWithQuery(listPath(kind), { workshop: value })}
      >
        <WorkshopReport workshop={selectedWorkshop} />
      </WorkshopListPickerWithDocument>
    ) : kind === 'person' && selectedPerson ? (
      <WorkshopListPickerWithDocument
        label="Person auswählen"
        value={selectedPerson.id}
        options={personOptions(projection.persons)}
        onChange={(value) => navigateWithQuery(listPath(kind), { person: value })}
      >
        <PersonReport person={selectedPerson} />
      </WorkshopListPickerWithDocument>
    ) : kind === 'family' && selectedFamily ? (
      <WorkshopListPickerWithDocument
        label="Familie auswählen"
        value={selectedFamily.id}
        options={familyOptions(projection.families)}
        onChange={(value) => navigateWithQuery(listPath(kind), { family: value })}
      >
        <FamilyReport family={selectedFamily} />
      </WorkshopListPickerWithDocument>
    ) : kind === 'room' && selectedRoom ? (
      <WorkshopListPickerWithDocument
        label="Raum auswählen"
        value={selectedRoom.id}
        options={roomOptions(projection.rooms)}
        onChange={(value) => navigateWithQuery(listPath(kind), { room: value })}
      >
        <RoomReport room={selectedRoom} />
      </WorkshopListPickerWithDocument>
    ) : (
      <WorkshopEmptyState title="Noch keine Daten für diese Liste">
        Für diese Liste gibt es noch keine passende Auswahl.
      </WorkshopEmptyState>
    )

  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Workshops · Listen"
        title="Listen"
        description="Druckbare Übersichten für Workshop, Person, Familie und Raum. Gesundheitsangaben bleiben auf die Organisationsansicht beschränkt."
      />
      <WorkshopListKinds
        value={kind}
        onChange={(value) =>
          navigateWithQuery(listPath(value), {
            workshop: null,
            person: null,
            family: null,
            room: null,
          })
        }
      />
      {selectedDocument}
    </div>
  )
}
