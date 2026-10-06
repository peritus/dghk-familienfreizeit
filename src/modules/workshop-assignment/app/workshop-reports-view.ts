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

export type WorkshopReportContext = 'current' | 'prospective'

export type WorkshopReportSlot = {
  id: string
  label: string
  starts_at: string
  ends_at: string
  sort_key: number
}

export type WorkshopReportRosterEntry = {
  id: string
  person_id: string
  name: string
  age_label: string
  health?: string
  emergency_contact?: string
  source: 'assignment' | 'signup'
}

export type WorkshopReportWorkshop = {
  id: string
  title: string
  audience: string
  age_label: string
  capacity: number
  mode: WorkshopRecord['mode']
  status: 'placed' | 'unplaced' | 'cancelled'
  status_label: string
  slot_id: string | null
  slot_label: string | null
  space_id: string | null
  space_name: string | null
  leaders: readonly string[]
  participant_count: number
  interest_count: number
  roster: readonly WorkshopReportRosterEntry[]
}

export type WorkshopReportPersonPlanEntry = {
  id: string
  slot_id: string
  slot_label: string
  workshop_id: string | null
  workshop: string | null
  space: string | null
  status: 'free' | 'assigned' | 'lead' | 'signup' | 'interest'
  role_label: string
}

export type WorkshopReportPerson = {
  id: string
  name: string
  age_label: string
  family_id: string | null
  family_name: string | null
  entries: readonly WorkshopReportPersonPlanEntry[]
}

export type WorkshopReportFamilyMember = {
  id: string
  name: string
  age_label: string
}

export type WorkshopReportFamilySlot = {
  id: string
  label: string
  members: readonly { id: string; name: string; value: string }[]
}

export type WorkshopReportFamily = {
  id: string
  name: string
  email: string | null
  members: readonly WorkshopReportFamilyMember[]
  slots: readonly WorkshopReportFamilySlot[]
}

export type WorkshopReportRoomEntry = {
  id: string
  slot_id: string
  time: string
  workshop_id: string
  workshop: string
  audience: string
  leaders: string
}

export type WorkshopReportRoom = {
  id: string
  name: string
  location: string
  capacity: number
  entries: readonly WorkshopReportRoomEntry[]
}

export type WorkshopReportsProjection = {
  context: WorkshopReportContext
  slots: readonly WorkshopReportSlot[]
  workshops: readonly WorkshopReportWorkshop[]
  persons: readonly WorkshopReportPerson[]
  families: readonly WorkshopReportFamily[]
  rooms: readonly WorkshopReportRoom[]
  summary: {
    workshop_count: number
    placed_workshop_count: number
    participant_count: number
    family_count: number
    person_count: number
    room_count: number
  }
}

export type WorkshopReportsProjectionInput = {
  world: World
  plan: Plan
  context: WorkshopReportContext
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

function ageLabel(world: World, personId: string): string {
  const labels = world.labels_by_entity[personId] ?? []
  const age = numberLabel(labels, 'age')
  const role = stringLabel(labels, 'role')
  return age === null ? (role === 'adult' ? 'erwachsen' : 'Kind') : `${age} Jahre`
}

function labelValue(world: World, entityId: string, keys: readonly string[]): string | null {
  const labels = world.labels_by_entity[entityId] ?? []
  for (const key of keys) {
    const value = stringLabel(labels, key)
    if (value) return value
  }
  return null
}

function dateLabel(value: string, timeZone: string): string {
  return new globalThis.Date(value).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    ['timeZone']: timeZone,
  })
}

function timeLabel(startsAt: string, endsAt: string, timeZone: string): string {
  const starts = new globalThis.Date(startsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    ['timeZone']: timeZone,
  })
  const ends = new globalThis.Date(endsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    ['timeZone']: timeZone,
  })
  return `${starts}–${ends}`
}

