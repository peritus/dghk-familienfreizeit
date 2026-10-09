import { attentionReadiness } from '../../attention/readiness.js'
import { roomAssignmentAttention } from './attention.js'
import { z } from 'zod'
import type { Entity, World } from '../../events/fold.js'
import type { ResolvedRequirement } from '../../events/resolver.js'
import { evaluateRules } from '../../solver/index.js'
import type { Rule, SolverInput, SolverStage, TraceEntry } from '../../solver/types.js'
import { defineModule } from '../define.js'
import {
  accommodationClosedPayload,
  accommodationClosedResultContribution,
  accommodationReopenedPayload,
  validateAccommodationReopened,
} from './closed-result.js'
import type { PhaseReadiness } from '../../config/phases.js'
import { inventoryWorld, type InventoryRoom } from '../room-inventory/index.js'

export type RoomAssignmentParams = {
  weights: { exact_fit: number; near_fit: number; orphan_bed: number }
  keep_apart_trait: string | null
  no_bed_trait: string | null
  priority_trait: string | null
  scarce_capabilities: Readonly<Record<string, number>>
}

export type RoomCandidate = {
  id: string
  sort_key: number
  place_ids: readonly string[]
  capacity: number
  capabilities: ReadonlySet<string>
  room_type: string
}

export type FamilyRequirement = ResolvedRequirement & { family_id: string }

export type FamilyPlacementUnit = {
  family_id: string
  sort_key: number
  person_ids: readonly string[]
  bed_person_ids: readonly string[]
  bed_demand: number
  requirements: readonly FamilyRequirement[]
}

export type RoomAssignmentInput = {
  rooms: readonly RoomCandidate[]
  families: readonly FamilyPlacementUnit[]
  constraints: readonly {
    key: string
    holder_id: string
    value: string
    strength: 'required' | 'preferred' | null
    set_seq: number
  }[]
  person_family: Readonly<Record<string, string>>
  fixed_assignments?: readonly FixedRoomAssignment[]
  room_constraints?: readonly RoomConstraint[]
  rules?: readonly Rule[]
}

export type FixedRoomAssignment = {
  family_id: string
  room_id: string
}

export type RoomConstraint = {
  family_id: string
  room_ids: readonly string[]
}

export type FixedAssignmentViolation = FixedRoomAssignment & {
  reasons: readonly string[]
  unplaced_person_ids: readonly string[]
}

export type RoomAssignment = {
  family_id: string
  person_id: string
  room_id: string
  place_id: string | null
}

export type UnplacedFamily = {
  family_id: string
  person_ids: readonly string[]
  reason: string
}

export type RoomAssignmentSection = {
  assignments: readonly RoomAssignment[]
  unplaced: readonly UnplacedFamily[]
  fixed?: readonly FixedRoomAssignment[]
  fixed_violations?: readonly FixedAssignmentViolation[]
}

type PlacementTrace = TraceEntry & { family_id: string }

type RoomScore = { room: RoomCandidate; score: number; terms: readonly [string, number][] }

type Rejection = { rule: string; text: string }

const paramsSchema = z.object({
  weights: z
    .object({
      exact_fit: z.number().int().default(10),
      near_fit: z.number().int().default(4),
      orphan_bed: z.number().int().max(0).default(-8),
    })
    .default({ exact_fit: 10, near_fit: 4, orphan_bed: -8 }),
  keep_apart_trait: z.string().nullable().default(null),
  no_bed_trait: z.string().nullable().default(null),
  priority_trait: z.string().nullable().default(null),
  scarce_capabilities: z.record(z.string(), z.number().int().max(0)).default({}),
})

const defaultRoomAssignmentParams = paramsSchema.parse({})

export const roomAssignment = defineModule<RoomAssignmentParams>({
  id: 'room-assignment',
  requires: ['room-inventory'],
  params: paramsSchema,
  contribute: (params) => ({
    attention_checks: roomAssignmentAttention(params),
    phases: [
      {
        id: 'room-assignment.review',
        area: 'accommodation',
        opens: { kind: 'always' },
        target: false,
        closed_by_area: false,
        readiness: attentionReadiness('accommodation', roomAssignmentAttention(params)),
      },
    ],
    events: [
      {
        type: 'AccommodationClosed',
        payload: accommodationClosedPayload,
        authorize: (principal) => principal.kind === 'organiser',
        fold: () => {},
      },
      {
        type: 'AccommodationReopened',
        payload: accommodationReopenedPayload,
        validate: (_payload, world) => validateAccommodationReopened(world),
        authorize: (principal) => principal.kind === 'organiser',
        fold: () => {},
      },
    ],
    closed_results: [accommodationClosedResultContribution],
    trait_roles: [
      { parameter: 'keep_apart_trait', kind: 'relation', operator: 'separates-from' },
      { parameter: 'no_bed_trait', kind: 'property' },
      { parameter: 'priority_trait', kind: 'requirement' },
    ],
    solver_input: [
      { id: 'room-assignment', build: (world) => buildRoomAssignmentInput(world, params) },
    ],
    stages: [roomAssignmentStage(params)],
    rules: roomAssignmentRules(),
    preflight_checks: [
      {
        id: 'room-assignment.requirement-arithmetic',
        severity: 'error',
        run: (input) => roomAssignmentPreflight(input, params),
      },
    ],
    screens: [
      {
        id: 'organiser-assignment-board',
        route: '/organiser/accommodation/assignment',
        label: 'Belegung',
        audience: 'organiser',
      },
    ],
  }),
})

