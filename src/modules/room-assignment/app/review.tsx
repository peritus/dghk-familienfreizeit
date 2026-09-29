import { activeProfile } from '../../../config/index.js'
import { buildRevision, compatibilityRevision } from '../../../config/build.js'
import type { KernelWorld } from '../../../events/fold.js'
import { inventoryWorld } from '../../../modules/room-inventory/index.js'
import type {
  RoomAssignment,
  RoomAssignmentSection,
} from '../../../modules/room-assignment/index.js'
import { buildSolverInput, solve } from '../../../solver/index.js'
import { composeSolverContributions } from '../../../solver/index.js'
import type { Plan } from '../../../solver/types.js'
import type { SolverContributions } from '../../../solver/types.js'
import type {
  AssignmentReportView,
  BoardView,
  FamilyView,
  FindingView,
  RequirementView,
  RoomView,
} from './types.js'

export type AssignmentReview = {
  board: BoardView
  report: AssignmentReportView
}

const floorLabels: Readonly<Record<string, string>> = {
  ground: 'Erdgeschoss',
  first: '1. Obergeschoss',
  second: '2. Obergeschoss',
  attic: 'Dachgeschoss',
}

function localized(value: string | Readonly<Record<string, string>> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[activeProfile.meta.locale] ?? value[activeProfile.meta.fallback_locale] ?? ''
}

function contributions(): SolverContributions {
  return composeSolverContributions(activeProfile)
}

function labelValue(world: KernelWorld, entityId: string, key: string): unknown {
  return world.labels_by_entity[entityId]?.find((label) => label.key === key)?.value
}

function familyName(world: KernelWorld, familyId: string): string {
  return String(labelValue(world, familyId, 'display-name') ?? 'Unbekannte Familie')
}

function familyPeople(world: KernelWorld, familyId: string): FamilyView['people'] {
  return world.persons
    .filter((person) => labelValue(world, person.id, 'member-of') === familyId)
    .map((person) => ({
      id: person.id,
      name:
        [labelValue(world, person.id, 'given-name'), labelValue(world, person.id, 'family-name')]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .join(' ') || 'Unbekannte Person',
      role: (labelValue(world, person.id, 'role') === 'child' ? 'child' : 'adult') as
        | 'adult'
        | 'child',
    }))
}

function requirementLabel(requirement: KernelWorld['requirements'][number]): {
  key: string
  label: string
} {
  const trait = activeProfile.traits[requirement.trait_key as keyof typeof activeProfile.traits]
  const valueTrait = requirement.capability_key
    ? activeProfile.traits[requirement.capability_key as keyof typeof activeProfile.traits]
    : undefined
  return {
    key: `${requirement.trait_key}:${requirement.capability_key ?? requirement.structural ?? ''}`,
    label:
      localized(valueTrait?.title) ||
      localized(trait?.title) ||
      (requirement.structural === 'no-other-families' ? 'Zimmer nicht teilen' : 'Anforderung'),
  }
}

function relationFamilyId(world: KernelWorld, target: string): string {
  return typeof labelValue(world, target, 'member-of') === 'string'
    ? String(labelValue(world, target, 'member-of'))
    : target
}

function requirements(
  world: KernelWorld,
  familyId: string,
  room?: RoomView,
  roomFamilyIds: readonly string[] = [],
): readonly RequirementView[] {
  const personIds = new Set(
    world.persons
      .filter((person) => labelValue(world, person.id, 'member-of') === familyId)
      .map(({ id }) => id),
  )
  const requirements = world.requirements
    .filter(({ holder_id: holderId }) => holderId === familyId || personIds.has(holderId))
    .filter(({ value }) => value !== `${familyId}_room`)
  const seen = new Set<string>()
  return requirements.flatMap((requirement) => {
    if (requirement.strength !== 'required' && requirement.strength !== 'preferred') return []
    const label = requirementLabel(requirement)
    const key = `${label.key}:${requirement.strength}`
    if (seen.has(key)) return []
    seen.add(key)
    const met = room
      ? requirement.kind === 'structural' && requirement.structural === 'no-other-families'
        ? roomFamilyIds.every((id) => id === familyId)
        : requirement.kind === 'relation'
          ? !requirement.value ||
            !roomFamilyIds.includes(relationFamilyId(world, requirement.value))
          : requirement.capability_key
            ? room.feature_keys.includes(requirement.capability_key)
            : true
      : undefined
    return [
      {
        key: label.key,
        label: label.label,
        strength: requirement.strength,
        capability_key: requirement.capability_key,
        value: requirement.value,
        kind: requirement.kind,
        structural: requirement.structural,
        met,
      },
    ]
  })
}

