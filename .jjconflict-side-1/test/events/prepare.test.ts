import { expect, test } from 'vitest'
import { prepareEventBatch } from '../../src/events/prepare.js'
import type { EventDraft } from '../../src/events/store.js'

const draft = (type: string, payload: EventDraft['payload']): EventDraft => ({
  at: '2027-01-01T00:00:00Z',
  actor: 'organiser@example.test',
  subject: null,
  type,
  payload,
})

test('prepares and validates a complete prospective event stream', () => {
  const events = prepareEventBatch(
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
        birthdate: null,
        role: 'adult',
      }),
    ],
  )

  expect(events.map(({ seq }) => seq)).toEqual([1, 2])
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
          birthdate: null,
          role: 'adult',
        }),
      ],
    ),
  ).toThrow(/unknown family/)
})
