import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { canonicalJson } from '../../src/events/types.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { solve } from '../../src/solver/solve.js'
import { runRoomAssignment } from '../../src/modules/room-assignment/index.js'
import type {
  FamilyPlacementUnit,
  FamilyRequirement,
  RoomAssignmentInput,
  RoomCandidate,
} from '../../src/modules/room-assignment/index.js'
import type { JsonValue } from '../../src/events/types.js'
import { syntheticLog, syntheticScale } from '../bench/log.js'

/**
 * A whole plan, digested. The placement stage was rewritten to stop rescanning
 * families, rooms and constraints inside its innermost loops; none of that may
 * change a single assignment, score, rejection or trace entry. A digest over
 * the canonical plan is the cheapest statement of that, and it covers the
 * scoring, retention, repair, preflight and trace paths together.
 */
/**
 * This digest includes the current workshop allocation round snapshots and
 * trace contract. A change to this value means the solver now decides
 * something different or its explicit explanation contract changed — update it
 * only with that intent.
 */
const baselineDigest = 'e47cc1109ef83b230c45f2f149f06604b1676f8eb22ff180fb4cb253d37fa7fe'

const profile = luebben2027Profile
const contributions = composeSolverContributions(profile)
const solverConfig = {
  build_revision: 'equivalence',
  compatibility_revision: 1,
  event_date: profile.meta.starts_on,
  profile,
  seed: null,
}

test('the placement plan is unchanged for a full occasion', () => {
  const events = syntheticLog(syntheticScale(2))
  const world = derive(events, profile.validation_view)
  const first = solve(buildSolverInput(world, contributions), contributions, solverConfig)
  // Second pass with the first plan as the previous one, so retention and the
  // repair pass are part of what the digest covers.
  const second = solve(buildSolverInput(world, contributions, first), contributions, solverConfig)
  const digest = createHash('sha256')
    .update(canonicalJson({ first, second } as unknown as JsonValue))
    .digest('hex')
  expect(digest).toBe(baselineDigest)
})

/**
 * The digest above does not exercise the candidate-count tiebreak in the family
 * ordering: on that occasion every tie is already resolved by priority or bed
 * demand. This case is built so the count is what decides, and so the decision
 * changes the outcome — flattening the precomputed counts places the families
 * in different rooms rather than merely in a different order.
 */
const params = {
  weights: { exact_fit: 10, near_fit: 4, orphan_bed: -8 },
  keep_apart_trait: null,
  no_bed_trait: null,
  priority_trait: null,
  scarce_capabilities: {},
  max_repair_passes: 5,
}

function room(id: string, sortKey: number, capacity: number, accessible: boolean): RoomCandidate {
  return {
    id,
    sort_key: sortKey,
    place_ids: Object.freeze(Array.from({ length: capacity }, (_, index) => `${id}_p${index}`)),
    capacity,
    capabilities: Object.freeze(new Set(accessible ? ['accessible'] : [])),
    room_type: 'standard',
  }
}

function family(
  id: string,
  sortKey: number,
  requirements: readonly FamilyRequirement[],
): FamilyPlacementUnit {
  return {
    family_id: id,
    sort_key: sortKey,
    person_ids: Object.freeze([`${id}_a`, `${id}_b`]),
    bed_person_ids: Object.freeze([`${id}_a`, `${id}_b`]),
    bed_demand: 2,
    requirements,
  }
}

