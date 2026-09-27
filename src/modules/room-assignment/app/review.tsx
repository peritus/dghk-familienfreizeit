import { activeProfile } from '../../../config/index.js'
import type { KernelWorld } from '../../../events/fold.js'
import { inventoryWorld } from '../../../modules/room-inventory/index.js'
import {
  type RoomAssignmentSection,
  type RoomAssignment,
} from '../../../modules/room-assignment/index.js'
import { buildSolverInput, solve } from '../../../solver/index.js'
import type { SolverContributions } from '../../../solver/types.js'
import { buildRevision, compatibilityRevision } from '../../../config/build.js'
import type { BoardView, FamilyView, FindingView, AssignmentReportView, RoomView } from './types.js'

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
  return {
    solver_input: activeProfile.modules.flatMap(
      (module) => module.contributions.solver_input ?? [],
    ),
    stages: activeProfile.modules.flatMap((module) => module.contributions.stages ?? []),
    rules: activeProfile.modules.flatMap((module) => module.contributions.rules ?? []),
    preflight_checks: activeProfile.modules.flatMap(
      (module) => module.contributions.preflight_checks ?? [],
    ),
  }
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

function requirements(world: KernelWorld, familyId: string): readonly string[] {
  const personIds = new Set(
    world.persons
      .filter((person) => labelValue(world, person.id, 'member-of') === familyId)
      .map(({ id }) => id),
  )
  return [
    ...new Set(
      world.requirements
        .filter(({ holder_id: holderId }) => holderId === familyId || personIds.has(holderId))
        .map(({ trait_key: key, strength }) => {
          const trait = activeProfile.traits[key as keyof typeof activeProfile.traits]
          const valueTrait =
            trait?.kind === 'requirement' && trait.satisfied_by
              ? activeProfile.traits[trait.satisfied_by as keyof typeof activeProfile.traits]
              : undefined
          const label = localized(trait?.title) || 'Anforderung'
          const valueLabel = valueTrait ? localized(valueTrait.title) : null
          return `${label}${valueLabel ? `: ${valueLabel}` : ''}${strength === 'required' ? ' · erforderlich' : ''}`
        }),
    ),
  ]
}

function roomLabel(world: KernelWorld, roomId: string): string {
  const number = labelValue(world, roomId, 'number')
  return typeof number === 'string' ? `Zimmer ${number}` : 'Unbekanntes Zimmer'
}

function reasonLabel(reason: string): string {
  if (reason.includes('hard.capacity')) {
    return 'In den passenden Zimmern sind nicht genügend Schlafplätze frei.'
  }
  if (reason.includes('hard.trait-requirements')) {
    return 'Kein verfügbares Zimmer erfüllt alle erforderlichen Merkmale.'
  }
  if (reason.includes('hard.resolver-decisions')) {
    return 'Die Raumkonfiguration schließt die verfügbaren Zimmer aus.'
  }
  if (reason.includes('hard.keep-apart')) {
    return 'Die Belegungsregeln verhindern die gemeinsame Unterbringung.'
  }
  if (reason.includes('has no room satisfying')) {
    return 'Keine passende Unterkunft erfüllt eine erforderliche Anforderung.'
  }
  return 'Es wurde kein passendes Zimmer gefunden.'
}

function subjectLabel(world: KernelWorld, subject: string): string {
  if (world.families.some(({ id }) => id === subject)) return familyName(world, subject)
  if (inventoryWorld(world).rooms.some(({ id }) => id === subject)) return roomLabel(world, subject)
  const trait = activeProfile.traits[subject as keyof typeof activeProfile.traits]
  return localized(trait?.title) || 'Konfigurationsmerkmal'
}

function findingViews(world: KernelWorld, plan: ReturnType<typeof solve>): readonly FindingView[] {
  return [
    ...world.diagnostics.map((diagnostic) => ({
      id: diagnostic.id,
      severity: diagnostic.severity,
      title: 'Hinweis aus der Konfiguration',
      description: reasonLabel(diagnostic.message),
      subjects: [familyName(world, diagnostic.subject_id)],
    })),
    ...plan.preflight.map((finding, index) => ({
      id: `${finding.check}-${finding.subjects.join('-')}-${index}`,
      severity: finding.severity === 'error' ? ('error' as const) : ('warning' as const),
      title:
        finding.check === 'room-assignment.unplaced-family'
          ? 'Familie nicht platziert'
          : 'Belegungsprüfung',
      description: reasonLabel(finding.text),
      subjects: finding.subjects.map((subject) => subjectLabel(world, subject)),
    })),
  ]
}

