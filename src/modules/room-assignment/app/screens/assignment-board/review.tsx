import { activeProfile } from '../../../../../config/index.js'
import type { World } from '../../../../../events/fold.js'
import { inventoryWorld } from '../../../../../modules/room-inventory/index.js'
import type {
  RoomAssignment,
  RoomAssignmentSection,
} from '../../../../../modules/room-assignment/index.js'
import type { Plan } from '../../../../../solver/types.js'
import type { AttentionResult } from '../../../../../attention/types.js'
import { selectAttention } from '../../../../../attention/selectors.js'
import type {
  AssignmentPrintView,
  BoardView,
  FamilyView,
  FindingView,
  RequirementView,
  RoomView,
} from './types.js'

export type AssignmentReview = {
  board: BoardView
  print: AssignmentPrintView
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

function labelValue(world: World, entityId: string, key: string): unknown {
  return world.labels_by_entity[entityId]?.find((label) => label.key === key)?.value
}

function familyName(world: World, familyId: string): string {
  return String(labelValue(world, familyId, 'display-name') ?? 'Unbekannte Familie')
}

function familyPeople(world: World, familyId: string): FamilyView['people'] {
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

function requirementLabel(requirement: World['requirements'][number]): {
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

function relationFamilyId(world: World, target: string): string {
  return typeof labelValue(world, target, 'member-of') === 'string'
    ? String(labelValue(world, target, 'member-of'))
    : target
}

function requirements(
  world: World,
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
    const key = `${label.key}:${requirement.value ?? ''}:${requirement.strength}`
    if (seen.has(key)) return []
    seen.add(key)
    const met = room
      ? requirement.kind === 'structural' && requirement.structural === 'no-other-families'
        ? roomFamilyIds.every((id) => id === familyId)
        : requirement.kind === 'relation'
          ? !requirement.value ||
            !roomFamilyIds.includes(relationFamilyId(world, requirement.value))
          : requirement.capability_key
            ? room.amenity_keys.includes(requirement.capability_key)
            : true
      : undefined
    return [
      {
        key,
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

function roomLabel(world: World, roomId: string): string {
  const number = labelValue(world, roomId, 'number')
  return typeof number === 'string' ? `Zimmer ${number}` : 'Unbekanntes Zimmer'
}

function familyBedDemand(world: World, familyId: string): number {
  return familyPeople(world, familyId).filter(
    (person) => labelValue(world, person.id, 'does-not-need-a-bed') !== true,
  ).length
}

function familyView(
  world: World,
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
  world: World,
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
    const amenityKeys = room.capabilities.filter((key) => !/^fam_.+_room$/.test(key))
    const amenities = amenityKeys.map((key) => {
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
      amenities,
      amenity_keys: amenityKeys,
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

function findingViews(world: World, attention: AttentionResult): readonly FindingView[] {
 return selectAttention(attention,{area:'accommodation'}).filter(item=>item.kind==='problem'||item.kind==='review').map(item=>({id:item.id,severity:item.severity==='error'?'error':'warning',title:item.wording.title,description:[item.wording.detail,...item.wording.reasons].join(' · '),subjects:item.subjects.map(subject=>familyName(world,subject.id))}))
}

export function deriveAssignmentReview(
  world: World,
  plan: Plan,
  attention: AttentionResult,
  generatedAt = 'Im Browser erzeugt',
): AssignmentReview {
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
  const noMatchIds=new Set(selectAttention(attention,{area:'accommodation'}).filter(i=>i.code==='room-assignment.required-contradiction').flatMap(i=>i.subjects.map(s=>s.id)))
  const withoutMatch = section.unplaced
    .filter(({ family_id }) => noMatchIds.has(family_id))
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
                  ? room.amenity_keys.includes(requirement.capability_key)
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
    notes: room.amenities,
  }))
  const placedFamilies = new Set(section.assignments.map(({ family_id: id }) => id))
  const print: AssignmentPrintView = {
    generated_at: generatedAt,
    data_cut: `Ereignis ${world.head_seq}`,
    audience: 'Organisationsteam',
    sensitivity: 'Nur Organisationsteam',
    total_families: world.families.length,
    placed_families: placedFamilies.size,
    unplaced_families: section.unplaced.length,
    rooms: reportRooms,
    unplaced: section.unplaced.map(({ family_id: id, person_ids: people }) => ({
      family: familyName(world, id),
      people: `${people.length} ${people.length === 1 ? 'Person' : 'Personen'}`,
      reason: selectAttention(attention,{area:'accommodation',subject_id:id}).map(i=>[i.wording.detail,...i.wording.reasons].join(' · ')).join(' · '),
    })),
    findings: findingViews(world, attention),
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
        section.unplaced.map(({ family_id: familyId }) => [familyId, selectAttention(attention,{area:'accommodation',subject_id:familyId}).map(i=>[i.wording.detail,...i.wording.reasons].join(' · ')).join(' · ')]),
      ),
    },
    print,
  }
}