function roomLabel(world: KernelWorld, roomId: string): string {
  const number = labelValue(world, roomId, 'number')
  return typeof number === 'string' ? `Zimmer ${number}` : 'Unbekanntes Zimmer'
}

function familyBedDemand(world: KernelWorld, familyId: string): number {
  return familyPeople(world, familyId).filter(
    (person) => labelValue(world, person.id, 'does-not-need-a-bed') !== true,
  ).length
}

function familyView(
  world: KernelWorld,
  familyId: string,
  status: 'placed' | 'unplaced',
  room: RoomView | undefined,
  roomFamilyIds: readonly string[],
  fixedRoomName: string | undefined,
  fixed: boolean,
  fixedInvalid: boolean,
): FamilyView {
  return {
    id: familyId,
    name: familyName(world, familyId),
    people: familyPeople(world, familyId),
    bed_demand: familyBedDemand(world, familyId),
    requirements: requirements(world, familyId, room, roomFamilyIds),
    status: {
      label: status === 'placed' ? 'Platziert' : 'Nicht platziert',
      tone: status === 'placed' ? 'success' : 'danger',
    },
    room_id: room?.id,
    fixed,
    fixed_room_name: fixedRoomName,
    fixed_invalid: fixedInvalid,
  }
}

function roomViews(
  world: KernelWorld,
  assignments: readonly RoomAssignment[],
  section: RoomAssignmentSection,
): readonly RoomView[] {
  const inventory = inventoryWorld(world)
  const buildings = new Map(inventory.buildings.map((building) => [building.id, building.name]))
  const assignmentsByRoom = new Map<string, RoomAssignment[]>()
  for (const assignment of assignments) {
    const current = assignmentsByRoom.get(assignment.room_id) ?? []
    current.push(assignment)
    assignmentsByRoom.set(assignment.room_id, current)
  }
  const fixed = section.fixed ?? []
  const fixedByFamily = new Map(fixed.map((item) => [item.family_id, item.room_id]))
  const invalidFixed = new Set(
    (section.fixed_violations ?? []).map(({ family_id: familyId }) => familyId),
  )
  return inventory.rooms.map((room) => {
    const roomAssignments = assignmentsByRoom.get(room.id) ?? []
    const familyIds = [...new Set(roomAssignments.map(({ family_id: familyId }) => familyId))]
    const occupied = roomAssignments.filter(({ place_id: placeId }) => placeId !== null).length
    const free = room.place_count - occupied
    const featureKeys = room.capabilities.filter((key) => !/^fam_.+_room$/.test(key))
    const features = featureKeys.map((key) => {
      const trait = activeProfile.traits[key as keyof typeof activeProfile.traits]
      return localized(trait?.title) || 'Besonderes Merkmal'
    })
    const beds = inventory.beds
      .filter(({ room_id: roomId }) => roomId === room.id)
      .reduce<RoomView['beds'][number][]>((all, bed) => {
        const current = all.find(({ bed_type: bedType }) => bedType === bed.bed_type)
        if (current) {
          current.count += 1
          current.sleeps += bed.sleeps
        } else all.push({ bed_type: bed.bed_type, count: 1, sleeps: bed.sleeps })
        return all
      }, [])
    const view: RoomView = {
      id: room.id,
      name: roomLabel(world, room.id),
      building: buildings.get(room.building_id) ?? 'Unbekanntes Gebäude',
      floor: room.floor ? (floorLabels[room.floor] ?? room.floor) : 'Ohne Etage',
      capacity: room.place_count,
      occupied,
      free,
      occupants: [],
      features,
      feature_keys: featureKeys,
      beds,
      fixed_family_ids: familyIds.filter((id) => fixedByFamily.get(id) === room.id),
      fixed_invalid_family_ids: familyIds.filter((id) => invalidFixed.has(id)),
      fit_hints: [],
    }
    view.occupants = familyIds.map((id) =>
      familyView(
        world,
        id,
        'placed',
        view,
        familyIds,
        fixedByFamily.get(id) === room.id ? roomLabel(world, room.id) : undefined,
        fixedByFamily.get(id) === room.id,
        invalidFixed.has(id),
      ),
    )
    return view
  })
}