function roomViews(
  world: KernelWorld,
  assignments: readonly RoomAssignment[],
): readonly RoomView[] {
  const inventory = inventoryWorld(world)
  const buildings = new Map(inventory.buildings.map((building) => [building.id, building.name]))
  const assignmentsByRoom = new Map<string, RoomAssignment[]>()
  for (const assignment of assignments) {
    const current = assignmentsByRoom.get(assignment.room_id) ?? []
    current.push(assignment)
    assignmentsByRoom.set(assignment.room_id, current)
  }
  return inventory.rooms.map((room) => {
    const roomAssignments = assignmentsByRoom.get(room.id) ?? []
    const familyIds = [...new Set(roomAssignments.map(({ family_id: familyId }) => familyId))]
    const occupied = roomAssignments.filter(({ place_id: placeId }) => placeId !== null).length
    const occupants = familyIds.map((id) => familyView(world, id, 'placed'))
    const floor = room.floor ? (floorLabels[room.floor] ?? room.floor) : 'Keine Etage'
    return {
      id: room.id,
      name: roomLabel(world, room.id),
      building: buildings.get(room.building_id) ?? 'Unbekanntes Gebäude',
      floor,
      capacity: room.place_count,
      occupied,
      occupants,
      capabilities: room.capabilities.map((key) => {
        const trait = Object.entries(activeProfile.traits).find(
          ([traitKey]) => traitKey === key,
        )?.[1]
        return localized(trait?.title) || 'Besonderes Merkmal'
      }),
      state: occupied >= room.place_count ? 'occupied' : 'available',
    }
  })
}

function familyView(
  world: KernelWorld,
  familyId: string,
  status: 'placed' | 'unplaced',
): FamilyView {
  return {
    id: familyId,
    name: familyName(world, familyId),
    people: familyPeople(world, familyId),
    requirements: requirements(world, familyId),
    status: {
      label: status === 'placed' ? 'Platziert' : 'Nicht platziert',
      tone: status === 'placed' ? 'success' : 'danger',
    },
  }
}

export function deriveAssignmentReview(world: KernelWorld): AssignmentReview {
  const solverContributions = contributions()
  const input = buildSolverInput(world, solverContributions)
  const plan = solve(input, solverContributions, {
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
  const section = plan.sections['room-assignment'] as RoomAssignmentSection | undefined
  if (!section) throw new Error('room-assignment solver output is unavailable')

  const unplaced = section.unplaced.map(({ family_id: familyId }) =>
    familyView(world, familyId, 'unplaced'),
  )
  const rooms = roomViews(world, section.assignments)
  const buildings = [...new Map(rooms.map((room) => [room.building, room])).keys()].map((name) => ({
    id: name,
    name,
    rooms: rooms.filter((room) => room.building === name),
  }))
  const findings = findingViews(world, plan)
  const assignmentsByRoom = new Map<string, RoomAssignment[]>()
  for (const assignment of section.assignments) {
    const current = assignmentsByRoom.get(assignment.room_id) ?? []
    current.push(assignment)
    assignmentsByRoom.set(assignment.room_id, current)
  }
  const reportRooms = rooms.map((room) => {
    const roomAssignments = assignmentsByRoom.get(room.id) ?? []
    const occupants = [
      ...new Set(roomAssignments.map(({ family_id: id }) => familyName(world, id))),
    ]
    return {
      room: room.name,
      building: `${room.building} · ${room.floor}`,
      occupants: occupants.length > 0 ? occupants.join(', ') : 'Leer',
      capacity: `${room.occupied} / ${room.capacity} Schlafplätze`,
      status: {
        label: room.occupied >= room.capacity ? 'Voll' : occupants.length > 0 ? 'Belegt' : 'Frei',
        tone:
          room.occupied >= room.capacity
            ? ('attention' as const)
            : occupants.length > 0
              ? ('success' as const)
              : ('neutral' as const),
      },
      notes: room.capabilities,
    }
  })
  const placedFamilies = new Set(section.assignments.map(({ family_id: id }) => id))
  const reportUnplaced = section.unplaced.map(({ family_id: id, person_ids: people, reason }) => ({
    family: familyName(world, id),
    people: `${people.length} ${people.length === 1 ? 'Person' : 'Personen'}`,
    reason: reasonLabel(reason),
  }))
  const report: AssignmentReportView = {
    generated_at: 'Aktueller Stand',
    total_families: world.families.length,
    placed_families: placedFamilies.size,
    unplaced_families: section.unplaced.length,
    rooms: reportRooms,
    unplaced: reportUnplaced,
    findings,
  }
  return {
    board: {
      buildings,
      unplaced,
      unplaced_reasons: Object.fromEntries(
        section.unplaced.map(({ family_id: id, reason }) => [id, reasonLabel(reason)]),
      ),
    },
    report,
  }
}
