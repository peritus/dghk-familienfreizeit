import { expect, test } from 'vitest'
import { compareFixedDecisions } from '../../src/solver/fixed-decision.js'

test('shared fixed-decision comparison explains same, overridden, absent, and invalid results', () => {
  expect(
    compareFixedDecisions(
      [
        { subject_id: 'person-a', target_id: 'workshop-same' },
        { subject_id: 'person-b', target_id: 'workshop-fixed' },
        { subject_id: 'person-c', target_id: 'workshop-invalid' },
        { subject_id: 'person-d', target_id: 'workshop-none' },
      ],
      [
        { subject_id: 'person-a', target_id: 'workshop-same' },
        { subject_id: 'person-b', target_id: 'workshop-other' },
      ],
      new Set(['person-c|workshop-invalid']),
    ),
  ).toEqual([
    {
      subject_id: 'person-a',
      fixed_target_id: 'workshop-same',
      automatic_target_ids: ['workshop-same'],
      status: 'same',
    },
    {
      subject_id: 'person-b',
      fixed_target_id: 'workshop-fixed',
      automatic_target_ids: ['workshop-other'],
      status: 'overrides',
    },
    {
      subject_id: 'person-c',
      fixed_target_id: 'workshop-invalid',
      automatic_target_ids: [],
      status: 'invalid',
    },
    {
      subject_id: 'person-d',
      fixed_target_id: 'workshop-none',
      automatic_target_ids: [],
      status: 'no-automatic',
    },
  ])
})
