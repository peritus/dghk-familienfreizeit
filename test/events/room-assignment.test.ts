import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  capability,
  defineOccasionProfile,
  enumOf,
  property,
  relation,
  requirement,
  decimal,
} from '../../src/config/define.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { buildSolverInput, solve } from '../../src/solver/index.js'
import {
  assignRoomPlaces,
  roomAssignment,
  roomAssignmentPreflight,
  roomAssignmentRules,
  roomFeasibility,
  runRoomAssignment,
  type FamilyPlacementUnit,
  type FamilyRequirement,
  type RoomAssignmentInput,
  type RoomCandidate,
} from '../../src/modules/room-assignment/index.js'
import type { SolverInput } from '../../src/solver/types.js'
import { roomInventory } from '../../src/modules/room-inventory/index.js'

const profile = defineOccasionProfile({
  meta: {
    id: 'room-assignment-test',
    name: 'Room assignment test',
    description: 'Room assignment test',
    starts_on: '2027-04-30',
    ends_on: '2027-05-02',
    timezone: 'Europe/Berlin',
    locale: 'de',
    fallback_locale: 'en',
    public_landing: {
      heading: 'Test',
      intro: 'Test',
      actions: [
        {
          id: 'login',
          label: 'Anmelden',
          emphasis: 'primary',
          destination: { kind: 'route', to: '/login' },
        },
      ],
    },
  },
  traits: {
    role: property({ title: 'Role', scopes: ['person'], value: enumOf(['adult']) }),
    sanitary: property({
      title: 'Sanitary',
      scopes: ['room'],
      value: enumOf(['private', 'shared-floor']),
      cardinality: 'exactly-one',
    }),
    'price-per-bed-eur': property({
      title: 'Price',
      scopes: ['room'],
      value: decimal({ scale: 2 }),
      cardinality: 'exactly-one',
    }),
    'is-accessible': property({
      title: 'Accessible',
      scopes: ['room'],
      value: { kind: 'bool' },
      default: false,
    }),
    accessible: capability({
      title: 'Accessible',
      scopes: ['room'],
      value: enumOf(['yes']),
      derive: (room) => room.label('is-accessible') === true,
    }),
    'private-sanitary': capability({
      title: 'Private sanitary facilities',
      scopes: ['room'],
      value: enumOf(['private-sanitary']),
      derive: (room) => room.label('sanitary') === 'private',
    }),
    'needs-private-sanitary': requirement({
      title: 'Private sanitary facilities',
      scopes: ['family'],
      value: enumOf(['private-sanitary']),
      satisfied_by: 'private-sanitary',
      strengths: ['required', 'preferred'],
      weight: 6,
      penalty: -2,
    }),
    'sole-occupancy': requirement({
      title: 'Sole occupancy',
      scopes: ['family'],
      value: enumOf(['no-other-families']),
      structural: 'no-other-families',
      strengths: ['required', 'preferred'],
      penalty: -12,
    }),
    'needs-accessible': requirement({
      title: 'Needs accessible',
      scopes: ['family'],
      value: enumOf(['accessible']),
      satisfied_by: 'accessible',
      strengths: ['required', 'preferred'],
      weight: 8,
      penalty: -2,
    }),
    'room-needs-accessible': requirement({
      title: 'Room needs accessible',
      scopes: ['room'],
      value: enumOf(['accessible']),
      satisfied_by: 'accessible',
      strengths: ['required'],
    }),
    'does-not-need-a-bed': property({
      title: 'No bed',
      scopes: ['person'],
      value: { kind: 'bool' },
      default: false,
    }),
    'apart-from': relation({
      title: 'Apart from',
      scopes: ['family'],
      target: ['family'],
      value: { kind: 'ref', entity_kind: 'family' },
      operator: 'separates-from',
      strengths: ['required', 'preferred'],
      penalty: -20,
    }),
  },
  modules: [
    roomInventory({
      floors: ['ground', 'first'],
      room_types: ['standard'],
      bed_types: ['single'],
      price_trait: 'price-per-bed-eur',
      copy: {
        floors: { ground: 'Ground', first: 'First' },
        room_types: { standard: 'Standard' },
        bed_types: { single: 'Single' },
      },
    }),
    roomAssignment({
      weights: { exact_fit: 10, near_fit: 4, orphan_bed: -8 },
      keep_apart_trait: 'apart-from',
      no_bed_trait: 'does-not-need-a-bed',
      priority_trait: 'needs-accessible',
      scarce_capabilities: { accessible: -3 },
    }),
  ],
})

