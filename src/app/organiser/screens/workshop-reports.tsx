import { useMemo } from 'react'
import { useLocation } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import {
  WorkshopEmptyState,
  WorkshopErrorState,
  WorkshopLoadingState,
  WorkshopScreenHeader,
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

function queryFor(location: string): URLSearchParams {
  return new URLSearchParams(location.split('?')[1] ?? '')
}

function workshopOptions(workshops: readonly WorkshopReportWorkshop[]) {
  return workshops.map((workshop) => ({
    value: workshop.id,
    label: `${workshop.title} · ${workshop.status_label}`,
  }))
}

function personOptions(persons: readonly WorkshopReportPerson[]) {
  return persons.map((person) => ({
    value: person.id,
    label: `${person.name} · ${person.age_label}`,
  }))
}

function familyOptions(families: readonly WorkshopReportFamily[]) {
  return families.map((family) => ({ value: family.id, label: family.name }))
}

function roomOptions(rooms: readonly WorkshopReportRoom[]) {
  return rooms.map((room) => ({ value: room.id, label: room.name }))
}

function rosterEntries(workshop: WorkshopReportWorkshop): WorkshopRosterEntry[] {
  return workshop.roster.map((entry) => ({
    id: entry.id,
    name: entry.name,
    age_label: entry.age_label,
    health: entry.health,
    emergency_contact: entry.emergency_contact,
  }))
}

function personPlanEntries(person: WorkshopReportPerson): PersonPlanEntry[] {
  return person.entries.map((entry) => ({
    id: entry.id,
    slot: entry.slot_label,
    workshop: entry.workshop ?? undefined,
    room: entry.space ?? undefined,
    role: entry.role_label,
    status: entry.status === 'free' ? 'free' : entry.status,
  }))
}

function familyPlanSlots(family: WorkshopReportFamily): FamilyPlanSlot[] {
  return family.slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    members: slot.members,
  }))
}

function roomPlanEntries(room: WorkshopReportRoom): RoomPlanEntry[] {
  return room.entries.map((entry) => ({
    id: entry.id,
    time: entry.time,
    workshop: entry.workshop,
    audience: entry.audience,
    leaders: entry.leaders,
  }))
}

function WorkshopReport({ workshop }: { workshop: WorkshopReportWorkshop }) {
  return (
    <WorkshopRosterDocument
      title={workshop.title}
      metadata={[
        workshop.slot_label && workshop.space_name
          ? `${workshop.slot_label} · ${workshop.space_name}`
          : 'Ohne Termin oder Raum',
        `Leitung: ${workshop.leaders.join(', ') || '—'}`,
        `${workshop.participant_count} von ${workshop.capacity} Plätzen · ${workshop.audience}, ${workshop.age_label}${workshop.interest_count ? ` · ${workshop.interest_count} Interessen` : ''}`,
      ]}
      entries={rosterEntries(workshop)}
      confidential
      show_attendance
    />
  )
}

function PersonReport({ person }: { person: WorkshopReportPerson }) {
  return (
    <WorkshopPersonPlanDocument
      title={person.name}
      metadata={[`${person.age_label}${person.family_name ? ` · ${person.family_name}` : ''}`]}
      entries={personPlanEntries(person)}
    />
  )
}

function FamilyReport({ family }: { family: WorkshopReportFamily }) {
  return (
    <WorkshopFamilyPlanDocument
      title={family.name}
      metadata={[
        `${family.members.length} ${family.members.length === 1 ? 'Person' : 'Personen'}`,
        family.email ? `Kontakt: ${family.email}` : 'Kein Kontakt hinterlegt',
      ]}
      slots={familyPlanSlots(family)}
    />
  )
}

function RoomReport({ room }: { room: WorkshopReportRoom }) {
  return (
    <WorkshopRoomPlanDocument
      title={room.name}
      metadata={[
        `${room.entries.length} ${room.entries.length === 1 ? 'Workshop' : 'Workshops'} in diesem Raum`,
        `${room.location} · ${room.capacity} Plätze`,
      ]}
      entries={roomPlanEntries(room)}
    />
  )
}

export function WorkshopLists() {
  useDocumentTitle('Listen · Workshops · Familienfreizeit')
  const [location, navigate] = useLocation()
  const { state, world, current_plan: currentPlan } = useOrganiser()
  const kind = listKind(location.split('?')[0] ?? location)
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
    const query = queryFor(location)
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

  const query = queryFor(location)
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
        description="Druckbare Übersichten für Workshop, Person, Familie und Raum. Gesundheits- und Kontaktdaten bleiben auf die Organisationsansicht beschränkt."
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
