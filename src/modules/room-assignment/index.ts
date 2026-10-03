import { z } from 'zod'
import type { World } from '../../events/fold.js'
import type { ResolvedRequirement } from '../../events/resolver.js'
import { evaluateRules } from '../../solver/index.js'
import type { Rule, SolverInput, SolverStage, TraceEntry } from '../../solver/types.js'
import { defineModule } from '../define.js'
import { inventoryWorld, type InventoryRoom } from '../room-inventory/index.js'

export type RoomAssignmentParams = {
  weights: { exact_fit: number; near_fit: number; orphan_bed: number }
  keep_apart_trait: string | null
  no_bed_trait: string | null
  priority_trait: string | null
  scarce_capabilities: Readonly<Record<string, number>>
  max_repair_passes: number
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
  max_repair_passes: z.number().int().min(0).default(5),
})

const defaultRoomAssignmentParams = paramsSchema.parse({})

export const roomAssignment = defineModule<RoomAssignmentParams>({
  id: 'room-assignment',
  requires: ['room-inventory'],
  params: paramsSchema,
  contribute: (params) => ({
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
  const requirementsByFamily = new Map<string, ResolvedRequirement[]>()
  for (const requirement of world.requirements) {
    const familyId = personFamily[requirement.holder_id] ?? requirement.holder_id
    if (!world.families.some((family) => family.id === familyId)) continue
    const current = requirementsByFamily.get(familyId) ?? []
    if (requirement.value === `${familyId}_room`) continue
    if (!current.some((item) => sameRequirement(item, requirement))) current.push(requirement)
    requirementsByFamily.set(familyId, current)
  }
  const families = world.families.map((family) => {
    const persons = world.persons
      .filter((person) => personFamily[person.id] === family.id)
      .sort(compareEntity)
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
    .filter(({ family_id: familyId }) => world.families.some((family) => family.id === familyId))
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
  previous: RoomAssignmentSection | null = null,
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
    const before = new Map(placements)
    const candidates = scoredRooms(family, before, input, params, rules).sort(compareScore)
    const selected = score ?? candidates.find(({ room: candidate }) => candidate.id === room.id)
    const rejected = input.rooms
      .flatMap((candidate) =>
        feasible(family, candidate, before, input, params, rules).map(({ rule }) => ({
          target: candidate.id,
          rule,
        })),
      )
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
    const family = families.find(({ family_id: familyId }) => familyId === fixed.family_id)
    const room = roomById(input.rooms, fixed.room_id)
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

  for (const family of families) {
    if (fixedFamilyIds.has(family.family_id)) continue
    const retainedRoom = previousRoom(previous, family.family_id)
    if (retainedRoom && input.rooms.some(({ id }) => id === retainedRoom)) {
      const current = roomById(input.rooms, retainedRoom)
      if (current && feasible(family, current, placements, input, params, rules).length === 0) {
        place(family, current, 'retain')
      }
    }
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

  for (let pass = 0; pass < params.max_repair_passes; pass += 1) {
    let repaired = false
    for (const family of unplaced()) {
      for (const occupant of families.filter(({ family_id: familyId }) =>
        placements.has(familyId),
      )) {
        const oldRoom = placements.get(occupant.family_id)!
        const targetRoom = roomById(input.rooms, oldRoom)!
        placements.delete(occupant.family_id)
        const alternatives = scoredRooms(occupant, placements, input, params, rules)
        const target = scoredRooms(family, placements, input, params, rules).find(
          ({ room }) => room.id === oldRoom,
        )
        const alternative = alternatives.find(({ room }) => room.id !== oldRoom)
        const current = score(occupant, targetRoom, placements, input, params).score
        if (target && alternative && target.score + alternative.score > current) {
          place(family, target.room, 'repair', target)
          place(occupant, alternative.room, 'repair', alternative)
          repaired = true
          break
        }
        placements.set(occupant.family_id, oldRoom)
      }
      if (repaired) break
    }
    if (!repaired) break
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
    const family = families.find(({ family_id: familyId }) => familyId === fixed.family_id)
    const room = roomById(input.rooms, fixed.room_id)
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
      const previous = input.previous_plan?.sections['room-assignment'] as
        | RoomAssignmentSection
        | undefined
      const result = runRoomAssignment(scopedInput, params, previous ?? null)
      return { output: result.section, trace: result.trace, diagnostics: result.diagnostics }
    },
  }
}

export function roomAssignmentRules(): readonly Rule<
  FamilyPlacementUnit,
  RoomCandidate,
  RoomAssignmentInput & { placements?: ReadonlyMap<string, string> }
>[] {
  return [
    {
      id: 'hard.capacity',
      evaluate: (
        family: FamilyPlacementUnit,
        room: RoomCandidate,
        context: RoomAssignmentInput & { placements?: ReadonlyMap<string, string> },
      ) =>
        roomRemaining(room, context.placements ?? new Map(), context) >= family.bed_demand
          ? 0
          : ('infeasible' as const),
      describe: () => 'not enough free places',
    },
    {
      id: 'hard.trait-requirements',
      evaluate: (family: FamilyPlacementUnit, room: RoomCandidate) =>
        family.requirements.filter(
          ({ strength, capability_key: capabilityKey }) =>
            strength === 'required' && capabilityKey && !room.capabilities.has(capabilityKey),
        ).length === 0
          ? 0
          : ('infeasible' as const),
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
    subjects: readonly string[]
    text: string
  }[] = []
  for (const family of roomInput.families) {
    const capacityFinding = (text: string, subjects: readonly string[]) =>
      findings.push({
        check: 'room-assignment.requirement-arithmetic',
        severity: 'error',
        subjects,
        text,
      })
    if (roomInput.rooms.reduce((total, room) => total + room.capacity, 0) < family.bed_demand)
      capacityFinding(
        family.family_id +
          ' needs ' +
          family.bed_demand +
          ' places but the inventory has insufficient capacity',
        [family.family_id],
      )
    for (const requirement of family.requirements.filter(
      ({ strength }) => strength === 'required',
    )) {
      if (requirement.capability_key) {
        const satisfyingCapacity = roomInput.rooms
          .filter(({ capabilities }) => capabilities.has(requirement.capability_key!))
          .reduce((total, room) => total + room.capacity, 0)
        if (satisfyingCapacity < family.bed_demand)
          capacityFinding(
            family.family_id +
              ' has ' +
              family.bed_demand +
              ' places of demand but satisfying rooms provide ' +
              satisfyingCapacity,
            [family.family_id, requirement.trait_key],
          )
      }
    }
    const rules = roomInput.rules ?? roomAssignmentRules()
    const rejected = roomInput.rooms.map((room) =>
      feasible(family, room, new Map(), roomInput, params, rules),
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
      })
    if (unresolvedRoomDecision)
      findings.push({
        check: 'room-assignment.required-contradiction',
        severity: 'error',
        subjects: [family.family_id],
        text: family.family_id + ' has a room decision with no provider',
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

function scoredRooms(
  family: FamilyPlacementUnit,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  rules: readonly Rule[],
): RoomScore[] {
  return input.rooms
    .map((room) => {
      const rejection = feasible(family, room, placements, input, params, rules)
      return rejection.length === 0 ? score(family, room, placements, input, params) : null
    })
    .filter((candidate): candidate is RoomScore => candidate !== null)
}

function feasible(
  family: FamilyPlacementUnit,
  room: RoomCandidate,
  placements: ReadonlyMap<string, string>,
  input: RoomAssignmentInput,
  params: RoomAssignmentParams,
  rules: readonly Rule[],
): Rejection[] {
  const rejections: Rejection[] = []
  const ruleContext = { ...input, placements }
  for (const result of evaluateRules(
    rules as readonly Rule<FamilyPlacementUnit, RoomCandidate, typeof ruleContext>[],
    family,
    room,
    ruleContext,
  ))
    if (result.score === 'infeasible')
      rejections.push({ rule: result.id, text: result.text ?? result.id })
  for (const requirement of family.requirements.filter(({ strength }) => strength === 'required')) {
    if (
      requirement.kind === 'structural' &&
      requirement.structural === 'no-other-families' &&
      roomFamilies(room.id, placements).some((id) => id !== family.family_id)
    )
      rejections.push({
        rule: 'hard.trait-requirements',
        text: 'room already holds another family',
      })
  }
  const roomConstraint = input.room_constraints?.find(
    ({ family_id: familyId }) => familyId === family.family_id,
  )
  if (roomConstraint && !roomConstraint.room_ids.includes(room.id))
    rejections.push({ rule: 'hard.room-decision', text: `room is not in the selected room set` })
  for (const constraint of input.constraints.filter(
    ({ holder_id: holderId, key, strength }) =>
      holderMatches(holderId, family, input) && key === 'excludes' && strength === 'required',
  ))
    if (constraint.value === room.id || room.capabilities.has(constraint.value))
      rejections.push({ rule: 'hard.resolver-decisions', text: `excluded by ${constraint.value}` })
  for (const relation of family.requirements.filter(
    ({ kind, strength, trait_key: traitKey }) =>
      kind === 'relation' &&
      strength === 'required' &&
      (!params.keep_apart_trait || traitKey === params.keep_apart_trait),
  ))
    if (
      relation.value &&
      roomFamilies(room.id, placements).some((id) => familyOfTarget(relation.value!, input) === id)
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
): RoomScore {
  const slack = roomRemaining(room, placements, input) - family.bed_demand
  const terms: [string, number][] = []
  if (slack === 0) terms.push(['exact-fit', params.weights.exact_fit])
  if (slack > 0 && slack <= Math.max(1, family.bed_demand))
    terms.push(['near-fit', params.weights.near_fit])
  if (slack > 0 && params.weights.orphan_bed !== 0)
    terms.push(['orphan-bed', params.weights.orphan_bed * slack])
  for (const requirement of family.requirements.filter(
    ({ strength }) => strength === 'preferred',
  )) {
    const satisfied =
      requirement.kind === 'structural' && requirement.structural === 'no-other-families'
        ? roomFamilies(room.id, placements).every((id) => id === family.family_id)
        : requirement.kind === 'relation'
          ? !requirement.value ||
            !roomFamilies(room.id, placements).some(
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
): number {
  return (
    room.capacity -
    input.families
      .filter(({ family_id: familyId }) => placements.get(familyId) === room.id)
      .reduce((total, family) => total + family.bed_demand, 0)
  )
}

function roomFamilies(roomId: string, placements: ReadonlyMap<string, string>): readonly string[] {
  return [...placements.entries()].filter(([, id]) => id === roomId).map(([familyId]) => familyId)
}

function previousRoom(previous: RoomAssignmentSection | null, familyId: string): string | null {
  return (
    previous?.assignments.find(({ family_id: previousFamilyId }) => previousFamilyId === familyId)
      ?.room_id ?? null
  )
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

function holderMatches(
  holderId: string,
  family: FamilyPlacementUnit,
  input: RoomAssignmentInput,
): boolean {
  return holderId === family.family_id || input.person_family[holderId] === family.family_id
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
