import { describe, expect, test } from 'vitest'
import { familienfreizeit2027Profile } from '../../src/config/profiles/familienfreizeit-2027.js'
import { derive } from '../../src/events/fold.js'
import { canonicalJson } from '../../src/events/types.js'
import { buildSolverInput } from '../../src/solver/input.js'
import type { Event, JsonValue } from '../../src/events/types.js'

/**
 * `buildSolverInput` sorts labels on a canonical form of each value, computed
 * once per label instead of inside the comparator. The ordering is part of the
 * solver's determinism contract, so it is pinned here: a value's canonical form
 * orders it, not its author's key order and not its insertion order.
 */
const config = familienfreizeit2027Profile.validation_view

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

function workshop(id: string, sortKey: number): readonly [string, JsonValue] {
  return [
    'WorkshopAdded',
    {
      workshop_id: id,
      title: `Workshop ${id}`,
      description: 'Beschreibung',
      audience: 'all',
      age_min: 6,
      age_max: 99,
      capacity: 10,
      participation_mode: 'assigned',
      leader_ids: [],
      needs: [],
      sort_key: sortKey,
    },
  ]
}

function choice(personId: string, value: JsonValue): readonly [string, JsonValue] {
  return [
    'LabelSet',
    { entity_id: personId, key: 'prefers-workshop', value, strength: null, note: null },
  ]
}

const family = [
  'FamilyInvited',
  { family_id: 'fam_1', email: 'f1@example.test', display_name: 'Eins', locale: 'de' },
] as const

function person(id: string): readonly [string, JsonValue] {
  return [
    'PersonAdded',
    {
      person_id: id,
      family_id: 'fam_1',
      given_name: 'Ada',
      family_name: 'Eins',
      birthdate: '2015-01-01',
      role: 'child',
    },
  ]
}

describe('solver input label ordering', () => {
  test('repeatable labels order by the canonical form of their value', () => {
    const world = derive(
      log(
        family,
        person('per_1'),
        workshop('wks_1', 1),
        workshop('wks_2', 2),
        // Deliberately not in sorted order, and the first value's own keys are
        // written back-to-front relative to the others.
        choice('per_1', { rank: 2, workshop_id: 'wks_1' }),
        choice('per_1', { workshop_id: 'wks_2', rank: 1 }),
        choice('per_1', { workshop_id: 'wks_1', rank: 1 }),
      ),
      config,
    )

    const choices = buildSolverInput(world)
      .labels.filter((label) => label.key === 'prefers-workshop')
      .map((label) => canonicalJson(label.value))

    expect(choices).toEqual([
      '{"rank":1,"workshop_id":"wks_1"}',
      '{"rank":1,"workshop_id":"wks_2"}',
      '{"rank":2,"workshop_id":"wks_1"}',
    ])
  })

  test('entity then key take precedence over the value', () => {
    const world = derive(
      log(
        family,
        person('per_2'),
        person('per_1'),
        workshop('wks_1', 1),
        choice('per_2', { workshop_id: 'wks_1', rank: 1 }),
        choice('per_1', { workshop_id: 'wks_1', rank: 9 }),
      ),
      config,
    )

    const ordered = buildSolverInput(world)
      .labels.filter((label) => label.key === 'prefers-workshop')
      .map((label) => label.entity_id)

    expect(ordered).toEqual(['per_1', 'per_2'])
  })

  test('the sort does not depend on the order labels were folded in', () => {
    const forwards = derive(
      log(
        family,
        person('per_1'),
        workshop('wks_1', 1),
        workshop('wks_2', 2),
        choice('per_1', { workshop_id: 'wks_1', rank: 1 }),
        choice('per_1', { workshop_id: 'wks_2', rank: 2 }),
      ),
      config,
    )
    const backwards = derive(
      log(
        family,
        person('per_1'),
        workshop('wks_1', 1),
        workshop('wks_2', 2),
        choice('per_1', { workshop_id: 'wks_2', rank: 2 }),
        choice('per_1', { workshop_id: 'wks_1', rank: 1 }),
      ),
      config,
    )

    const canonical = (world: ReturnType<typeof derive>): readonly string[] =>
      buildSolverInput(world)
        .labels.filter((label) => label.key === 'prefers-workshop')
        .map((label) => canonicalJson(label.value))

    expect(canonical(forwards)).toEqual(canonical(backwards))
  })
})
