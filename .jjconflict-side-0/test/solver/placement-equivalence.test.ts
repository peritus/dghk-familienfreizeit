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
 * A whole plan, digested. The placement stage must not change a single
 * assignment, score, rejection or trace entry without an explicit intent.
 */
/**
 * This digest includes the current workshop allocation round snapshots and
 * trace contract. A change to this value means the solver now decides
 * something different or its explicit explanation contract changed — update it
 * only with that intent.
 */
const baselineDigest = 'd95045f55764d135475904b6a3effcc08833dd3a7cfb6cf90a90e1a5a4ce05cd'

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
  const plan = solve(buildSolverInput(world, contributions), contributions, solverConfig)
  const digest = createHash('sha256')
    .update(
      canonicalJson({
        ...plan,
        preflight: plan.preflight.map(({ evidence: _evidence, ...finding }) => finding),
      } as unknown as JsonValue),
    )
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