function reasonLabel(reason: string): string {
  if (reason.includes('hard.capacity')) return 'Nicht genügend freie Schlafplätze.'
  if (reason.includes('hard.trait-requirements'))
    return 'Kein verfügbares Zimmer erfüllt alle erforderlichen Merkmale.'
  if (reason.includes('hard.resolver-decisions'))
    return 'Die Raumkonfiguration schließt das Zimmer aus.'
  if (reason.includes('hard.keep-apart'))
    return 'Die Belegungsregeln verhindern die gemeinsame Unterbringung.'
  return 'Kein passendes Zimmer gefunden.'
}

function subjectLabel(world: KernelWorld, subject: string): string {
  if (world.families.some(({ id }) => id === subject)) return familyName(world, subject)
  if (inventoryWorld(world).rooms.some(({ id }) => id === subject)) return roomLabel(world, subject)
  const trait = activeProfile.traits[subject as keyof typeof activeProfile.traits]
  return localized(trait?.title) || 'Konfigurationsmerkmal'
}

function findingViews(world: KernelWorld, plan: ReturnType<typeof solve>): readonly FindingView[] {
  return plan.preflight.map((finding, index) => ({
    id: `${finding.check}-${finding.subjects.join('-')}-${index}`,
    severity: finding.severity === 'error' ? ('error' as const) : ('warning' as const),
    title:
      finding.check === 'room-assignment.unplaced-family'
        ? 'Familie ohne Zimmer'
        : finding.check === 'room-assignment.fixed-invalid'
          ? 'Ungültige feste Zuordnung'
          : 'Belegungsprüfung',
    description: reasonLabel(finding.text),
    subjects: finding.subjects.map((subject) => subjectLabel(world, subject)),
  }))
}