const fixture = readFileSync(
  new URL('../fixtures/room-assignment/room-assignment.kdl', import.meta.url),
  'utf8',
)
const contributions = profile.modules.find(({ id }) => id === 'room-assignment')!.contributions
const config = {
  build_revision: 'room-assignment-test',
  compatibility_revision: 1,
  event_date: '2027-04-30',
  profile,
  seed: null,
}

function plan() {
  const world = derive(loadKdl(fixture, profile.validation_view), profile.validation_view)
  return solve(buildSolverInput(world, contributions), contributions, config)
}

const params = {
  weights: { exact_fit: 10, near_fit: 4, orphan_bed: -8 },
  keep_apart_trait: 'apart-from',
  no_bed_trait: 'does-not-need-a-bed',
  priority_trait: 'needs-accessible',
  scarce_capabilities: { accessible: -3 },
} as const

function room(id: string, capacity: number, capabilities: readonly string[] = []): RoomCandidate {
  return {
    id,
    sort_key: Number(id.slice(-1)) || 1,
    place_ids: Object.freeze(
      Array.from({ length: capacity }, (_, index) => `${id}-place-${index}`),
    ),
    capacity,
    capabilities: Object.freeze(new Set(capabilities)),
    room_type: 'standard',
  }
}

function family(
  familyId: string,
  bedDemand: number,
  requirements: readonly FamilyRequirement[] = [],
): FamilyPlacementUnit {
  return {
    family_id: familyId,
    sort_key: Number(familyId.slice(-1)) || 1,
    person_ids: Object.freeze(
      Array.from({ length: bedDemand }, (_, index) => `${familyId}-person-${index}`),
    ),
    bed_person_ids: Object.freeze(
      Array.from({ length: bedDemand }, (_, index) => `${familyId}-person-${index}`),
    ),
    bed_demand: bedDemand,
    requirements: Object.freeze(requirements),
  }
}

function familyRequirement(
  familyId: string,
  overrides: Partial<FamilyRequirement> = {},
): FamilyRequirement {
  return {
    trait_key: 'needs',
    holder_id: familyId,
    capability_key: null,
    kind: 'generic-needs',
    structural: null,
    value: null,
    strength: null,
    weight: null,
    penalty: null,
    set_seq: 1,
    family_id: familyId,
    ...overrides,
  }
}

function assignmentInput(
  rooms: readonly RoomCandidate[],
  families: readonly FamilyPlacementUnit[],
  constraints: RoomAssignmentInput['constraints'] = [],
  fixed_assignments: RoomAssignmentInput['fixed_assignments'] = [],
  room_constraints: RoomAssignmentInput['room_constraints'] = [],
): RoomAssignmentInput {
  return { rooms, families, constraints, person_family: {}, fixed_assignments, room_constraints }
}