export function buildRoomAssignmentInput(
  world: World,
  params: RoomAssignmentParams,
): RoomAssignmentInput {
  const inventory = inventoryWorld(world)
  const rooms = inventory.rooms
    .filter(({ traits }) => traits['room-status'] !== 'blocked')
    .map((room) => toRoomCandidate(room, inventory.places, world))
  const personFamily: Record<string, string> = {}
  for (const person of world.persons) {
    const familyId = labelValue(world, person.id, 'member-of')
    if (typeof familyId === 'string') personFamily[person.id] = familyId
  }
  // Families keyed by id, and persons grouped by the family they belong to.
  // The requirement and room-decision passes each scanned every family per row,
  // and the family projection below scanned every person per family.
  const familyIds = new Set(world.families.map(({ id }) => id))
  const personsByFamily = new Map<string, Entity[]>()
  for (const person of world.persons) {
    const familyId = personFamily[person.id]
    if (familyId === undefined) continue
    const bucket = personsByFamily.get(familyId)
    if (bucket) bucket.push(person)
    else personsByFamily.set(familyId, [person])
  }
  const requirementsByFamily = new Map<string, ResolvedRequirement[]>()
  for (const requirement of world.requirements) {
    if (requirement.consumer && requirement.consumer !== 'room-assignment') continue
    const familyId = personFamily[requirement.holder_id] ?? requirement.holder_id
    if (!familyIds.has(familyId)) continue
    const current = requirementsByFamily.get(familyId) ?? []
    if (requirement.value === `${familyId}_room`) continue
    if (!current.some((item) => sameRequirement(item, requirement))) current.push(requirement)
    requirementsByFamily.set(familyId, current)
  }
  const families = world.families.map((family) => {
    const persons = (personsByFamily.get(family.id) ?? []).slice().sort(compareEntity)
    const bedDemand = persons.filter(
      (person) => labelValue(world, person.id, params.no_bed_trait ?? '') !== true,
    ).length
    return {
      family_id: family.id,
      sort_key: family.sort_key,
      person_ids: Object.freeze(persons.map(({ id }) => id)),
      bed_person_ids: Object.freeze(
        persons
          .filter((person) => labelValue(world, person.id, params.no_bed_trait ?? '') !== true)
          .map(({ id }) => id),
      ),
      bed_demand: bedDemand,
      requirements: Object.freeze(
        (requirementsByFamily.get(family.id) ?? []).map((requirement) => ({
          ...requirement,
          family_id: family.id,
        })),
      ),
    }
  })
  const allRoomIds = new Set(inventory.rooms.map(({ id }) => id))
  const roomConstraints = world.requirements
    .filter(({ kind, value }) => kind === 'generic-needs' && value?.endsWith('_room'))
    .map((requirement) => {
      const familyId = personFamily[requirement.holder_id] ?? requirement.holder_id
      const token = requirement.value!
      const roomIds = world.capabilities
        .filter(
          ({ entity_id: entityId, key, source }) =>
            key === token && source === 'assigned' && allRoomIds.has(entityId),
        )
        .map(({ entity_id: entityId }) => entityId)
        .sort()
      return { family_id: familyId, room_ids: Object.freeze(roomIds) }
    })
    .filter(({ family_id: familyId }) => familyIds.has(familyId))
  const fixedAssignments = roomConstraints.flatMap(({ family_id: familyId, room_ids: roomIds }) =>
    roomIds.length === 1 ? [{ family_id: familyId, room_id: roomIds[0]! }] : [],
  )
  return {
    rooms: Object.freeze(rooms.sort(compareEntity)),
    families: Object.freeze(
      families.sort(
        (left, right) =>
          left.sort_key - right.sort_key || left.family_id.localeCompare(right.family_id),
      ),
    ),
    constraints: Object.freeze(world.constraints.map((constraint) => ({ ...constraint }))),
    person_family: Object.freeze(personFamily),
    fixed_assignments: Object.freeze(fixedAssignments),
    room_constraints: Object.freeze(roomConstraints),
  }
}

