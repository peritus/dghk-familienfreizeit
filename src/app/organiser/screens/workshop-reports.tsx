import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useSearch } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import {
  WorkshopConfidentialityNotice,
  WorkshopEmptyState,
  WorkshopErrorState,
  WorkshopLoadingState,
  WorkshopScreenHeader,
  type WorkshopListOption,
} from '../../components/shared/workshop/shared.js'
import { WorkshopNavigation } from './workshops.js'
import { useOrganiser } from '../context.js'
import { draftCount } from '../state.js'
import {
  FamilyPlanCell,
  LeaderNames,
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

const queryKey: Record<WorkshopListKind, string> = {
  workshop: 'workshop',
  person: 'person',
  family: 'family',
  room: 'room',
}

function personen(count: number): string {
  return `${count} ${count === 1 ? 'Person' : 'Personen'}`
}

function workshops(count: number): string {
  return `${count} ${count === 1 ? 'Workshop' : 'Workshops'}`
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function workshopOptions(items: readonly WorkshopReportWorkshop[]): WorkshopListOption[] {
  return items.map((workshop) => ({
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
    age: entry.age_short,
    age_long: entry.age_label,
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
    participants: entry.participant_count,
  }))
}

function familyPlanSlots(family: WorkshopReportFamily): FamilyPlanSlot[] {
  return family.slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    members: family.members.map((member, index) => {
      const cell = slot.cells[index]!
      return {
        id: member.id,
        name: member.first_name,
        detail: member.age_label,
        value: (
          <FamilyPlanCell
            workshop={cell.workshop}
            room={cell.space}
            lead={cell.lead}
            open={cell.open}
          />
        ),
      }
    }),
  }))
}

function roomPlanEntries(room: WorkshopReportRoom): RoomPlanEntry[] {
  return room.entries.map((entry) => ({
    id: entry.id,
    time: entry.time,
    workshop: entry.workshop ?? undefined,
    audience: entry.audience ?? undefined,
    leaders: entry.leaders,
  }))
}

function workshopMetadata(workshop: WorkshopReportWorkshop): ReactNode[] {
  return [
    `${workshop.slot_long_label} · ${workshop.space_name}`,
    <>
      Leitung: <LeaderNames leaders={workshop.leaders} />
    </>,
    <>
      <strong>{personen(workshop.participant_count)}</strong> von {workshop.capacity}{' '}
      {workshop.capacity === 1 ? 'Platz' : 'Plätzen'} · {workshop.audience}, {workshop.age_label}
      {workshop.health_count ? ` · ${personen(workshop.health_count)} mit Gesundheitshinweis` : ''}
    </>,
  ]
}

function personMetadata(person: WorkshopReportPerson): ReactNode[] {
  if (person.kind === 'external') return [person.age_label]
  const led = person.led_workshops.length ? ` · leitet ${person.led_workshops.join(', ')}` : ''
  return [
    `${capitalized(person.age_label)}${person.family_name ? ` · Familie ${person.family_name}` : ''}`,
    `${workshops(person.workshop_count)}${led}`,
  ]
}

function printStamp(date: Date, revision: number, drafts: number): string {
  const day = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `Stand ${day}, ${time} Uhr · v${revision}${drafts ? ' · mit ungespeicherten Änderungen' : ''}`
}

/**
 * Date, time and revision of the printed data; refreshed right before printing. On
 * screen it closes the page, on paper it sits at the bottom of every sheet.
 */
function PrintStamp({ revision, drafts }: { revision: number; drafts: number }) {
  const [printedAt, setPrintedAt] = useState(() => new Date())
  const stamp = printStamp(printedAt, revision, drafts)
  useEffect(() => {
    const refresh = () => setPrintedAt(new Date())
    window.addEventListener('beforeprint', refresh)
    return () => window.removeEventListener('beforeprint', refresh)
  }, [])
  useEffect(() => {
    // The page margin box reads the stamp from the root element.
    const root = document.documentElement
    root.style.setProperty('--workshop-print-stamp', JSON.stringify(stamp))
    return () => {
      root.style.removeProperty('--workshop-print-stamp')
    }
  }, [stamp])
  return (
    <footer className="workshop-print-stamp mt-auto border-t-[1.5px] border-rule pt-2 text-xs text-muted tabular-nums">
      {stamp}
    </footer>
  )
}