describe('room assignment business logic', () => {
  test('derives KDL and deterministically places the accessible family first', () => {
    const first = plan()
    const second = plan()
    expect(first).toEqual(second)
    const section = first.sections['room-assignment'] as {
      assignments: readonly unknown[]
      unplaced: readonly unknown[]
    }
    expect(section.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ family_id: 'fam_access', room_id: 'rm_access' }),
        expect.objectContaining({ family_id: 'fam_open', room_id: 'rm_open' }),
      ]),
    )
    expect(section.unplaced).toEqual([])
    expect(first.trace.some(({ text }) => text.includes('fam_access'))).toBe(true)
  })

  test('leaves a blocked family unplaced instead of moving an existing family', () => {
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
    const result = runRoomAssignment(
      assignmentInput(
        [room('rm_1', 2, ['accessible']), room('rm_2', 2, ['accessible']), room('rm_3', 2)],
        [
          family('fam_a', 2, [accessible('fam_a')]),
          family('fam_b', 2, [accessible('fam_b')]),
          family('fam_need', 2, [accessible('fam_need')]),
        ],
      ),
      params,
    )

    expect(result.section.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ family_id: 'fam_a', room_id: 'rm_1' }),
        expect.objectContaining({ family_id: 'fam_b', room_id: 'rm_2' }),
      ]),
    )
    expect(result.section.unplaced.map(({ family_id: familyId }) => familyId)).toEqual(['fam_need'])
    expect(result.trace.some(({ step }) => step === 'repair')).toBe(false)
  })

  test('is invariant under room and family input permutations', () => {
    const rooms = [room('rm_1', 2, ['accessible']), room('rm_2', 2), room('rm_3', 2)]
    const families = [
      family('fam_1', 2, [
        familyRequirement('fam_1', {
          capability_key: 'accessible',
          strength: 'required',
        }),
      ]),
      family('fam_2', 1),
      family('fam_3', 1),
    ]
    const expected = runRoomAssignment(assignmentInput(rooms, families), params)

    for (let seed = 0; seed < 20; seed += 1) {
      const shuffledRooms =
        seed % 2 === 0 ? [...rooms].reverse() : [rooms[1]!, rooms[2]!, rooms[0]!]
      const shuffledFamilies =
        seed % 2 === 0 ? [...families].reverse() : [families[1]!, families[2]!, families[0]!]
      expect(runRoomAssignment(assignmentInput(shuffledRooms, shuffledFamilies), params)).toEqual(
        expected,
      )
    }
  })

  test('recomputes all placements from the current room configuration', () => {
    const beforeInput = assignmentInput(
      [room('rm_1', 2, ['accessible']), room('rm_2', 2), room('rm_3', 2)],
      [
        family('fam_1', 2, [
          familyRequirement('fam_1', { capability_key: 'accessible', strength: 'required' }),
        ]),
        family('fam_2', 1),
      ],
    )
    const before = runRoomAssignment(beforeInput, params)
    const afterInput = assignmentInput(
      [room('rm_1', 2), room('rm_2', 2), room('rm_3', 2, ['accessible'])],
      beforeInput.families,
    )
    const after = runRoomAssignment(afterInput, params)

    expect(before.section.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ family_id: 'fam_1', room_id: 'rm_1' }),
        expect.objectContaining({ family_id: 'fam_2', room_id: 'rm_2' }),
      ]),
    )
    expect(after.section.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ family_id: 'fam_1', room_id: 'rm_3' }),
        expect.objectContaining({ family_id: 'fam_2', room_id: 'rm_1' }),
      ]),
    )
    expect(after.trace.filter(({ subject }) => subject === 'fam_2')).toHaveLength(1)
    expect(after.trace.find(({ subject }) => subject === 'fam_1')?.step).toBe('forced')
  })

  test('exposes normalized profile requirements and scoring terms', () => {
    const world = derive(loadKdl(fixture, profile.validation_view), profile.validation_view)
    expect(world.requirements).toContainEqual(
      expect.objectContaining({
        holder_id: 'fam_access',
        trait_key: 'needs-accessible',
        capability_key: 'accessible',
        weight: 8,
      }),
    )
    expect(plan().trace).toContainEqual(
      expect.objectContaining({
        subject: 'fam_access',
        detail: expect.objectContaining({
          chosen: expect.objectContaining({ terms: expect.arrayContaining([['exact-fit', 10]]) }),
        }),
      }),
    )
  })

  test('keeps sole occupancy structural while matching an ensuite capability', () => {
    const events = loadKdl(
      `BuildingAdded building_id=bld_ensuite name="Ensuite House" sort_key=1
RoomAdded room_id=rm_ensuite building_id=bld_ensuite number="1" floor=ground room_type=standard sort_key=1
LabelSet entity_id=rm_ensuite key=sanitary value=private strength=#null note=#null
LabelSet entity_id=rm_ensuite key=price-per-bed-eur value=100 strength=#null note=#null
BedAdded bed_id=bed_ensuite room_id=rm_ensuite label="A" bed_type=single sleeps=1 sort_key=1
FamilyInvited family_id=fam_ensuite email="ensuite@example.test" display_name="Ensuite" locale=de
PersonAdded person_id=per_ensuite family_id=fam_ensuite given_name="Eli" family_name="Ensuite" age=#null role=adult
LabelSet entity_id=fam_ensuite key=needs-private-sanitary value=private-sanitary strength=required note=#null
LabelSet entity_id=fam_ensuite key=sole-occupancy value=no-other-families strength=required note=#null`,
      profile.validation_view,
    )
    const world = derive(events, profile.validation_view)
    expect(world.requirements).toContainEqual(
      expect.objectContaining({
        holder_id: 'fam_ensuite',
        trait_key: 'sole-occupancy',
        capability_key: null,
        kind: 'structural',
        structural: 'no-other-families',
      }),
    )

    const solved = solve(buildSolverInput(world, contributions), contributions, config)
    const section = solved.sections['room-assignment'] as {
      assignments: readonly { family_id: string; room_id: string }[]
      unplaced: readonly unknown[]
    }
    expect(section.assignments).toContainEqual(
      expect.objectContaining({ family_id: 'fam_ensuite', room_id: 'rm_ensuite' }),
    )
    expect(section.unplaced).toEqual([])
    expect(solved.preflight).toEqual([])
  })

  test('keeps fixed assignments ahead of automatic placement and reports violations', () => {
    const result = runRoomAssignment(
      assignmentInput(
        [room('rm_small', 1), room('rm_open', 3)],
        [family('fam_fixed', 2), family('fam_other', 1)],
        [],
        [
          { family_id: 'fam_fixed', room_id: 'rm_small' },
          { family_id: 'fam_missing', room_id: 'rm_small' },
        ],
      ),
      params,
    )
    expect(result.section.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ family_id: 'fam_fixed', room_id: 'rm_small' }),
      ]),
    )
    expect(result.section.unplaced).toEqual([])
    expect(result.section.fixed_violations).toEqual([
      expect.objectContaining({
        family_id: 'fam_fixed',
        room_id: 'rm_small',
        reasons: ['hard.capacity'],
        unplaced_person_ids: ['fam_fixed-person-1'],
      }),
    ])
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ check: 'room-assignment.fixed-invalid' }),
    ])
  })

  test('reports an unavailable fixed room and all bed-needing people', () => {
    const result = runRoomAssignment(
      assignmentInput(
        [room('rm_open', 2)],
        [family('fam_fixed', 2)],
        [],
        [{ family_id: 'fam_fixed', room_id: 'rm_removed' }],
      ),
      params,
    )
    expect(result.trace).toContainEqual(
      expect.objectContaining({ step: 'fixed-invalid', subject: 'fam_fixed' }),
    )
    expect(result.section.fixed_violations).toEqual([
      {
        family_id: 'fam_fixed',
        room_id: 'rm_removed',
        reasons: ['hard.room-unavailable'],
        unplaced_person_ids: ['fam_fixed-person-0', 'fam_fixed-person-1'],
      },
    ])
  })

  test('covers forced placement, normalized input filtering, and rule/preflight contracts', () => {
    const world = derive(loadKdl(fixture, profile.validation_view), profile.validation_view)
    const built = buildSolverInput(world, contributions)
    const input = built.module_inputs['room-assignment'] as RoomAssignmentInput
    expect(input.rooms.find(({ id }) => id === 'rm_access')?.room_type).toBe('standard')
    const forcedInput = assignmentInput(
      [room('rm_1', 2, ['accessible'])],
      [
        family('fam_1', 1, [
          familyRequirement('fam_1', { capability_key: 'accessible', strength: 'required' }),
        ]),
      ],
    )
    expect(runRoomAssignment(forcedInput, params).trace).toEqual(
      expect.arrayContaining([expect.objectContaining({ step: 'forced' })]),
    )

    const [capacityRule, traitRule] = roomAssignmentRules()
    expect(capacityRule.evaluate(family('fam_1', 2), room('rm_1', 1), forcedInput)).toBe(
      'infeasible',
    )
    expect(capacityRule.evaluate(family('fam_1', 1), room('rm_1', 1), forcedInput)).toBe(0)
    expect(traitRule.evaluate(family('fam_1', 1), room('rm_1', 1), forcedInput)).toBe(0)
    expect(
      traitRule.evaluate(
        family('fam_1', 1, [
          familyRequirement('fam_1', { capability_key: 'accessible', strength: 'required' }),
        ]),
        room('rm_1', 1),
        forcedInput,
      ),
    ).toBe('infeasible')
    expect(capacityRule.describe('x')).toBe('not enough free places')
    expect(traitRule.describe('x')).toBe('required requirement is not satisfied')

    const preflightInput = {
      module_inputs: {
        'room-assignment': assignmentInput(
          [room('rm_1', 1, ['available'])],
          [
            family('fam_1', 1, [
              familyRequirement('fam_1', { capability_key: 'missing', strength: 'required' }),
            ]),
            family('fam_2', 1, [
              familyRequirement('fam_2', {
                kind: 'structural',
                structural: 'no-other-families',
                capability_key: null,
                strength: 'required',
              }),
            ]),
            family('fam_3', 1, [
              familyRequirement('fam_3', { capability_key: 'available', strength: 'required' }),
            ]),
          ],
        ),
      },
    } as unknown as SolverInput
    expect(roomAssignmentPreflight(preflightInput)).toEqual([
      expect.objectContaining({ subjects: ['fam_1', 'needs'] }),
    ])
  })

  test('handles relations, exclusions, and preference scoring deterministically', () => {
    const target = family('fam_1', 1)
    const apart = family('fam_2', 1, [
      familyRequirement('fam_2', {
        trait_key: 'apart-from',
        kind: 'relation',
        value: 'fam_1',
        strength: 'required',
      }),
    ])
    const separated = runRoomAssignment(
      assignmentInput([room('rm_1', 2), room('rm_2', 2)], [target, apart]),
      params,
    )
    expect(separated.section.assignments).toEqual(
      expect.arrayContaining([expect.objectContaining({ family_id: 'fam_2', room_id: 'rm_2' })]),
    )

    const sole = runRoomAssignment(
      assignmentInput(
        [room('rm_1', 2)],
        [
          family('fam_1', 1),
          family('fam_2', 1, [
            familyRequirement('fam_2', {
              trait_key: 'sole-occupancy',
              kind: 'structural',
              structural: 'no-other-families',
              strength: 'required',
            }),
          ]),
        ],
      ),
      params,
    )
    expect(sole.section.unplaced[0]?.reason).toContain('hard.sole-occupancy')
    expect(
      sole.trace.find(({ step, subject }) => step === 'unplaceable' && subject === 'fam_2')?.detail
        ?.rejected,
    ).toContainEqual({ target: 'rm_1', rule: 'hard.sole-occupancy' })

    const occupancyFamily = family('fam_occupancy', 1, [
      familyRequirement('fam_occupancy', {
        kind: 'structural',
        structural: 'no-other-families',
        capability_key: null,
        strength: 'required',
      }),
    ])
    const occupancyInput = assignmentInput(
      [room('rm_1', 2)],
      [family('fam_existing', 1), occupancyFamily],
    )
    const alone = roomFeasibility(occupancyInput, params, [], 'fam_occupancy')[0]
    const occupied = roomFeasibility(
      occupancyInput,
      params,
      [
        {
          family_id: 'fam_existing',
          person_id: 'fam_existing-person-0',
          room_id: 'rm_1',
          place_id: 'rm_1-place-0',
        },
      ],
      'fam_occupancy',
    )[0]
    expect(alone?.structural_matches['no-other-families']).toBe(true)
    expect(alone?.capability_matches).not.toHaveProperty('no-other-families')
    expect(occupied?.structural_matches['no-other-families']).toBe(false)
    expect(occupied?.reasons).toContain('hard.sole-occupancy')

    const excluded = runRoomAssignment(
      assignmentInput(
        [room('rm_1', 1, ['blocked']), room('rm_2', 1)],
        [family('fam_1', 1)],
        [
          {
            key: 'excludes',
            holder_id: 'fam_1',
            value: 'blocked',
            strength: 'required',
            set_seq: 1,
          },
        ],
      ),
      params,
    )
    expect(excluded.section.unplaced).toEqual([])
    expect(excluded.section.assignments[0]?.room_id).toBe('rm_2')

    const preferred = runRoomAssignment(
      assignmentInput(
        [room('rm_1', 2, ['accessible']), room('rm_2', 2)],
        [
          family('fam_1', 1),
          family('fam_2', 1, [
            familyRequirement('fam_2', {
              trait_key: 'sole-occupancy',
              kind: 'structural',
              structural: 'no-other-families',
              strength: 'preferred',
              weight: 5,
              penalty: -4,
            }),
            familyRequirement('fam_2', {
              trait_key: 'apart-from',
              kind: 'relation',
              value: 'fam_1',
              strength: 'preferred',
              weight: 6,
              penalty: -6,
            }),
          ]),
        ],
      ),
      params,
    )
    expect(
      preferred.trace.some(({ detail }) =>
        detail?.chosen.terms.some(([key]) => key === 'near-fit'),
      ),
    ).toBe(true)
    expect(
      preferred.trace.some(({ detail }) =>
        detail?.chosen.terms.some(([key]) => key === 'orphan-bed'),
      ),
    ).toBe(true)
  })

  test('restricts multi-room decisions without silently pinning a provider', () => {
    const result = runRoomAssignment(
      assignmentInput(
        [room('rm_1', 1), room('rm_2', 1), room('rm_3', 1)],
        [family('fam_1', 1)],
        [],
        [],
        [{ family_id: 'fam_1', room_ids: ['rm_2', 'rm_3'] }],
      ),
      params,
    )
    expect(result.section.assignments[0]?.room_id).not.toBe('rm_1')
    expect(result.section.assignments[0]?.room_id).toBe('rm_2')
    expect(result.trace[0]?.detail).toEqual(
      expect.objectContaining({
        chosen: expect.objectContaining({ target: 'rm_2' }),
        rejected: [{ target: 'rm_1', rule: 'hard.room-decision' }],
      }),
    )
  })

  test('reports an unresolved room decision during preflight', () => {
    const input = {
      module_inputs: {
        'room-assignment': assignmentInput(
          [room('rm_1', 1)],
          [family('fam_1', 1)],
          [],
          [],
          [{ family_id: 'fam_1', room_ids: [] }],
        ),
      },
    } as unknown as SolverInput
    expect(roomAssignmentPreflight(input)).toEqual([
      expect.objectContaining({
        check: 'room-assignment.required-contradiction',
        subjects: ['fam_1'],
      }),
    ])
  })

  test('builds room decisions from every matching assigned provider', () => {
    const world = derive(
      loadKdl(
        `${fixture}
LabelSet entity_id=fam_access key=needs value=fam_access_room strength=required note=#null
LabelSet entity_id=rm_access key=provides value=fam_access_room strength=#null note=#null
LabelSet entity_id=rm_open key=provides value=fam_access_room strength=#null note=#null
LabelSet entity_id=fam_open key=provides value=fam_access_room strength=#null note=#null`,
        profile.validation_view,
      ),
      profile.validation_view,
    )
    const input = buildSolverInput(world, contributions).module_inputs['room-assignment'] as
      | RoomAssignmentInput
      | undefined
    expect(
      input?.families
        .find(({ family_id }) => family_id === 'fam_access')
        ?.requirements.some(({ value }) => value === 'fam_access_room'),
    ).toBe(false)
    expect(input?.room_constraints).toEqual([
      { family_id: 'fam_access', room_ids: ['rm_access', 'rm_open'] },
    ])
    expect(input?.fixed_assignments).toEqual([])
  })

  test('keeps two family pins on the same room', () => {
    const world = derive(
      loadKdl(
        `${fixture}
LabelSet entity_id=fam_access key=needs value=fam_access_room strength=required note=#null
LabelSet entity_id=rm_access key=provides value=fam_access_room strength=#null note=#null
LabelSet entity_id=fam_open key=needs value=fam_open_room strength=required note=#null
LabelSet entity_id=rm_access key=provides value=fam_open_room strength=#null note=#null`,
        profile.validation_view,
      ),
      profile.validation_view,
    )
    const input = buildSolverInput(world, contributions).module_inputs['room-assignment'] as
      | RoomAssignmentInput
      | undefined

    expect(input?.room_constraints).toEqual(
      expect.arrayContaining([
        { family_id: 'fam_access', room_ids: ['rm_access'] },
        { family_id: 'fam_open', room_ids: ['rm_access'] },
      ]),
    )
  })

  test('reports unplaced families and assigns no-bed people without places', () => {
    const impossible = runRoomAssignment(
      assignmentInput(
        [room('rm_1', 0)],
        [
          family('fam_1', 1, [
            familyRequirement('fam_1', { capability_key: 'missing', strength: 'required' }),
          ]),
        ],
      ),
      params,
    )
    expect(impossible.section.unplaced[0]?.reason).toContain('rejected')
    expect(impossible.diagnostics).toHaveLength(1)
    expect(
      assignRoomPlaces(
        [{ ...family('fam_1', 0), person_ids: ['fam_1-person-0'] }],
        new Map([['fam_1', 'missing-room']]),
        assignmentInput(
          [room('rm_1', 1)],
          [{ ...family('fam_1', 0), person_ids: ['fam_1-person-0'] }],
        ),
      ),
    ).toEqual([])
    expect(
      assignRoomPlaces(
        [{ ...family('fam_1', 0), person_ids: ['fam_1-person-0'] }],
        new Map([['fam_1', 'rm_1']]),
        assignmentInput(
          [room('rm_1', 1)],
          [{ ...family('fam_1', 0), person_ids: ['fam_1-person-0'] }],
        ),
      ),
    ).toEqual([expect.objectContaining({ family_id: 'fam_1', place_id: null })])

    const equallyImpossible = runRoomAssignment(
      assignmentInput([room('rm_1', 0), room('rm_2', 0)], [family('fam_equal', 1)]),
      params,
    )
    expect(equallyImpossible.section.unplaced[0]?.reason).toContain('Closest: rm_1')
  })

  test('reports arithmetic capacity and required room contradictions', () => {
    expect(
      roomAssignmentPreflight({
        module_inputs: {
          'room-assignment': assignmentInput([room('rm_1', 1)], [family('fam_capacity', 2)]),
        },
      } as unknown as SolverInput),
    ).toEqual([
      expect.objectContaining({
        check: 'room-assignment.requirement-arithmetic',
        subjects: ['fam_capacity'],
      }),
    ])

    expect(
      roomAssignmentPreflight({
        module_inputs: {
          'room-assignment': assignmentInput(
            [room('rm_1', 1)],
            [family('fam_contradiction', 1)],
            [
              {
                key: 'excludes',
                holder_id: 'fam_contradiction',
                value: 'rm_1',
                strength: 'required',
                set_seq: 1,
              },
            ],
          ),
        },
      } as unknown as SolverInput),
    ).toEqual([
      expect.objectContaining({
        check: 'room-assignment.required-contradiction',
        subjects: ['fam_contradiction'],
      }),
    ])
  })

  test('assigns beds to the actual bed-needing people in mixed families', () => {
    const mixed = {
      ...family('fam_mixed', 1),
      person_ids: ['fam_mixed-infant', 'fam_mixed-adult'],
      bed_person_ids: ['fam_mixed-adult'],
    }
    expect(
      assignRoomPlaces(
        [mixed],
        new Map([['fam_mixed', 'rm_1']]),
        assignmentInput([room('rm_1', 1)], [mixed]),
      ),
    ).toEqual([
      { family_id: 'fam_mixed', person_id: 'fam_mixed-infant', room_id: 'rm_1', place_id: null },
      {
        family_id: 'fam_mixed',
        person_id: 'fam_mixed-adult',
        room_id: 'rm_1',
        place_id: 'rm_1-place-0',
      },
    ])
  })
})
