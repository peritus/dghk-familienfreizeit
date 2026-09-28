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
      max_repair_passes: 2,
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
  max_repair_passes: 2,
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
): RoomAssignmentInput {
  return { rooms, families, constraints, person_family: {}, fixed_assignments }
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

  test('pure room assignment accepts a previous plan for retention', () => {
    const world = derive(loadKdl(fixture, profile.validation_view), profile.validation_view)
    const input = buildSolverInput(world, contributions).module_inputs['room-assignment']
    const first = runRoomAssignment(input as RoomAssignmentInput, params)
    const retained = runRoomAssignment(input as RoomAssignmentInput, params, first.section)
    expect(retained.trace.filter(({ step }) => step === 'retain')).toHaveLength(2)
  })

  test('keeps fixed assignments ahead of automatic placement and reports violations', () => {
    const result = runRoomAssignment(
      assignmentInput(
        [room('rm_small', 1), room('rm_open', 3)],
        [family('fam_fixed', 2), family('fam_other', 1)],
        [],
        [{ family_id: 'fam_fixed', room_id: 'rm_small' }],
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
      }),
    ])
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ check: 'room-assignment.fixed-invalid' }),
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

  test('handles relations, exclusions, preference scoring, and repair deterministically', () => {
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
    expect(sole.section.unplaced[0]?.reason).toContain('hard.trait-requirements')

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

    const repair = runRoomAssignment(
      assignmentInput(
        [room('rm_1', 1, ['required']), room('rm_2', 1)],
        [
          family('fam_1', 1),
          family('fam_2', 1, [
            familyRequirement('fam_2', { capability_key: 'required', strength: 'required' }),
          ]),
        ],
      ),
      params,
      {
        assignments: [
          { family_id: 'fam_1', person_id: 'fam_1-person-0', room_id: 'rm_1', place_id: null },
        ],
        unplaced: [],
      },
    )
    expect(repair.trace.filter(({ step }) => step === 'repair')).toHaveLength(2)

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
  })
})