export function deriveAssignmentReview(
  world: KernelWorld,
  previousPlan: Plan | null = null,
  generatedAt = 'Im Browser erzeugt',
): AssignmentReview {
  const solverContributions = contributions()
  const input = buildSolverInput(world, solverContributions, previousPlan)
  const plan = solve(input, solverContributions, {
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
  const section = plan.sections['room-assignment'] as RoomAssignmentSection | undefined
  if (!section) throw new Error('room-assignment solver output is unavailable')

  const rooms = roomViews(world, section.assignments, section)
  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const assignmentRoomByFamily = new Map(
    section.assignments.map(({ family_id: familyId, room_id: roomId }) => [familyId, roomId]),
  )
  const fixedRoomByFamily = new Map(
    (section.fixed ?? []).map(({ family_id: familyId, room_id: roomId }) => [familyId, roomId]),
  )
  const invalidFixed = new Set(
    (section.fixed_violations ?? []).map(({ family_id: familyId }) => familyId),
  )
  const familyFor = (familyId: string, status: 'placed' | 'unplaced') => {
    const roomId = assignmentRoomByFamily.get(familyId)
    const room = roomId ? roomById.get(roomId) : undefined
    const familyRoomIds = room ? room.occupants.map(({ id }) => id) : roomId ? [] : []
    return familyView(
      world,
      familyId,
      status,
      room,
      familyRoomIds,
      fixedRoomByFamily.has(familyId)
        ? roomById.get(fixedRoomByFamily.get(familyId)!)?.name
        : undefined,
      fixedRoomByFamily.has(familyId),
      invalidFixed.has(familyId),
    )
  }
  const unplaced = section.unplaced.map(({ family_id: familyId }) =>
    familyFor(familyId, 'unplaced'),
  )
  const withoutMatch = section.unplaced
    .filter(({ reason }) => /hard\.(trait-requirements|resolver-decisions|keep-apart)/.test(reason))
    .map(({ family_id: familyId }) => familyFor(familyId, 'unplaced'))
  for (const room of rooms) {
    room.fit_hints = unplaced
      .filter((family) => room.free >= family.bed_demand)
      .map((family) => ({
        ...family,
        requirements: family.requirements.map((requirement) => ({
          ...requirement,
          met:
            requirement.kind === 'structural' && requirement.structural === 'no-other-families'
              ? room.occupants.length === 0
              : requirement.kind === 'relation'
                ? !requirement.value ||
                  !room.occupants.some(
                    ({ id }) => id === relationFamilyId(world, requirement.value!),
                  )
                : requirement.capability_key
                  ? room.feature_keys.includes(requirement.capability_key)
                  : true,
        })),
      }))
  }
  const buildings = [...new Map(rooms.map((room) => [room.building, room])).keys()].map((name) => {
    const buildingRooms = rooms.filter((room) => room.building === name)
    const occupants = buildingRooms.flatMap(({ occupants: families }) => families)
    return {
      id: name,
      name,
      rooms: buildingRooms,
      family_count: new Set(occupants.map(({ id }) => id)).size,
      requirement_issues: occupants.reduce(
        (count, family) =>
          count +
          family.requirements.filter(
            ({ strength, met }) => strength === 'required' && met === false,
          ).length,
        0,
      ),
      wish_issues: occupants.reduce(
        (count, family) =>
          count +
          family.requirements.filter(
            ({ strength, met }) => strength === 'preferred' && met === false,
          ).length,
        0,
      ),
    }
  })
  const freeRooms = rooms.filter(({ occupied, free }) => occupied === 0 && free > 0)
  const partialRooms = rooms.filter(({ occupied, free }) => occupied > 0 && free > 0)
  const fixedCount = fixedRoomByFamily.size
  const freePlaces = rooms.reduce((total, room) => total + Math.max(0, room.free), 0)
  const reportRooms = rooms.map((room) => ({
    room: room.name,
    building: `${room.building} · ${room.floor}`,
    occupants:
      room.occupants.length > 0 ? room.occupants.map(({ name }) => name).join(', ') : 'Leer',
    capacity: `${Math.max(0, room.occupied)} / ${room.capacity} Schlafplätze`,
    status: {
      label:
        room.free < 0
          ? `${Math.abs(room.free)} Platz zu wenig`
          : room.free === 0
            ? 'Voll'
            : room.occupied > 0
              ? 'Belegt'
              : 'Frei',
      tone:
        room.free < 0
          ? ('danger' as const)
          : room.free === 0
            ? ('attention' as const)
            : room.occupied > 0
              ? ('success' as const)
              : ('neutral' as const),
    },
    notes: room.features,
  }))
  const placedFamilies = new Set(section.assignments.map(({ family_id: id }) => id))
  const report: AssignmentReportView = {
    generated_at: generatedAt,
    data_cut: `Ereignis ${world.head_seq}`,
    audience: 'Organisationsteam',
    sensitivity: 'Nur Organisationsteam',
    total_families: world.families.length,
    placed_families: placedFamilies.size,
    unplaced_families: section.unplaced.length,
    rooms: reportRooms,
    unplaced: section.unplaced.map(({ family_id: id, person_ids: people, reason }) => ({
      family: familyName(world, id),
      people: `${people.length} ${people.length === 1 ? 'Person' : 'Personen'}`,
      reason: reasonLabel(reason),
    })),
    findings: findingViews(world, plan),
  }
  return {
    board: {
      stats: {
        families: world.families.length,
        without_room: unplaced.length,
        without_match: withoutMatch.length,
        fixed: fixedCount,
        free_places: freePlaces,
      },
      buildings,
      unplaced,
      without_match: withoutMatch,
      free_rooms: freeRooms,
      partial_rooms: partialRooms,
      unplaced_reasons: Object.fromEntries(
        section.unplaced.map(({ family_id: familyId, reason }) => [familyId, reasonLabel(reason)]),
      ),
    },
    report,
  }
}
