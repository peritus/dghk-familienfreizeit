import { workshopAgeLabel } from '../../official-workshops/checks.js'
import type { World, Label } from '../../../events/fold.js'
import type { Plan } from '../../../solver/types.js'
import {
  officialWorkshopsWorld,
  type ExternalLeader,
  type WorkshopRecord,
} from '../../official-workshops/index.js'
import { workshopAssignmentSection, type WorkshopAssignmentSection } from '../index.js'
import {
  workshopSchedulingWorld,
  type WorkshopPlacement,
  type WorkshopSchedulingSection,
  type WorkshopSlot,
} from '../../workshop-scheduling/index.js'
import { workshopSpaceWorld } from '../../workshop-space/index.js'

export type WorkshopReportSlot = {
  id: string
  /** Short form for tables and pickers, e.g. "Fr 09:00–11:00". */
  label: string
  /** Long form for document headers, e.g. "Freitag, 14. Mai 2027, 09:00–11:00 Uhr". */
  long_label: string
  starts_at: string
  ends_at: string
  sort_key: number
}

export type WorkshopReportLeader = {
  name: string
  external: boolean
}

export type WorkshopReportRosterEntry = {
  id: string
  person_id: string
  name: string
  /** Compact table form: a child's age as a number, adults "erw.". */
  age_short: string
  /** Card form: "7 Jahre" or "erwachsen". */
  age_label: string
  health?: string
  source: 'assignment' | 'signup'
}

export type WorkshopReportWorkshop = {
  id: string
  title: string
  audience: string
  age_label: string
  capacity: number
  mode: WorkshopRecord['mode']
  slot_id: string
  slot_label: string
  slot_long_label: string
  space_id: string
  space_name: string
  leaders: readonly WorkshopReportLeader[]
  participant_count: number
  health_count: number
  roster: readonly WorkshopReportRosterEntry[]
}

export type WorkshopReportPersonPlanStatus =
  | 'free'
  | 'open'
  | 'assigned'
  | 'fixed'
  | 'lead'
  | 'signup'
  | 'interest'
  | 'available'
  | 'unavailable'

export type WorkshopReportPersonPlanEntry = {
  id: string
  slot_id: string
  slot_label: string
  workshop_id: string | null
  workshop: string | null
  space: string | null
  status: WorkshopReportPersonPlanStatus
  /** Role text; empty for a free or unavailable slot. */
  role_label: string
  /** Participants of a workshop an external leader leads in this slot. */
  participant_count: number | null
}

export type WorkshopReportPerson = {
  id: string
  kind: 'person' | 'external'
  name: string
  /** "9 Jahre" or "erwachsen"; "Externe Leitung" for external leaders. */
  age_label: string
  family_id: string | null
  family_name: string | null
  workshop_count: number
  led_workshops: readonly string[]
  /** Why the resolver could not give this person any workshop, if it could not. */
  open_reason: string | null
  entries: readonly WorkshopReportPersonPlanEntry[]
}

export type WorkshopReportFamilyMember = {
  id: string
  name: string
  first_name: string
  age_label: string
  open: boolean
}

export type WorkshopReportFamilyCell = {
  member_id: string
  workshop: string | null
  space: string | null
  lead: boolean
  /** The member is an open case and has nothing in this slot. */
  open: boolean
}

export type WorkshopReportFamilySlot = {
  id: string
  label: string
  cells: readonly WorkshopReportFamilyCell[]
}

export type WorkshopReportFamily = {
  id: string
  name: string
  members: readonly WorkshopReportFamilyMember[]
  slots: readonly WorkshopReportFamilySlot[]
}

export type WorkshopReportRoomEntry = {
  id: string
  slot_id: string
  time: string
  workshop_id: string | null
  workshop: string | null
  audience: string | null
  leaders: readonly WorkshopReportLeader[]
}

export type WorkshopReportRoom = {
  id: string
  name: string
  workshop_count: number
  entries: readonly WorkshopReportRoomEntry[]
}

export type WorkshopReportsProjection = {
  slots: readonly WorkshopReportSlot[]
  workshops: readonly WorkshopReportWorkshop[]
  persons: readonly WorkshopReportPerson[]
  families: readonly WorkshopReportFamily[]
  rooms: readonly WorkshopReportRoom[]
}

