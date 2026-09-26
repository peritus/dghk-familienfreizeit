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
import { roomAssignment, runRoomAssignment } from '../../src/modules/room-assignment/index.js'
import { roomInventory } from '../../src/modules/room-inventory/index.js'

const profile = defineOccasionProfile({
  meta: {
    id: 'm6-test',
    name: 'M6 test',
    description: 'M6 test',
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

const fixture = readFileSync(new URL('../fixtures/m6/room-assignment.kdl', import.meta.url), 'utf8')
const contributions = profile.modules.find(({ id }) => id === 'room-assignment')!.contributions
const config = {
  build_revision: 'm6-test',
  compatibility_revision: 1,
  event_date: '2027-04-30',
  profile,
  seed: null,
}

function plan() {
  const world = derive(loadKdl(fixture, profile.validation_view), profile.validation_view)
  return solve(buildSolverInput(world, contributions), contributions, config)
}

describe('room assignment M6 business logic', () => {
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
    const first = runRoomAssignment(input as never, {
      weights: { exact_fit: 10, near_fit: 4, orphan_bed: -8 },
      keep_apart_trait: 'apart-from',
      no_bed_trait: 'does-not-need-a-bed',
      priority_trait: 'needs-accessible',
      scarce_capabilities: { accessible: -3 },
      max_repair_passes: 2,
    })
    const retained = runRoomAssignment(
      input as never,
      {
        weights: { exact_fit: 10, near_fit: 4, orphan_bed: -8 },
        keep_apart_trait: 'apart-from',
        no_bed_trait: 'does-not-need-a-bed',
        priority_trait: 'needs-accessible',
        scarce_capabilities: { accessible: -3 },
        max_repair_passes: 2,
      },
      first.section,
    )
    expect(retained.trace.filter(({ step }) => step === 'retain')).toHaveLength(2)
  })
})