export function runRoomAssignment(
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
): {
  section: RoomAssignmentSection
  trace: readonly TraceEntry[]
  diagnostics: readonly {
    check: string
    severity: 'warning'
    subjects: readonly string[]
    text: string
  }[]
} {
  const placements = new Map<string, string>()
  const rules = input.rules ?? roomAssignmentRules()
  // Keyed lookups for the collections the stage resolves by id.
  const roomsById = new Map(input.rooms.map((room) => [room.id, room]))
  const familiesById = new Map(input.families.map((family) => [family.family_id, family] as const))
  const trace: PlacementTrace[] = []
  // `scoredRooms` against no placements is a pure function of the family, so
  // each family's candidate count is computed once here instead of twice per
  // comparison inside the sort: O(F) room sweeps rather than O(F log F).
  const unplacedCandidateCounts = new Map<string, number>(
    input.families.map((family) => [
      family.family_id,
      scoredRooms(family, new Map<string, string>(), input, params, rules).length,
    ]),
  )
  const families = input.families
    .slice()
    .sort((left, right) => compareFamily(left, right, params, unplacedCandidateCounts))
  const place = (
    family: FamilyPlacementUnit,
    room: RoomCandidate,
    step: string,
    score?: RoomScore,
  ): void => {
    // One sweep provides both halves of the trace detail: scored candidates and
    // per-room rejections.
    const evaluated = evaluateRooms(family, placements, input, params, rules)
    const candidates = evaluated.candidates.slice().sort(compareScore)
    const selected = score ?? candidates.find(({ room: candidate }) => candidate.id === room.id)
    const rejected = evaluated.rejections
      .slice()
      .sort(
        (left, right) =>
          left.target.localeCompare(right.target) || left.rule.localeCompare(right.rule),
      )
    placements.set(family.family_id, room.id)
    trace.push({
      stage: 'room-assignment.place',
      step,
      subject: family.family_id,
      family_id: family.family_id,
      text: `${family.family_id} → ${room.id}`,
      detail: {
        chosen: {
          target: room.id,
          score: selected?.score ?? 0,
          terms: selected?.terms ?? [[step, 0]],
        },
        runners_up: candidates
          .filter(({ room: candidate }) => candidate.id !== room.id)
          .slice(0, 3)
          .map(({ room: candidate, score: candidateScore, terms }) => ({
            target: candidate.id,
            score: candidateScore,
            terms,
          })),
        rejected,
      },
    })
  }

  const fixedAssignments = input.fixed_assignments ?? []
  const fixedFamilyIds = new Set(fixedAssignments.map(({ family_id: familyId }) => familyId))
  for (const fixed of fixedAssignments) {
    const family = familiesById.get(fixed.family_id)
    const room = roomsById.get(fixed.room_id)
    if (family && room) place(family, room, 'fixed')
    else if (family)
      trace.push({
        stage: 'room-assignment.place',
        step: 'fixed-invalid',
        subject: family.family_id,
        family_id: family.family_id,
        text: family.family_id + ' fixed in unavailable room ' + fixed.room_id,
        detail: {
          chosen: { target: fixed.room_id, score: 0, terms: [['fixed-invalid', 0]] },
          runners_up: [],
          rejected: [{ target: fixed.room_id, rule: 'hard.room-unavailable' }],
        },
      })
  }

  const unplaced = (): FamilyPlacementUnit[] =>
    families.filter(
      ({ family_id: familyId }) => !placements.has(familyId) && !fixedFamilyIds.has(familyId),
    )
  let changed = true
  let iterations = 0
  while (changed && iterations <= families.length) {
    changed = false
    iterations += 1
    for (const family of unplaced()) {
      const candidates = scoredRooms(family, placements, input, params, rules)
      if (candidates.length === 1) {
        place(family, candidates[0]!.room, 'forced', candidates[0])
        changed = true
      }
    }
  }

  for (const family of unplaced()) {
    const candidates = scoredRooms(family, placements, input, params, rules)
    const sorted = candidates.slice().sort(compareScore)
    if (sorted[0]) place(family, sorted[0].room, 'greedy', sorted[0])
  }

  const unplacedFamilies = unplaced().map((family) => ({
    family_id: family.family_id,
    person_ids: family.person_ids,
    reason: explainUnplaced(family, placements, input, params, rules),
  }))
  for (const family of unplacedFamilies)
    trace.push({
      stage: 'room-assignment.place',
      step: 'unplaceable',
      subject: family.family_id,
      family_id: family.family_id,
      text: family.reason,
    })
  const assignments = assignRoomPlaces(families, placements, input)
  const fixedViolations = fixedAssignments.flatMap((fixed) => {
    const family = familiesById.get(fixed.family_id)
    const room = roomsById.get(fixed.room_id)
    if (!family) return []
    if (!room)
      return [
        {
          ...fixed,
          reasons: Object.freeze(['hard.room-unavailable']),
          unplaced_person_ids: Object.freeze(family.bed_person_ids),
        },
      ]
    const withoutFamily = new Map(placements)
    withoutFamily.delete(family.family_id)
    const reasons = feasible(family, room, withoutFamily, input, params, rules).map(
      ({ rule }) => rule,
    )
    const assignedBedPeople = new Set(
      assignments
        .filter(
          ({ family_id: familyId, place_id: placeId }) => familyId === fixed.family_id && placeId,
        )
        .map(({ person_id: personId }) => personId),
    )
    const unplacedPersonIds = family.bed_person_ids.filter(
      (personId) => !assignedBedPeople.has(personId),
    )
    return reasons.length > 0 || unplacedPersonIds.length > 0
      ? [
          {
            ...fixed,
            reasons: Object.freeze([...new Set(reasons.length > 0 ? reasons : ['hard.capacity'])]),
            unplaced_person_ids: Object.freeze(unplacedPersonIds),
          },
        ]
      : []
  })
  return {
    section: {
      assignments,
      unplaced: Object.freeze(unplacedFamilies),
      fixed: Object.freeze(fixedAssignments),
      fixed_violations: Object.freeze(fixedViolations),
    },
    trace: Object.freeze(trace.map(({ family_id: _familyId, ...entry }) => entry)),
    diagnostics: Object.freeze([
      ...unplacedFamilies.map((family) => ({
        check: 'room-assignment.unplaced-family' as const,
        severity: 'warning' as const,
        subjects: [family.family_id],
        text: family.reason,
      })),
      ...fixedViolations.map((violation) => ({
        check: 'room-assignment.fixed-invalid' as const,
        severity: 'warning' as const,
        subjects: [violation.family_id, violation.room_id],
        text: `${violation.family_id} fixed in ${violation.room_id}: ${violation.reasons.join(', ')}`,
      })),
    ]),
  }
}