function slotLabel(slot: WorkshopSlot, timeZone: string): string {
  return `${dateLabel(slot.starts_at, timeZone)} · ${timeLabel(slot.starts_at, slot.ends_at, timeZone)}`
}

function audienceLabel(value: string): string {
  return { children: 'Kinder', adults: 'Erwachsene', all: 'Alle' }[value] ?? value
}

function leaderName(world: World, externalLeaders: readonly ExternalLeader[], id: string): string {
  if (world.entity_kind_by_id[id] === 'person') return personName(world, id)
  return externalLeaders.find((leader) => leader.id === id)?.name ?? id
}

function sortById<T extends { id: string }>(items: readonly T[]): T[] {
  return items.slice().sort((left, right) => left.id.localeCompare(right.id))
}

function reportSlots(slots: readonly WorkshopSlot[], timeZone: string): WorkshopReportSlot[] {
  return slots
    .slice()
    .sort((left, right) => left.sort_key - right.sort_key || left.id.localeCompare(right.id))
    .map((slot) => ({
      id: slot.id,
      label: slotLabel(slot, timeZone),
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      sort_key: slot.sort_key,
    }))
}

function familyIdFor(world: World, personId: string): string | null {
  const value = world.labels_by_entity[personId]?.find((label) => label.key === 'member-of')?.value
  return typeof value === 'string' ? value : null
}

function placementMaps(placements: readonly WorkshopPlacement[]) {
  return new Map(placements.map((placement) => [placement.workshop_id, placement]))
}

function participationKey(personId: string, workshopId: string): string {
  return `${personId}:${workshopId}`
}

