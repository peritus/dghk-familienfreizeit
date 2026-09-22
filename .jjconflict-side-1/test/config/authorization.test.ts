import { describe, expect, test } from 'vitest'
import { canAppendEvent } from '../../src/auth/authorization.js'
import { derive } from '../../src/events/fold.js'
import type { Event } from '../../src/events/types.js'

const events: Event[] = [
  {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'FamilyInvited',
    payload: { family_id: 'fam_1', email: 'a@test.invalid', display_name: 'A', locale: 'de' },
  },
]

const family = { kind: 'family' as const, email: 'a@test.invalid', family_id: 'fam_1' }
const organiser = { kind: 'organiser' as const, email: 'org@test.invalid' }

const labelSet: Event = {
  seq: 2,
  at: '2027-01-01T00:00:01Z',
  actor: 'a@test.invalid',
  subject: null,
  type: 'LabelSet',
  payload: { entity_id: 'fam_1', key: 'flag', value: true, strength: null, note: null },
}

describe('event append authorization', () => {
  test('an organiser may LabelSet any key regardless of family_writable', () => {
    const world = derive(events)
    expect(canAppendEvent(organiser, labelSet, world, {})).toBe(true)
  })

  test('a family may LabelSet a key its own trait declares family_writable', () => {
    const world = derive(events)
    const config = { label_schemas: [{ key: 'flag', family_writable: true }] }
    expect(canAppendEvent(family, labelSet, world, config)).toBe(true)
  })

  test('a family may not LabelSet a key that is not declared family_writable', () => {
    const world = derive(events)
    expect(canAppendEvent(family, labelSet, world, {})).toBe(false)
    const config = { label_schemas: [{ key: 'flag', family_writable: false }] }
    expect(canAppendEvent(family, labelSet, world, config)).toBe(false)
  })

  test('family_writable does not bypass entity ownership', () => {
    const world = derive(events)
    const config = { label_schemas: [{ key: 'flag', family_writable: true }] }
    const otherFamilysLabel: Event = {
      ...labelSet,
      payload: { ...labelSet.payload, entity_id: 'fam_2' },
    }
    expect(canAppendEvent(family, otherFamilysLabel, world, config)).toBe(false)
  })
})