function roomAssignmentStage(params: RoomAssignmentParams): SolverStage<RoomAssignmentSection> {
  return {
    id: 'room-assignment.place',
    after: [],
    before: [],
    reads: [],
    run: (input: SolverInput) => {
      const roomInput = input.module_inputs['room-assignment'] as RoomAssignmentInput
      const scopedInput = { ...roomInput, rules: input.rules }
      const result = runRoomAssignment(scopedInput, params)
      return { output: result.section, trace: result.trace, diagnostics: result.diagnostics }
    },
  }
}

export function roomAssignmentRules(): readonly Rule<
  FamilyPlacementUnit,
  RoomCandidate,
  RuleContext
>[] {
  return [
    {
      id: 'hard.capacity',
      evaluate: (family: FamilyPlacementUnit, room: RoomCandidate, context: RuleContext) =>
        // `placement_index` is optional so an externally defined rule, or a
        // caller that builds its own context, still works via the scan below.
        roomRemaining(room, context.placements ?? new Map(), context, context.placement_index) >=
        family.bed_demand
          ? 0
          : ('infeasible' as const),
      describe: () => 'not enough free places',
    },
    {
      id: 'hard.trait-requirements',
      evaluate: (family: FamilyPlacementUnit, room: RoomCandidate) =>
        // `some`, not `filter(...).length`: this runs once per candidate pair
        // and the array was only ever tested for emptiness.
        family.requirements.some(
          ({ strength, capability_key: capabilityKey }) =>
            strength === 'required' && capabilityKey && !room.capabilities.has(capabilityKey),
        )
          ? ('infeasible' as const)
          : 0,
      describe: () => 'required requirement is not satisfied',
    },
  ]
}

