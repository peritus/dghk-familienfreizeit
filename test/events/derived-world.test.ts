import { expect, test } from 'vitest'
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
  {
    seq: 2,
    at: '2027-01-01T00:00:01Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'fam_1',
      key: 'needs',
      value: 'quiet-room',
      strength: 'required',
      note: null,
    },
  },
]

test('derives deterministic indexes and normalized resolver constraints', () => {
  const world = derive(events)
  expect(world.labels_by_entity.fam_1).toHaveLength(4)
  expect(world.labels_by_key.needs?.[0]?.value).toBe('quiet-room')
  expect(world.constraints).toEqual([
    { key: 'needs', holder_id: 'fam_1', value: 'quiet-room', strength: 'required', set_seq: 2 },
  ])
  expect(derive([...events].reverse().reverse())).toEqual(world)
})

test('retains a cleared label with cleared_seq instead of deleting it', () => {
  const clearByValue: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelCleared',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'quiet-room' },
  }
  const world = derive([...events, clearByValue])
  const cleared = world.labels.find(
    (label) => label.key === 'needs' && label.value === 'quiet-room',
  )
  expect(cleared?.cleared_seq).toBe(3)
  expect(cleared?.value_type).toBe('string')
  expect(world.labels_by_entity.fam_1).not.toContainEqual(cleared)
  expect(world.labels_by_key.needs).toBeUndefined()
  expect(world.constraints).toEqual([])
})

test('clears every value for a key when LabelCleared carries a null value', () => {
  const config = {
    label_schemas: [
      { key: 'needs', scopes: ['family'] as const, cardinality: 'zero-or-more' as const },
    ],
  }
  const secondNeed: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'garden-view', strength: null, note: null },
  }
  const clearAll: Event = {
    seq: 4,
    at: '2027-01-01T00:00:03Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelCleared',
    payload: { entity_id: 'fam_1', key: 'needs', value: null },
  }
  const world = derive([...events, secondNeed, clearAll], config)
  expect(world.labels_by_key.needs).toBeUndefined()
  expect(
    world.labels.filter((label) => label.key === 'needs' && label.cleared_seq === 4),
  ).toHaveLength(2)
})

test('rejects LabelSet/LabelCleared on setup-owned kernel keys', () => {
  const setEmail: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'fam_1',
      key: 'email',
      value: 'other@test.invalid',
      strength: null,
      note: null,
    },
  }
  expect(() => derive([...events, setEmail])).toThrow(/setup-owned/)
  const clearRole: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelCleared',
    payload: { entity_id: 'fam_1', key: 'display-name', value: null },
  }
  expect(() => derive([...events, clearRole])).toThrow(/setup-owned/)
})

test('enforces configured label scopes and replacement cardinality', () => {
  const config = {
    label_schemas: [
      { key: 'flag', scopes: ['family'] as const, cardinality: 'zero-or-one' as const },
    ],
  }
  expect(() =>
    derive(
      [
        {
          ...events[0],
          type: 'LabelSet',
          payload: { entity_id: 'fam_1', key: 'flag', value: true, strength: null, note: null },
        } as Event,
      ],
      config,
    ),
  ).toThrow(/sequence gap|unknown entity/)
})