export type WorkshopReportsProjectionInput = {
  world: World
  plan: Plan
  time_zone: string
}

function stringLabel(labels: readonly Label[], key: string): string | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'string' && value.trim() ? value : null
}

function numberLabel(labels: readonly Label[], key: string): number | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
}

function personName(world: World, personId: string): string {
  const labels = world.labels_by_entity[personId] ?? []
  return (
    [stringLabel(labels, 'given-name'), stringLabel(labels, 'family-name')]
      .filter((value): value is string => Boolean(value))
      .join(' ') || personId
  )
}

function firstName(world: World, personId: string): string {
  return (
    stringLabel(world.labels_by_entity[personId] ?? [], 'given-name') ?? personName(world, personId)
  )
}

function isAdult(world: World, personId: string): boolean {
  return stringLabel(world.labels_by_entity[personId] ?? [], 'role') === 'adult'
}

function ageOf(world: World, personId: string): number | null {
  return numberLabel(world.labels_by_entity[personId] ?? [], 'age')
}

function ageLabel(world: World, personId: string): string {
  const age = ageOf(world, personId)
  return isAdult(world, personId) ? 'erwachsen' : age === null ? 'Kind' : `${age} Jahre`
}

function ageShort(world: World, personId: string): string {
  const age = ageOf(world, personId)
  return isAdult(world, personId) ? 'erw.' : age === null ? '—' : String(age)
}

/** The profile's person note for allergies, intolerances, and emergencies. */
function healthNote(world: World, personId: string): string | undefined {
  return stringLabel(world.labels_by_entity[personId] ?? [], 'food-note') ?? undefined
}

function datePart(value: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new globalThis.Date(value).toLocaleDateString('de-DE', {
    ...options,
    ['timeZone']: timeZone,
  })
}

function timeLabel(startsAt: string, endsAt: string, timeZone: string): string {
  const time = (value: string) =>
    new globalThis.Date(value).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      ['timeZone']: timeZone,
    })
  return `${time(startsAt)}–${time(endsAt)}`
}

function slotLabel(slot: WorkshopSlot, timeZone: string): string {
  const weekday = datePart(slot.starts_at, timeZone, { weekday: 'short' }).replace(/\.$/, '')
  return `${weekday} ${timeLabel(slot.starts_at, slot.ends_at, timeZone)}`
}

