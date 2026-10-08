import { expect, test } from 'vitest'
import { derive } from '../../src/events/fold.js'
import { prepareEventBatch } from '../../src/events/prepare.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import type { EventDraft } from '../../src/events/store.js'

const draft = (type: string, payload: EventDraft['payload']): EventDraft => ({
  at: '2027-01-01T00:00:00Z',
  actor: 'organiser@example.test',
  subject: null,
  type,
  payload,
})

test('prepares and validates a complete prospective event stream', () => {
  const { events, world } = prepareEventBatch(
    [],
    [
      draft('FamilyInvited', {
        family_id: 'fam_1',
        email: 'family@example.test',
        display_name: 'Family One',
        locale: 'de',
      }),
      draft('PersonAdded', {
        person_id: 'per_1',
        family_id: 'fam_1',
        given_name: 'Ada',
        family_name: 'One',
        age: null,
        role: 'adult',
      }),
    ],
  )

  expect(events.map(({ seq }) => seq)).toEqual([1, 2])

  // The append handler serves this world as the result of the batch instead of
  // folding the same events again, so it has to be the world those events
  // produce — not merely a world.
  expect(world).toEqual(derive(events))
  expect(world.head_seq).toBe(2)
})

test('prepares a selected-profile module event through the composed schemas', () => {
  expect(() =>
    prepareEventBatch(
      [],
      [draft('BuildingAdded', { building_id: 'bld_test', name: 'Test', sort_key: 1 })],
      luebben2027Profile.validation_view,
    ),
  ).not.toThrow()
})

test('rejects a batch whose prospective replay is invalid', () => {
  expect(() =>
    prepareEventBatch(
      [],
      [
        draft('PersonAdded', {
          person_id: 'per_1',
          family_id: 'fam_missing',
          given_name: 'Ada',
          family_name: 'One',
          age: null,
          role: 'adult',
        }),
      ],
    ),
  ).toThrow(/unknown family/)
})

test('rejects a batch that leaves a resolver reference dangling', () => {
  expect(() =>
    prepareEventBatch(
      [],
      [
        draft('FamilyInvited', {
          family_id: 'fam_1',
          email: 'family@example.test',
          display_name: 'Family One',
          locale: 'de',
        }),
        draft('LabelSet', {
          entity_id: 'fam_1',
          key: 'separates-from',
          value: 'fam_missing',
          strength: 'required',
          note: null,
        }),
      ],
    ),
  ).toThrow(/append rejected: kernel\.dangling-reference/)
})

test('accepts a same-batch-created resolver reference', () => {
  expect(() =>
    prepareEventBatch(
      [],
      [
        draft('FamilyInvited', {
          family_id: 'fam_1',
          email: 'family@example.test',
          display_name: 'Family One',
          locale: 'de',
        }),
        draft('FamilyInvited', {
          family_id: 'fam_2',
          email: 'family-two@example.test',
          display_name: 'Family Two',
          locale: 'de',
        }),
        draft('LabelSet', {
          entity_id: 'fam_1',
          key: 'separates-from',
          value: 'fam_2',
          strength: 'required',
          note: null,
        }),
      ],
    ),
  ).not.toThrow()
})
