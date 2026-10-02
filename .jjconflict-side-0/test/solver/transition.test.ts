import { expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { diffPlans, deriveTransition } from '../../src/solver/transition.js'
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

test('derives before and after plans from event prefixes', () => {
  const config = {
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  }
  const transition = deriveTransition([], [], composeSolverContributions(activeProfile), config)
  expect(transition.before.meta.input_seq).toBe(0)
  expect(transition.after.meta.input_seq).toBe(0)
  expect(transition.diff.changes).toEqual([])
})

test('reports placement removals and additions', () => {
  expect(
    diffPlans(plan([{ person_id: 'per_a', room_id: 'rm_a', place_id: 'plc_a' }]), plan([]))
      .changes[0],
  ).toEqual({
    kind: 'room-changed',
    subject: 'per_a',
    before: 'rm_a',
    after: undefined,
    reason: 'placement removed',
  })
  expect(
    diffPlans(plan([]), plan([{ person_id: 'per_a', room_id: 'rm_a', place_id: 'plc_a' }]))
      .changes[0],
  ).toEqual({
    kind: 'room-changed',
    subject: 'per_a',
    before: undefined,
    after: 'rm_a',
    reason: 'placement changed',
  })
})