function slotLongLabel(slot: WorkshopSlot, timeZone: string): string {
  const date = datePart(slot.starts_at, timeZone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${date}, ${timeLabel(slot.starts_at, slot.ends_at, timeZone)} Uhr`
}

function audienceLabel(value: string): string {
  return { children: 'Kinder', adults: 'Erwachsene', all: 'Alle' }[value] ?? value
}

function openReasonLabel(reason: string): string {
  switch (reason) {
    case 'no eligible capacity':
      return 'Alle passenden Workshops sind voll.'
    case 'no current workshop choice':
      return 'Keine Workshopwahl abgegeben.'
    default:
      return reason
  }
}

function leader(
  world: World,
  externalLeaders: readonly ExternalLeader[],
  id: string,
): WorkshopReportLeader {
  if (world.entity_kind_by_id[id] === 'person')
    return { name: personName(world, id), external: false }
  return { name: externalLeaders.find((item) => item.id === id)?.name ?? id, external: true }
}

function byName<T extends { id: string; name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name, 'de') || left.id.localeCompare(right.id)
}

function reportSlots(slots: readonly WorkshopSlot[], timeZone: string): WorkshopReportSlot[] {
  return slots
    .slice()
    .sort((left, right) => left.sort_key - right.sort_key || left.id.localeCompare(right.id))
    .map((slot) => ({
      id: slot.id,
      label: slotLabel(slot, timeZone),
      long_label: slotLongLabel(slot, timeZone),
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      sort_key: slot.sort_key,
    }))
}

function familyIdFor(world: World, personId: string): string | null {
  const value = world.labels_by_entity[personId]?.find((label) => label.key === 'member-of')?.value
  return typeof value === 'string' ? value : null
}

function participationKey(personId: string, workshopId: string): string {
  return `${personId}:${workshopId}`
}

type PlanContext = {
  slots: readonly WorkshopReportSlot[]
  workshops: ReadonlyMap<string, WorkshopReportWorkshop>
  placements: ReadonlyMap<string, WorkshopPlacement>
  assignment: WorkshopAssignmentSection
  /** `${leader id}:${slot id}` -> workshop ids led in that slot. */
  leader_workshops: ReadonlyMap<string, readonly string[]>
  /** Person id -> reason the resolver left the person without any workshop. */
  open_reasons: ReadonlyMap<string, string>
}

function buildPersonEntries(
  personId: string,
  context: PlanContext,
): WorkshopReportPersonPlanEntry[] {
  const assignmentBySlot = new Map(
    context.assignment.assignments
      .filter((item) => item.person_id === personId)
      .map((item) => [item.slot_id, item]),
  )
  const signupIds = context.assignment.signups
    .filter((item) => item.person_id === personId)
    .map((item) => item.workshop_id)
  const interestIds = context.assignment.interests
    .filter((item) => item.person_id === personId)
    .map((item) => item.workshop_id)
  const openReason = context.open_reasons.get(personId)
  const inSlot = (ids: readonly string[], slotId: string) =>
    ids.find((id) => context.placements.get(id)?.slot_id === slotId)
  return context.slots.map((slot) => {
    const ledWorkshopId = context.leader_workshops.get(`${personId}:${slot.id}`)?.[0]
    const assignment = assignmentBySlot.get(slot.id)
    const workshopId = ledWorkshopId ?? assignment?.workshop_id ?? null
    const signup = workshopId ? undefined : inSlot(signupIds, slot.id)
    const interest = workshopId || signup ? undefined : inSlot(interestIds, slot.id)
    const selectedWorkshopId = workshopId ?? signup ?? interest ?? null
    const selectedWorkshop = selectedWorkshopId
      ? context.workshops.get(selectedWorkshopId)
      : undefined
    const status: WorkshopReportPersonPlanStatus = ledWorkshopId
      ? 'lead'
      : assignment?.reason === 'fixed'
        ? 'fixed'
        : assignment
          ? 'assigned'
          : signup
            ? 'signup'
            : interest
              ? 'interest'
              : openReason
                ? 'open'
                : 'free'
    const roleLabel = {
      lead: 'leitet',
      fixed: 'nimmt teil (fest zugeordnet)',
      assigned: assignment?.rank ? `nimmt teil (${assignment.rank}. Wahl)` : 'nimmt teil',
      signup: 'Anmeldung',
      interest: 'Interesse',
      open: openReason ?? '',
      free: '',
      available: 'verfügbar',
      unavailable: '',
    }[status]
    return {
      id: `${personId}:${slot.id}`,
      slot_id: slot.id,
      slot_label: slot.label,
      workshop_id: selectedWorkshopId,
      workshop: selectedWorkshop?.title ?? null,
      space: selectedWorkshop?.space_name ?? null,
      status,
      role_label: roleLabel,
      participant_count: null,
    }
  })
}

function buildExternalEntries(
  leader: ExternalLeader,
  context: PlanContext,
): WorkshopReportPersonPlanEntry[] {
  return context.slots.map((slot) => {
    const workshopId = context.leader_workshops.get(`${leader.id}:${slot.id}`)?.[0]
    const workshop = workshopId ? context.workshops.get(workshopId) : undefined
    const status: WorkshopReportPersonPlanStatus = workshop
      ? 'lead'
      : leader.availability.includes(slot.id)
        ? 'available'
        : 'unavailable'
    return {
      id: `${leader.id}:${slot.id}`,
      slot_id: slot.id,
      slot_label: slot.label,
      workshop_id: workshop?.id ?? null,
      workshop: workshop?.title ?? null,
      space: workshop?.space_name ?? null,
      status,
      role_label: workshop ? 'leitet' : status === 'available' ? 'verfügbar' : '',
      participant_count: workshop?.participant_count ?? null,
    }
  })
}

export function buildWorkshopReportsProjection(
  input: WorkshopReportsProjectionInput,
): WorkshopReportsProjection {
  const official = officialWorkshopsWorld(input.world)
  const scheduling = workshopSchedulingWorld(input.world)
  const spaces = workshopSpaceWorld(input.world).live
  const assignment = workshopAssignmentSection(input.plan)
  const placements = new Map(
    schedulingSection(input.plan).map((placement) => [placement.workshop_id, placement]),
  )
  const slots = reportSlots(scheduling.slots, input.time_zone)
  const slotById = new Map(slots.map((slot) => [slot.id, slot]))
  const spaceById = new Map(spaces.map((space) => [space.id, space]))
  const externalLeaders = official.external_leaders
  const personIds = new Set(input.world.persons.map((person) => person.id))
  const openReasons = new Map(
    assignment.unassigned.map((item) => [item.person_id, openReasonLabel(item.reason)]),
  )

  const placedWorkshops = official.workshops.flatMap((workshop) => {
    const placement = placements.get(workshop.id)
    const slot = placement ? slotById.get(placement.slot_id) : undefined
    const space = placement ? spaceById.get(placement.space_id) : undefined
    return placement && slot && space ? [{ workshop, slot, space }] : []
  })

  const leaderWorkshops = new Map<string, string[]>()
  for (const { workshop, slot } of placedWorkshops)
    for (const leaderId of workshop.leader_ids) {
      const key = `${leaderId}:${slot.id}`
      leaderWorkshops.set(key, [...(leaderWorkshops.get(key) ?? []), workshop.id])
    }

  const participation = new Map<string, Set<'assignment' | 'signup'>>()
  const addParticipation = (
    personId: string,
    workshopId: string,
    source: 'assignment' | 'signup',
  ) => {
    if (!personIds.has(personId)) return
    const key = participationKey(personId, workshopId)
    participation.set(key, (participation.get(key) ?? new Set()).add(source))
  }
  for (const item of assignment.assignments)
    addParticipation(item.person_id, item.workshop_id, 'assignment')
  for (const item of assignment.signups)
    addParticipation(item.person_id, item.workshop_id, 'signup')

  const workshopViews: WorkshopReportWorkshop[] = placedWorkshops
    .sort(
      (left, right) =>
        left.slot.sort_key - right.slot.sort_key ||
        left.workshop.title.localeCompare(right.workshop.title, 'de') ||
        left.workshop.id.localeCompare(right.workshop.id),
    )
    .map(({ workshop, slot, space }) => {
      const roster = [...participation.entries()]
        .filter(([key]) => key.endsWith(`:${workshop.id}`))
        .map(([key, sources]): WorkshopReportRosterEntry => {
          const personId = key.slice(0, key.length - workshop.id.length - 1)
          return {
            id: `${workshop.id}:${personId}`,
            person_id: personId,
            name: personName(input.world, personId),
            age_short: ageShort(input.world, personId),
            age_label: ageLabel(input.world, personId),
            health: healthNote(input.world, personId),
            source: sources.has('assignment') ? 'assignment' : 'signup',
          }
        })
        .sort(byName)
      return {
        id: workshop.id,
        title: workshop.title,
        audience: audienceLabel(workshop.audience),
        age_label: workshopAgeLabel(workshop),
        capacity: workshop.capacity,
        mode: workshop.mode,
        slot_id: slot.id,
        slot_label: slot.label,
        slot_long_label: slot.long_label,
        space_id: space.id,
        space_name: space.name,
        leaders: workshop.leader_ids.map((id) => leader(input.world, externalLeaders, id)),
        participant_count: roster.length,
        health_count: roster.filter((entry) => entry.health).length,
        roster,
      }
    })

  const context: PlanContext = {
    slots,
    workshops: new Map(workshopViews.map((workshop) => [workshop.id, workshop])),
    placements,
    assignment,
    leader_workshops: leaderWorkshops,
    open_reasons: openReasons,
  }
  const counted = new Set<WorkshopReportPersonPlanStatus>(['lead', 'fixed', 'assigned', 'signup'])
  const ledTitles = (entries: readonly WorkshopReportPersonPlanEntry[]) =>
    entries
      .filter((entry) => entry.status === 'lead' && entry.workshop)
      .map((entry) => entry.workshop as string)

  const personViews: WorkshopReportPerson[] = input.world.persons.map((person) => {
    const familyId = familyIdFor(input.world, person.id)
    const familyLabels = familyId ? (input.world.labels_by_entity[familyId] ?? []) : []
    const entries = buildPersonEntries(person.id, context)
    return {
      id: person.id,
      kind: 'person' as const,
      name: personName(input.world, person.id),
      age_label: ageLabel(input.world, person.id),
      family_id: familyId,
      family_name: familyId ? stringLabel(familyLabels, 'display-name') : null,
      workshop_count: entries.filter((entry) => counted.has(entry.status)).length,
      led_workshops: ledTitles(entries),
      open_reason: openReasons.get(person.id) ?? null,
      entries,
    }
  })
  const externalViews: WorkshopReportPerson[] = externalLeaders.map((external) => {
    const entries = buildExternalEntries(external, context)
    return {
      id: external.id,
      kind: 'external' as const,
      name: external.name,
      age_label: 'Externe Leitung',
      family_id: null,
      family_name: null,
      workshop_count: entries.filter((entry) => entry.status === 'lead').length,
      led_workshops: ledTitles(entries),
      open_reason: null,
      entries,
    }
  })
  const allPersons = [...personViews, ...externalViews].sort(byName)

  const personById = new Map(personViews.map((person) => [person.id, person]))
  const familyViews: WorkshopReportFamily[] = input.world.families
    .map((family) => {
      const memberIds = input.world.persons
        .filter((person) => familyIdFor(input.world, person.id) === family.id)
        .map((person) => person.id)
        .sort(
          (left, right) =>
            Number(isAdult(input.world, right)) - Number(isAdult(input.world, left)) ||
            (ageOf(input.world, right) ?? 0) - (ageOf(input.world, left) ?? 0) ||
            left.localeCompare(right),
        )
      return {
        id: family.id,
        name:
          stringLabel(input.world.labels_by_entity[family.id] ?? [], 'display-name') ?? family.id,
        members: memberIds.map((id) => ({
          id,
          name: personName(input.world, id),
          first_name: firstName(input.world, id),
          age_label: ageLabel(input.world, id),
          open: openReasons.has(id),
        })),
        slots: slots.map((slot) => ({
          id: `${family.id}:${slot.id}`,
          label: slot.label,
          cells: memberIds.map((id) => {
            const entry = personById.get(id)?.entries.find((item) => item.slot_id === slot.id)
            return {
              member_id: id,
              workshop: entry?.workshop ?? null,
              space: entry?.space ?? null,
              lead: entry?.status === 'lead',
              open: entry?.status === 'open',
            }
          }),
        })),
      }
    })
    .sort(byName)

  const roomViews: WorkshopReportRoom[] = spaces
    .slice()
    .sort((left, right) => left.sort_key - right.sort_key || left.id.localeCompare(right.id))
    .map((space) => {
      const hosted = workshopViews.filter((workshop) => workshop.space_id === space.id)
      return {
        id: space.id,
        name: space.name,
        workshop_count: hosted.length,
        entries: slots.map((slot) => {
          const workshop = hosted.find((item) => item.slot_id === slot.id)
          return {
            id: `${space.id}:${slot.id}`,
            slot_id: slot.id,
            time: slot.label,
            workshop_id: workshop?.id ?? null,
            workshop: workshop?.title ?? null,
            audience: workshop ? `${workshop.audience}, ${workshop.age_label}` : null,
            leaders: workshop?.leaders ?? [],
          }
        }),
      }
    })

  return {
    slots,
    workshops: workshopViews,
    persons: allPersons,
    families: familyViews,
    rooms: roomViews,
  }
}

function schedulingSection(plan: Plan): readonly WorkshopPlacement[] {
  // Placements are solver output, not part of the world summary. Keeping this
  // extraction local makes the report projection tolerate profiles that omit
  // workshop scheduling without inventing a second relationship store.
  const section = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection | undefined
  return section?.placements ?? []
}
