import { describe, expect, test } from 'vitest'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { canonicalEmail, type Event } from '../../src/events/types.js'

const events: Event[] = [
  {
    seq: 1,
    at: '2026-01-01T00:00:00.000Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'FamilyInvited',
    payload: {
      family_id: 'fam_1',
      email: ' Family@Example.test ',
      display_name: 'Family One',
      locale: 'de',
    },
  },
  {
    seq: 2,
    at: '2026-01-01T00:00:01.000Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'PersonAdded',
    payload: {
      person_id: 'per_1',
      family_id: 'fam_1',
      given_name: 'Ada',
      family_name: 'Example',
      birthdate: null,
      role: 'adult',
    },
  },
]

describe('event kernel', () => {
  test('folds identity events into typed entities and labels', () => {
    const world = derive(events)
    expect(world.families).toHaveLength(1)
    expect(world.persons[0]?.id).toBe('per_1')
    expect(world.labels.find((label) => label.key === 'email')?.value).toBe('family@example.test')
  })
  test('canonicalizes email identity without provider-specific rewriting', () => {
    expect(canonicalEmail(' E\u0301XAMPLE@Example.Test ')).toBe('éxample@example.test')
    expect(canonicalEmail('first.last+tag@example.test')).toBe('first.last+tag@example.test')
  })
  test('loads restricted KDL and rejects duplicate properties', () => {
    const loaded = loadKdl(
      'FamilyInvited family_id=fam_1 email="family@example.test" display_name="Family One" locale=de\nPersonAdded person_id=per_1 family_id=fam_1 given_name=Ada family_name=Example birthdate=#null role=adult',
    )
    expect(loaded).toHaveLength(2)
    expect(() =>
      loadKdl(
        'FamilyInvited family_id=fam_1 family_id=fam_2 email="a@example.test" display_name=A locale=de',
      ),
    ).toThrow(/duplicate property/)
  })
  test('rejects stale or duplicate identities during replay', () => {
    expect(() => derive([{ ...events[0]!, seq: 2 }, events[1]!])).toThrow(/sequence gap/)
    expect(() => derive([...events, { ...events[0]!, seq: 3 }])).toThrow(/family already exists/)
  })
})