function buildPersonEntries(
  personId: string,
  slots: readonly WorkshopReportSlot[],
  workshops: ReadonlyMap<string, WorkshopReportWorkshop>,
  placements: ReadonlyMap<string, WorkshopPlacement>,
  assignments: WorkshopAssignmentSection['assignments'],
  signups: WorkshopAssignmentSection['signups'],
  interests: WorkshopAssignmentSection['interests'],
  leaderWorkshops: ReadonlyMap<string, readonly string[]>,
): WorkshopReportPersonPlanEntry[] {
  const assignmentBySlot = new Map(
    assignments.filter((item) => item.person_id === personId).map((item) => [item.slot_id, item]),
  )
  const signupIds = new Set(
    signups.filter((item) => item.person_id === personId).map((item) => item.workshop_id),
  )
  const interestIds = new Set(
    interests.filter((item) => item.person_id === personId).map((item) => item.workshop_id),
  )
  return slots.map((slot) => {
    const ledWorkshopId = leaderWorkshops.get(`${personId}:${slot.id}`)?.[0]
    const assignment = assignmentBySlot.get(slot.id)
    const workshopId = ledWorkshopId ?? assignment?.workshop_id ?? null
    const signup = !workshopId
      ? [...signupIds].find((id) => placements.get(id)?.slot_id === slot.id)
      : undefined
    const interest =
      !workshopId && !signup
        ? [...interestIds].find((id) => placements.get(id)?.slot_id === slot.id)
        : undefined
    const selectedWorkshopId = workshopId ?? signup ?? interest ?? null
    const selectedWorkshop = selectedWorkshopId ? workshops.get(selectedWorkshopId) : undefined
    const status: WorkshopReportPersonPlanEntry['status'] = ledWorkshopId
      ? 'lead'
      : assignment
        ? 'assigned'
        : signup
          ? 'signup'
          : interest
            ? 'interest'
            : 'free'
    const roleLabel = ledWorkshopId
      ? 'leitet'
      : assignment?.rank
        ? `nimmt teil (${assignment.rank}. Wahl)`
        : assignment
          ? 'nimmt teil'
          : signup
            ? 'Anmeldung'
            : interest
              ? 'Interesse'
              : 'frei'
    return {
      id: `${personId}:${slot.id}`,
      slot_id: slot.id,
      slot_label: slot.label,
      workshop_id: selectedWorkshopId,
      workshop: selectedWorkshop?.title ?? null,
      space: selectedWorkshop?.space_name ?? null,
      status,
      role_label: roleLabel,
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
  const allWorkshops = [...official.workshops, ...official.cancelled]
  const placements = placementMaps(schedulingSection(input.plan))
  const slots = reportSlots(scheduling.slots, input.time_zone)
  const slotById = new Map(slots.map((slot) => [slot.id, slot]))
  const spaceById = new Map(spaces.map((space) => [space.id, space]))
  const externalLeaders = official.external_leaders
  const personIds = new Set(input.world.persons.map((person) => person.id))

  const leaderWorkshops = new Map<string, string[]>()
  for (const workshop of allWorkshops) {
    const placement = placements.get(workshop.id)
    if (!placement) continue
    for (const leaderId of workshop.leader_ids) {
      const key = `${leaderId}:${placement.slot_id}`
      const values = leaderWorkshops.get(key) ?? []
      values.push(workshop.id)
      leaderWorkshops.set(key, values)
    }
  }

  const participation = new Map<string, Set<'assignment' | 'signup'>>()
  for (const item of assignment.assignments) {
    if (!personIds.has(item.person_id)) continue
    const key = participationKey(item.person_id, item.workshop_id)
    const values = participation.get(key) ?? new Set()
    values.add('assignment')
    participation.set(key, values)
  }
  for (const item of assignment.signups) {
    if (!personIds.has(item.person_id)) continue
    const key = participationKey(item.person_id, item.workshop_id)
    const values = participation.get(key) ?? new Set()
    values.add('signup')
    participation.set(key, values)
  }

  const workshopViews: WorkshopReportWorkshop[] = allWorkshops
    .slice()
    .sort((left, right) => left.sort_key - right.sort_key || left.id.localeCompare(right.id))
    .map((workshop) => {
      const placement = placements.get(workshop.id)
      const slot = placement ? slotById.get(placement.slot_id) : undefined
      const space = placement ? spaceById.get(placement.space_id) : undefined
      const roster = sortById(
        [...participation.entries()]
          .filter(([key]) => key.endsWith(`:${workshop.id}`))
          .map(([key, sources]) => {
            const personId = key.slice(0, key.length - workshop.id.length - 1)
            const source = sources.has('assignment') ? 'assignment' : 'signup'
            return {
              id: `${workshop.id}:${personId}`,
              person_id: personId,
              name: personName(input.world, personId),
              age_label: ageLabel(input.world, personId),
              health:
                labelValue(input.world, personId, ['health', 'health-note', 'allergy']) ??
                undefined,
              emergency_contact:
                labelValue(input.world, personId, [
                  'emergency-contact',
                  'emergency-contact-name',
                  'contact',
                ]) ?? undefined,
              source,
            } satisfies WorkshopReportRosterEntry
          }),
      )
      const interestCount = assignment.interests.filter(
        (item) => item.workshop_id === workshop.id,
      ).length
      const status: WorkshopReportWorkshop['status'] = workshop.cancelled
        ? 'cancelled'
        : placement
          ? 'placed'
          : 'unplaced'
      return {
        id: workshop.id,
        title: workshop.title,
        audience: audienceLabel(workshop.audience),
        age_label: `${workshop.age_min}–${workshop.age_max} Jahre`,
        capacity: workshop.capacity,
        mode: workshop.mode,
        status,
        status_label:
          status === 'cancelled'
            ? 'abgesagt'
            : status === 'placed'
              ? 'platziert'
              : 'nicht eingeplant',
        slot_id: placement?.slot_id ?? null,
        slot_label: slot?.label ?? null,
        space_id: placement?.space_id ?? null,
        space_name: space?.name ?? null,
        leaders: workshop.leader_ids.map((id) => leaderName(input.world, externalLeaders, id)),
        participant_count: roster.length,
        interest_count: interestCount,
        roster,
      }
    })

  const workshopById = new Map(workshopViews.map((workshop) => [workshop.id, workshop]))
  const personViews: WorkshopReportPerson[] = input.world.persons
    .map((person) => {
      const familyId = familyIdFor(input.world, person.id)
      const familyLabels = familyId ? (input.world.labels_by_entity[familyId] ?? []) : []
      return {
        id: person.id,
        name: personName(input.world, person.id),
        age_label: ageLabel(input.world, person.id),
        family_id: familyId,
        family_name: familyId ? stringLabel(familyLabels, 'display-name') : null,
        entries: buildPersonEntries(
          person.id,
          slots,
          workshopById,
          placements,
          assignment.assignments,
          assignment.signups,
          assignment.interests,
          leaderWorkshops,
        ),
      }
    })
    .sort(
      (left, right) => left.name.localeCompare(right.name, 'de') || left.id.localeCompare(right.id),
    )

  const personById = new Map(personViews.map((person) => [person.id, person]))
  const familyViews: WorkshopReportFamily[] = input.world.families
    .map((family) => {
      const labels = input.world.labels_by_entity[family.id] ?? []
      const members = personViews
        .filter((person) => person.family_id === family.id)
        .map(({ id, name, age_label: ageLabel }) => ({ id, name, age_label: ageLabel }))
      return {
        id: family.id,
        name: stringLabel(labels, 'display-name') ?? family.id,
        email: stringLabel(labels, 'email'),
        members,
        slots: slots.map((slot) => ({
          id: `${family.id}:${slot.id}`,
          label: slot.label,
          members: members.map((member) => {
            const entry = personById
              .get(member.id)
              ?.entries.find((item) => item.slot_id === slot.id)
            const value = entry?.workshop
              ? `${entry.status === 'lead' ? 'leitet ' : ''}${entry.workshop}${
                  entry.status === 'signup'
                    ? ' (Anmeldung)'
                    : entry.status === 'interest'
                      ? ' (Interesse)'
                      : ''
                }`
              : 'frei'
            return { id: member.id, name: member.name, value }
          }),
        })),
      }
    })
    .sort(
      (left, right) => left.name.localeCompare(right.name, 'de') || left.id.localeCompare(right.id),
    )

  const roomViews: WorkshopReportRoom[] = spaces
    .slice()
    .sort((left, right) => left.sort_key - right.sort_key || left.id.localeCompare(right.id))
    .map((space) => ({
      id: space.id,
      name: space.name,
      location: space.location_description,
      capacity: space.capacity,
      entries: workshopViews
        .filter((workshop) => workshop.space_id === space.id && workshop.slot_id)
        .map((workshop) => ({
          id: `${space.id}:${workshop.id}`,
          slot_id: workshop.slot_id as string,
          time: workshop.slot_label ?? '—',
          workshop_id: workshop.id,
          workshop: workshop.title,
          audience: `${workshop.audience}, ${workshop.age_label}`,
          leaders: workshop.leaders.join(', '),
        })),
    }))

  const participantCount = workshopViews.reduce(
    (count, workshop) => count + workshop.participant_count,
    0,
  )
  return {
    context: input.context,
    slots,
    workshops: workshopViews,
    persons: personViews,
    families: familyViews,
    rooms: roomViews,
    summary: {
      workshop_count: workshopViews.length,
      placed_workshop_count: workshopViews.filter((workshop) => workshop.status === 'placed')
        .length,
      participant_count: participantCount,
      family_count: familyViews.length,
      person_count: personViews.length,
      room_count: roomViews.length,
    },
  }
}

function schedulingSection(plan: Plan): readonly WorkshopPlacement[] {
  // Placements are solver output, not part of the world summary. Keeping this
  // extraction local makes the report projection tolerate profiles that omit
  // workshop scheduling without inventing a second relationship store.
  const section = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection | undefined
  return section?.placements ?? []
}