export function roomAssignmentPreflight(
  input: SolverInput,
  params: RoomAssignmentParams = defaultRoomAssignmentParams,
) {
  const roomInput = input.module_inputs['room-assignment'] as RoomAssignmentInput
  const findings: {
    check: string
    severity: 'error'
    evidence?: Readonly<Record<string, import('../../events/types.js').JsonValue>>
    subjects: readonly string[]
    text: string
  }[] = []
  // Inventory totals and the rule set are the same for every family; deriving
  // them per family made preflight cost families x rooms x requirements.
  const totalCapacity = roomInput.rooms.reduce((total, room) => total + room.capacity, 0)
  const capacityByCapability = new Map<string, number>()
  for (const room of roomInput.rooms)
    for (const capability of room.capabilities)
      capacityByCapability.set(
        capability,
        (capacityByCapability.get(capability) ?? 0) + room.capacity,
      )
  const rules = roomInput.rules ?? roomAssignmentRules()
  const emptyPlacements = new Map<string, string>()
  for (const family of roomInput.families) {
    const capacityFinding = (
      text: string,
      subjects: readonly string[],
      evidence: Readonly<Record<string, import('../../events/types.js').JsonValue>>,
    ) =>
      findings.push({
        check: 'room-assignment.requirement-arithmetic',
        evidence,
        severity: 'error',
        subjects,
        text,
      })
    if (totalCapacity < family.bed_demand)
      capacityFinding(
        family.family_id +
          ' needs ' +
          family.bed_demand +
          ' places but the inventory has insufficient capacity',
        [family.family_id],
        { demand: family.bed_demand, capacity: totalCapacity, capability: null },
      )
    for (const requirement of family.requirements) {
      if (requirement.strength === 'required' && requirement.capability_key) {
        const satisfyingCapacity = capacityByCapability.get(requirement.capability_key) ?? 0
        if (satisfyingCapacity < family.bed_demand)
          capacityFinding(
            family.family_id +
              ' has ' +
              family.bed_demand +
              ' places of demand but satisfying rooms provide ' +
              satisfyingCapacity,
            [family.family_id, requirement.trait_key],
            {
              demand: family.bed_demand,
              capacity: satisfyingCapacity,
              capability: requirement.capability_key,
              trait: requirement.trait_key,
            },
          )
      }
    }
    // One sweep state for this family's whole room pass.
    const state = sweepState(family, emptyPlacements, roomInput, params)
    const rejected = roomInput.rooms.map((room) =>
      feasible(family, room, emptyPlacements, roomInput, params, rules, state),
    )
    const unresolvedRoomDecision = roomInput.room_constraints?.some(
      ({ family_id: familyId, room_ids: roomIds }) =>
        familyId === family.family_id && roomIds.length === 0,
    )
    if (
      roomInput.rooms.length > 0 &&
      rejected.every((reasons) => reasons.length > 0) &&
      !unresolvedRoomDecision &&
      !findings.some(
        ({ check, subjects }) =>
          check === 'room-assignment.requirement-arithmetic' && subjects.includes(family.family_id),
      )
    )
      findings.push({
        check: 'room-assignment.required-contradiction',
        severity: 'error',
        subjects: [family.family_id],
        text: family.family_id + ' has no room satisfying all required decisions',
        evidence: { reasons: [...new Set(rejected.flatMap((r) => r.map((v) => v.rule)))].sort() },
      })
    if (unresolvedRoomDecision)
      findings.push({
        check: 'room-assignment.required-contradiction',
        severity: 'error',
        subjects: [family.family_id],
        text: family.family_id + ' has a room decision with no provider',
        evidence: { reasons: ['hard.room-unavailable'] },
      })
  }
  return findings
}

function toRoomCandidate(
  room: InventoryRoom,
  places: readonly { id: string; room_id: string }[],
  world: World,
): RoomCandidate {
  return {
    id: room.id,
    sort_key: room.sort_key,
    place_ids: Object.freeze(
      places
        .filter(({ room_id: roomId }) => roomId === room.id)
        .map(({ id }) => id)
        .sort(),
    ),
    capacity: room.place_count,
    capabilities: Object.freeze(
      new Set([
        ...room.capabilities,
        ...world.capabilities
          .filter(({ entity_id: entityId }) => entityId === room.id)
          .map(({ key }) => key),
      ]),
    ),
    room_type: room.room_type,
  }
}

/**
 * One pass over the rooms, returning both the scored feasible candidates and
 * the per-room rejections. A placement's trace needs both halves, and deriving
 * them separately meant evaluating every rule against every room twice.
 */
function evaluateRooms(
  family: FamilyPlacementUnit,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  rules: readonly Rule[],
): { candidates: RoomScore[]; rejections: { target: string; rule: string }[] } {
  const candidates: RoomScore[] = []
  const rejections: { target: string; rule: string }[] = []
  const state = sweepState(family, placements, input, params)
  for (const room of input.rooms) {
    const reasons = feasible(family, room, placements, input, params, rules, state)
    if (reasons.length === 0) candidates.push(score(family, room, placements, input, params, state))
    else for (const { rule } of reasons) rejections.push({ target: room.id, rule })
  }
  return { candidates, rejections }
}

function scoredRooms(
  family: FamilyPlacementUnit,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  rules: readonly Rule[],
): RoomScore[] {
  return evaluateRooms(family, placements, input, params, rules).candidates
}

/**
 * Room occupancy derived from one `placements` map. Deriving it per sweep keeps
 * `roomRemaining` and `roomFamilies` O(1) without maintaining a second mutable
 * index across the stage, so the index cannot drift from the placement map.
 */
