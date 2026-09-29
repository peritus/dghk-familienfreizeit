import { expect, test } from 'vitest'
import { diffPlans } from '../../src/solver/transition.js'
import type { Plan } from '../../src/solver/types.js'

const plan = (assignments: readonly object[]): Plan => ({
  meta: {
    input_seq: 0,
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-01-01',
  },
  preflight: [],
  sections: { 'room-assignment': { assignments } },
  trace: [],
})

test('diffs room and place changes with named reasons', () => {
  expect(
    diffPlans(
      plan([{ person_id: 'per_a', room_id: 'rm_a', place_id: 'plc_a' }]),
      plan([{ person_id: 'per_a', room_id: 'rm_b', place_id: 'plc_b' }]),
    ),
  ).toEqual({
    changes: [
      {
        kind: 'room-changed',
        subject: 'per_a',
        before: 'rm_a',
        after: 'rm_b',
        reason: 'placement changed',
      },
    ],
  })
  expect(
    diffPlans(
      plan([{ person_id: 'per_a', room_id: 'rm_a', place_id: 'plc_a' }]),
      plan([{ person_id: 'per_a', room_id: 'rm_a', place_id: 'plc_b' }]),
    ).changes[0],
  ).toMatchObject({ kind: 'place-changed', subject: 'per_a' })
})
