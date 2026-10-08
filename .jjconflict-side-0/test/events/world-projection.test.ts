import { describe, expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { projectFamilyWorld, projectSharedWorld } from '../../src/events/world.js'
import type { Event, JsonValue } from '../../src/events/types.js'

/**
 * Both projections resolve entity membership through indexes rather than by
 * scanning. These cases pin what membership means, so the faster lookups cannot
 * quietly widen or narrow what crosses the boundary.
 */
const config = luebben2027Profile.validation_view

function log(...entries: readonly (readonly [string, JsonValue])[]): Event[] {
  return entries.map(([type, payload], index) => ({
    seq: index + 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type,
    payload,
  }))
}

function family(id: string, name: string): readonly [string, JsonValue] {
  return [
    'FamilyInvited',
    { family_id: id, email: `${id}@example.test`, display_name: name, locale: 'de' },
  ]
}

function person(id: string, familyId: string): readonly [string, JsonValue] {
  return [
    'PersonAdded',
    {
      person_id: id,
      family_id: familyId,
      given_name: 'Ada',
      family_name: 'Test',
      age: 37,
      role: 'adult',
    },
  ]
}

function need(entityId: string, key: string, value: string): readonly [string, JsonValue] {
  return ['LabelSet', { entity_id: entityId, key, value, strength: 'required', note: null }]
}

const world = derive(
  log(
    family('fam_1', 'Eins'),
    family('fam_2', 'Zwei'),
    person('per_1', 'fam_1'),
    person('per_2', 'fam_2'),
    need('fam_1', 'needs-accessible', 'accessible'),
    need('fam_2', 'needs-ground-floor', 'ground-floor'),
    need('per_1', 'needs-ground-floor', 'ground-floor'),
    ['BuildingAdded', { building_id: 'bld_a', name: 'Haus A', sort_key: 1 }],
  ),
  config,
)

describe('world projections', () => {
  test('a family projection keeps only that family and its members', () => {
    const projected = projectFamilyWorld(world, 'fam_1')
    expect(projected.families.map((entity) => entity.id)).toEqual(['fam_1'])
    expect(projected.persons.map((entity) => entity.id)).toEqual(['per_1'])
    expect(projected.labels.every((label) => ['fam_1', 'per_1'].includes(label.entity_id))).toBe(
      true,
    )
  })

  test('a family projection keeps only resolved rows its own entities hold', () => {
    const projected = projectFamilyWorld(world, 'fam_1')
    expect(projected.requirements.map((requirement) => requirement.holder_id).sort()).toEqual([
      'fam_1',
      'per_1',
    ])
    expect(projected.requirements.some((requirement) => requirement.holder_id === 'fam_2')).toBe(
      false,
    )
  })

  test('an empty family id projects nothing rather than everything', () => {
    const projected = projectFamilyWorld(world, 'fam_absent')
    expect(projected.families).toEqual([])
    expect(projected.persons).toEqual([])
    expect(projected.labels).toEqual([])
    expect(projected.requirements).toEqual([])
  })

  test('the shared projection drops restricted labels and keeps ordinary ones', () => {
    const shared = projectSharedWorld(world)
    expect(shared.labels.every((label) => label.sensitivity === 'normal')).toBe(true)
    expect(shared.requirements.map((requirement) => requirement.holder_id).sort()).toEqual([
      'fam_1',
      'fam_2',
      'per_1',
    ])
  })

  test('both projections leave the source world untouched', () => {
    const labelCount = world.labels.length
    const requirementCount = world.requirements.length
    projectFamilyWorld(world, 'fam_1')
    projectSharedWorld(world)
    expect(world.labels).toHaveLength(labelCount)
    expect(world.requirements).toHaveLength(requirementCount)
  })
})