export type PlacementIndex = {
  occupancy: ReadonlyMap<string, number>
  families_by_room: ReadonlyMap<string, readonly string[]>
}

/**
 * Lookups that depend only on the input, not on the family being placed or on
 * the placements so far. Memoised on the input's identity: `buildSolverInput`
 * produces a fresh, immutable input per solve, so an entry is valid for every
 * sweep of that run and unreachable once the run is over.
 *
 * Without this, each sweep rebuilt the bed-demand map from every family and
 * re-filtered every constraint in the occasion — work proportional to the whole
 * input, repeated once per sweep.
 */
type InputIndex = {
  bed_demand_by_family: ReadonlyMap<string, number>
  excludes_by_family: ReadonlyMap<string, readonly RoomAssignmentInput['constraints'][number][]>
}

const inputIndexCache = new WeakMap<RoomAssignmentInput, InputIndex>()

function inputIndex(input: RoomAssignmentInput): InputIndex {
  const cached = inputIndexCache.get(input)
  if (cached) return cached
  const bedDemandByFamily = new Map(
    input.families.map((family) => [family.family_id, family.bed_demand]),
  )
  const excludesByFamily = new Map<string, RoomAssignmentInput['constraints'][number][]>()
  for (const constraint of input.constraints) {
    if (constraint.key !== 'excludes' || constraint.strength !== 'required') continue
    // A constraint held by a person applies to that person's family, which is
    // what `holderMatches` resolved per candidate pair.
    const familyId = input.person_family[constraint.holder_id] ?? constraint.holder_id
    const bucket = excludesByFamily.get(familyId)
    if (bucket) bucket.push(constraint)
    else excludesByFamily.set(familyId, [constraint])
  }
  const built: InputIndex = {
    bed_demand_by_family: bedDemandByFamily,
    excludes_by_family: excludesByFamily,
  }
  inputIndexCache.set(input, built)
  return built
}

export function placementIndex(
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
): PlacementIndex {
  const demand = inputIndex(input).bed_demand_by_family
  const occupancy = new Map<string, number>()
  const familiesByRoom = new Map<string, string[]>()
  // Iterating `placements` preserves its order, which is the order the previous
  // `[...placements.entries()].filter(...)` produced.
  for (const [familyId, roomId] of placements) {
    occupancy.set(roomId, (occupancy.get(roomId) ?? 0) + (demand.get(familyId) ?? 0))
    const bucket = familiesByRoom.get(roomId)
    if (bucket) bucket.push(familyId)
    else familiesByRoom.set(roomId, [familyId])
  }
  return { occupancy, families_by_room: familiesByRoom }
}

type RuleContext = RoomAssignmentInput & {
  placements?: ReadonlyMap<string, string>
  placement_index?: PlacementIndex
}

/** Everything a room sweep can resolve before it starts iterating rooms. */
type SweepState = {
  family: FamilySweep
  index: PlacementIndex
  rule_context: RuleContext
}

function sweepState(
  family: FamilyPlacementUnit,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
): SweepState {
  const index = placementIndex(placements, input)
  return {
    family: familySweep(family, input, params),
    index,
    rule_context: { ...input, placements, placement_index: index },
  }
}

/**
 * The parts of a feasibility check that depend only on the family, resolved
 * once per sweep instead of once per candidate room. Each list keeps the
 * iteration order of its source so rejection order is unchanged.
 */
type FamilySweep = {
  requires_sole_occupancy: boolean
  excluded: readonly RoomAssignmentInput['constraints'][number][]
  keep_apart: readonly FamilyRequirement[]
  preferred: readonly FamilyRequirement[]
  room_constraint: RoomConstraint | undefined
}

function familySweep(
  family: FamilyPlacementUnit,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
): FamilySweep {
  return {
    requires_sole_occupancy: family.requirements.some(
      ({ strength, kind, structural }) =>
        strength === 'required' && kind === 'structural' && structural === 'no-other-families',
    ),
    excluded: inputIndex(input).excludes_by_family.get(family.family_id) ?? [],
    keep_apart: family.requirements.filter(
      ({ kind, strength, trait_key: traitKey }) =>
        kind === 'relation' &&
        strength === 'required' &&
        (!params.keep_apart_trait || traitKey === params.keep_apart_trait),
    ),
    preferred: family.requirements.filter(({ strength }) => strength === 'preferred'),
    room_constraint: input.room_constraints?.find(
      ({ family_id: familyId }) => familyId === family.family_id,
    ),
  }
}