export function WorkshopLists() {
  useDocumentTitle('Listen · Workshops · Familienfreizeit')
  // wouter's location is the pathname only; the selected documents live in the query.
  const [location, navigate] = useLocation()
  const search = useSearch()
  const { state, world, current_plan: currentPlan } = useOrganiser()
  const kind = listKind(location)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusDocument = useRef(false)
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

  const query = new URLSearchParams(search)
  const selectedId = query.get(queryKey[kind])
  useEffect(() => {
    // After previous/next, land on the new document the way the prototype does.
    if (!focusDocument.current) return
    focusDocument.current = false
    const heading = headingRef.current
    if (!heading) return
    heading.focus({ ['preventScroll']: true })
    heading.scrollIntoView?.({
      block: 'center',
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [kind, selectedId])

  const navigateWithQuery = (path: string, updates: Record<string, string | null>) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    const suffix = next.toString()
    void navigate(`${path}${suffix ? `?${suffix}` : ''}`)
  }
  const select = (value: string) => navigateWithQuery(listPath(kind), { [queryKey[kind]]: value })
  const step = (value: string) => {
    focusDocument.current = true
    select(value)
  }

  if (state.status === 'error' || state.status === 'stale_head') {
    return (
      <WorkshopErrorState title="Die Listen konnten nicht berechnet werden.">
        {state.error}
      </WorkshopErrorState>
    )
  }
  if (!projection) return <WorkshopLoadingState message="Workshoplisten werden berechnet …" />

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
    kind === 'workshop' ? (
      selectedWorkshop ? (
        <WorkshopListPickerWithDocument
          label="Workshop"
          value={selectedWorkshop.id}
          options={workshopOptions(projection.workshops)}
          onChange={select}
          onStep={step}
          notice={<WorkshopConfidentialityNotice />}
        >
          <WorkshopRosterDocument
            title={selectedWorkshop.title}
            metadata={workshopMetadata(selectedWorkshop)}
            entries={rosterEntries(selectedWorkshop)}
            heading_ref={headingRef}
          />
        </WorkshopListPickerWithDocument>
      ) : (
        <p className="text-muted">Sobald ein Workshop eingeplant ist, steht hier seine Liste.</p>
      )
    ) : kind === 'person' && selectedPerson ? (
      <WorkshopListPickerWithDocument
        label="Person suchen"
        value={selectedPerson.id}
        options={personOptions(projection.persons)}
        onChange={select}
        onStep={step}
        search
      >
        <WorkshopPersonPlanDocument
          title={selectedPerson.name}
          metadata={personMetadata(selectedPerson)}
          entries={personPlanEntries(selectedPerson)}
          heading_ref={headingRef}
        />
      </WorkshopListPickerWithDocument>
    ) : kind === 'family' && selectedFamily ? (
      <WorkshopListPickerWithDocument
        label="Familie"
        value={selectedFamily.id}
        options={familyOptions(projection.families)}
        onChange={select}
        onStep={step}
      >
        <WorkshopFamilyPlanDocument
          title={`Familie ${selectedFamily.name}`}
          metadata={[selectedFamily.members.map((member) => member.first_name).join(', ')]}
          slots={familyPlanSlots(selectedFamily)}
          heading_ref={headingRef}
        />
      </WorkshopListPickerWithDocument>
    ) : kind === 'room' && selectedRoom ? (
      <WorkshopListPickerWithDocument
        label="Raum"
        value={selectedRoom.id}
        options={roomOptions(projection.rooms)}
        onChange={select}
        onStep={step}
      >
        <WorkshopRoomPlanDocument
          title={selectedRoom.name}
          metadata={[`${workshops(selectedRoom.workshop_count)} in diesem Raum`]}
          entries={roomPlanEntries(selectedRoom)}
          heading_ref={headingRef}
        />
      </WorkshopListPickerWithDocument>
    ) : (
      <WorkshopEmptyState title="Noch keine Daten für diese Liste">
        Für diese Liste gibt es noch keine passende Auswahl.
      </WorkshopEmptyState>
    )

  return (
    <div className="workshop-lists flex flex-1 flex-col">
      <div className="workshop-screen-only space-y-8">
        <WorkshopNavigation />
        <WorkshopScreenHeader eyebrow="Workshops · Listen" title="Listen" />
        <WorkshopListKinds
          value={kind}
          // Each list keeps its own selection in the query, so switching back returns to it.
          onChange={(value) => navigateWithQuery(listPath(value), {})}
        />
      </div>
      <div className="workshop-list-body mt-6 mb-10">{selectedDocument}</div>
      <PrintStamp revision={state.head_seq} drafts={draftCount(state)} />
    </div>
  )
}