test('the candidate-count tiebreak decides which family picks first', () => {
  // fam_q is reachable by every room; fam_p needs an accessible one, so it has
  // fewer candidates and must choose first even though its sort_key is higher.
  const input: RoomAssignmentInput = {
    rooms: [room('rm_x', 1, 4, true), room('rm_y', 2, 2, true), room('rm_z', 3, 2, false)],
    families: [
      family('fam_q', 1, []),
      family('fam_p', 2, [
        {
          trait_key: 'needs-accessible',
          holder_id: 'fam_p',
          capability_key: 'accessible',
          kind: 'profile-requirement',
          structural: null,
          value: 'accessible',
          strength: 'required',
          weight: null,
          penalty: null,
          set_seq: 1,
          family_id: 'fam_p',
        },
      ]),
    ],
    constraints: [],
    person_family: {
      fam_p_a: 'fam_p',
      fam_p_b: 'fam_p',
      fam_q_a: 'fam_q',
      fam_q_b: 'fam_q',
    },
  }

  const rooms = new Map(
    runRoomAssignment(input, params).section.assignments.map(
      ({ family_id: familyId, room_id: roomId }) => [familyId, roomId],
    ),
  )
  // fam_p takes the only exact fit it can use; fam_q falls to the inaccessible
  // room of the same size. Ordering fam_q first instead gives it rm_y and
  // pushes fam_p into rm_x.
  expect(rooms.get('fam_p')).toBe('rm_y')
  expect(rooms.get('fam_q')).toBe('rm_z')
})

/**
 * A repair vacates an occupant's room so an unplaced family can use it, then
 * finds the occupant somewhere else. "Somewhere else" has to exclude the room
 * just vacated — it is feasible for the occupant precisely because they were
 * removed from it, so an alternative search that admits it relocates the
 * occupant into the room it is simultaneously handing to the unplaced family,
 * and both end up there.
 *
 * No test covered that before, in either the current or the previous
 * implementation, so the capacity invariant is asserted here directly.
 */
test('a repaired occupant is relocated out of the room it vacated', () => {
  const priorityParams = { ...params, priority_trait: 'priority' }
  const priority = (familyId: string): FamilyRequirement => ({
    trait_key: 'priority',
    holder_id: familyId,
    capability_key: null,
    kind: 'profile-requirement',
    structural: null,
    value: 'high',
    strength: 'required',
    weight: 5,
    penalty: null,
    set_seq: 1,
    family_id: familyId,
  })
  const accessible = (familyId: string): FamilyRequirement => ({
    trait_key: 'needs-accessible',
    holder_id: familyId,
    capability_key: 'accessible',
    kind: 'profile-requirement',
    structural: null,
    value: 'accessible',
    strength: 'required',
    weight: null,
    penalty: null,
    set_seq: 1,
    family_id: familyId,
  })

  // fam_a and fam_b outrank fam_need and take both accessible rooms, leaving it
  // unplaced with two candidates — so the forced pass cannot claim it early.
  const input: RoomAssignmentInput = {
    rooms: [room('rm_1', 1, 2, true), room('rm_2', 2, 2, true), room('rm_3', 3, 2, false)],
    families: [
      family('fam_a', 1, [priority('fam_a')]),
      family('fam_b', 2, [priority('fam_b')]),
      family('fam_need', 3, [accessible('fam_need')]),
    ],
    constraints: [],
    person_family: {
      fam_a_a: 'fam_a',
      fam_a_b: 'fam_a',
      fam_b_a: 'fam_b',
      fam_b_b: 'fam_b',
      fam_need_a: 'fam_need',
      fam_need_b: 'fam_need',
    },
  }

  const result = runRoomAssignment(input, priorityParams)
  const rooms = new Map(
    result.section.assignments.map(({ family_id: familyId, room_id: roomId }) => [
      familyId,
      roomId,
    ]),
  )

  expect(result.trace.filter(({ step }) => step === 'repair')).toHaveLength(2)
  expect(rooms.get('fam_need')).toBe('rm_1')
  // fam_a moved out of rm_1 entirely rather than staying in it.
  expect(rooms.get('fam_a')).toBe('rm_3')
  expect(rooms.get('fam_b')).toBe('rm_2')

  // The invariant the exclusion exists to protect.
  const demand = new Map(input.families.map((unit) => [unit.family_id, unit.bed_demand]))
  const occupancy = new Map<string, number>()
  for (const [familyId, roomId] of rooms)
    occupancy.set(roomId, (occupancy.get(roomId) ?? 0) + (demand.get(familyId) ?? 0))
  for (const candidate of input.rooms)
    expect(occupancy.get(candidate.id) ?? 0).toBeLessThanOrEqual(candidate.capacity)
})