function feasible(
  family: FamilyPlacementUnit,
  room: RoomCandidate,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  rules: readonly Rule[],
  state: SweepState = sweepState(family, placements, input, params),
): Rejection[] {
  const rejections: Rejection[] = []
  const sweep = state.family
  for (const result of evaluateRules(
    rules as readonly Rule<FamilyPlacementUnit, RoomCandidate, RuleContext>[],
    family,
    room,
    state.rule_context,
  ))
    if (result.score === 'infeasible')
      rejections.push({ rule: result.id, text: result.text ?? result.id })
  if (
    sweep.requires_sole_occupancy &&
    roomFamilies(room.id, placements, state.index).some((id) => id !== family.family_id)
  )
    rejections.push({
      rule: 'hard.trait-requirements',
      text: 'room already holds another family',
    })
  const roomConstraint = sweep.room_constraint
  if (roomConstraint && !roomConstraint.room_ids.includes(room.id))
    rejections.push({ rule: 'hard.room-decision', text: `room is not in the selected room set` })
  for (const constraint of sweep.excluded)
    if (constraint.value === room.id || room.capabilities.has(constraint.value))
      rejections.push({ rule: 'hard.resolver-decisions', text: `excluded by ${constraint.value}` })
  for (const relation of sweep.keep_apart)
    if (
      relation.value &&
      roomFamilies(room.id, placements, state.index).some(
        (id) => familyOfTarget(relation.value!, input) === id,
      )
    )
      rejections.push({ rule: 'hard.keep-apart', text: `kept apart from ${relation.value}` })
  return rejections
}

function score(
  family: FamilyPlacementUnit,
  room: RoomCandidate,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  state: SweepState = sweepState(family, placements, input, params),
): RoomScore {
  const sweep = state.family
  const slack = roomRemaining(room, placements, input, state.index) - family.bed_demand
  const terms: [string, number][] = []
  if (slack === 0) terms.push(['exact-fit', params.weights.exact_fit])
  if (slack > 0 && slack <= Math.max(1, family.bed_demand))
    terms.push(['near-fit', params.weights.near_fit])
  if (slack > 0 && params.weights.orphan_bed !== 0)
    terms.push(['orphan-bed', params.weights.orphan_bed * slack])
  for (const requirement of sweep.preferred) {
    const satisfied =
      requirement.kind === 'structural' && requirement.structural === 'no-other-families'
        ? roomFamilies(room.id, placements, state.index).every((id) => id === family.family_id)
        : requirement.kind === 'relation'
          ? !requirement.value ||
            !roomFamilies(room.id, placements, state.index).some(
              (id) => familyOfTarget(requirement.value!, input) === id,
            )
          : requirement.capability_key
            ? room.capabilities.has(requirement.capability_key)
            : true
    const value = satisfied ? (requirement.weight ?? 0) : (requirement.penalty ?? 0)
    if (value !== 0)
      terms.push([
        `${requirement.kind === 'relation' ? 'preferred-relation' : 'preferred-requirement'}:${requirement.trait_key}`,
        value,
      ])
  }
  for (const [capability, penalty] of Object.entries(params.scarce_capabilities))
    if (
      room.capabilities.has(capability) &&
      !family.requirements.some(({ capability_key: capabilityKey }) => capabilityKey === capability)
    )
      terms.push([`scarce-capability:${capability}`, penalty])
  return { room, score: terms.reduce((total, [, value]) => total + value, 0), terms }
}

export function assignRoomPlaces(
  families: readonly FamilyPlacementUnit[],
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
): readonly RoomAssignment[] {
  const used = new Set<string>()
  const assignments: RoomAssignment[] = []
  const fixedIds = new Set((input.fixed_assignments ?? []).map(({ family_id: id }) => id))
  for (const family of families
    .slice()
    .sort(
      (left, right) =>
        Number(fixedIds.has(right.family_id)) - Number(fixedIds.has(left.family_id)) ||
        left.family_id.localeCompare(right.family_id),
    )) {
    const roomId = placements.get(family.family_id)
    if (!roomId) continue
    const room = roomById(input.rooms, roomId)
    if (!room) continue
    const available = room.place_ids.filter((placeId) => !used.has(placeId))
    let index = 0
    const bedPeople = new Set(family.bed_person_ids)
    for (const personId of family.person_ids) {
      const placeId = bedPeople.has(personId) ? (available[index++] ?? null) : null
      if (placeId) used.add(placeId)
      assignments.push({
        family_id: family.family_id,
        person_id: personId,
        room_id: roomId,
        place_id: placeId,
      })
    }
  }
  return Object.freeze(assignments)
}

