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