function explainUnplaced(
  family: FamilyPlacementUnit,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  rules: readonly Rule[],
): string {
  const counts = new Map<string, number>()
  const candidates = input.rooms.map((room) => ({
    room,
    rejections: feasible(family, room, placements, input, params, rules),
  }))
  for (const { rejections } of candidates)
    for (const rejection of rejections)
      counts.set(rejection.rule, (counts.get(rejection.rule) ?? 0) + 1)
  const reason = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]
  const closest = candidates
    .slice()
    .sort(
      (left, right) =>
        left.rejections.length - right.rejections.length || compareEntity(left.room, right.room),
    )[0]
  return reason
    ? `${family.family_id} unplaced: ${reason[0]} rejected ${reason[1]} room(s)${closest ? `. Closest: ${closest.room.id} (${closest.rejections.map(({ rule }) => rule).join(', ')})` : ''}`
    : `${family.family_id} unplaced`
}

function roomRemaining(
  room: RoomCandidate,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  index?: PlacementIndex,
): number {
  if (index) return room.capacity - (index.occupancy.get(room.id) ?? 0)
  return (
    room.capacity -
    input.families
      .filter(({ family_id: familyId }) => placements.get(familyId) === room.id)
      .reduce((total, family) => total + family.bed_demand, 0)
  )
}

function roomFamilies(
  roomId: string,
  placements: ReadonlyMap<string, string>,
  index?: PlacementIndex,
): readonly string[] {
  if (index) return index.families_by_room.get(roomId) ?? []
  return [...placements.entries()].filter(([, id]) => id === roomId).map(([familyId]) => familyId)
}

function roomById(rooms: readonly RoomCandidate[], id: string): RoomCandidate | undefined {
  return rooms.find((room) => room.id === id)
}

function labelValue(world: World, entityId: string, key: string): unknown {
  return world.labels_by_entity[entityId]?.find((label) => label.key === key)?.value
}

function sameRequirement(left: ResolvedRequirement, right: ResolvedRequirement): boolean {
  return (
    left.trait_key === right.trait_key &&
    left.capability_key === right.capability_key &&
    left.value === right.value &&
    left.strength === right.strength
  )
}

function familyOfTarget(target: string, input: RoomAssignmentInput): string {
  return input.person_family[target] ?? target
}

function compareEntity(
  left: { sort_key: number; id: string },
  right: { sort_key: number; id: string },
): number {
  return left.sort_key - right.sort_key || left.id.localeCompare(right.id)
}

/** Orders families by how constrained they are. `candidateCounts` holds each
 * family's feasible-room count against no placements, precomputed by the
 * caller — the comparator must stay cheap because it runs O(F log F) times. */
function compareFamily(
  left: FamilyPlacementUnit,
  right: FamilyPlacementUnit,
  params: RoomAssignmentParams,
  candidateCounts: ReadonlyMap<string, number>,
): number {
  return (
    priority(right, params) - priority(left, params) ||
    (candidateCounts.get(left.family_id) ?? 0) - (candidateCounts.get(right.family_id) ?? 0) ||
    right.bed_demand - left.bed_demand ||
    left.sort_key - right.sort_key ||
    left.family_id.localeCompare(right.family_id)
  )
}

function priority(family: FamilyPlacementUnit, params: RoomAssignmentParams): number {
  return Math.max(
    ...family.requirements
      .filter(
        ({ trait_key: traitKey }) => !params.priority_trait || traitKey === params.priority_trait,
      )
      .map(({ strength, weight }) => (strength === 'required' ? 2 : 1) * (weight ?? 0)),
    0,
  )
}

function compareScore(left: RoomScore, right: RoomScore): number {
  return right.score - left.score || compareEntity(left.room, right.room)
}

/**
 * The accommodation review is ready when at least one family is registered, the current plan
 * has no blocking room-assignment preflight finding, and every fixed room decision holds
 * (spec/architecture/phases.md §4).
 */
export const roomReviewReadiness: PhaseReadiness = attentionReadiness(
  'accommodation',
  roomAssignmentAttention(defaultRoomAssignmentParams),
)

/** One canonical indexed room sweep, shared by review and fixed-assignment authoring. */
export function roomFeasibility(
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  assignments: readonly RoomAssignment[],
  familyId: string,
) {
  const family = input.families.find((f) => f.family_id === familyId)
  if (!family) return []
  const placements = new Map(
    assignments.filter((a) => a.family_id !== familyId).map((a) => [a.family_id, a.room_id]),
  )
  const state = sweepState(family, placements, input, params)
  const rules = input.rules ?? roomAssignmentRules()
  return input.rooms.map((room) => ({
    room_id: room.id,
    remaining: roomRemaining(room, placements, input, state.index),
    capability_matches: Object.fromEntries(
      family.requirements.flatMap((requirement) =>
        requirement.capability_key
          ? [[requirement.capability_key, room.capabilities.has(requirement.capability_key)]]
          : [],
      ),
    ),
    reasons: feasible(family, room, placements, input, params, rules, state).map((r) => r.rule),
  }))
}
