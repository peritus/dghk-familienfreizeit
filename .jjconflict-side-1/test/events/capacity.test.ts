import { expect, test } from 'vitest'
import {
  assessCapacity,
  capacityGroups,
  calculationBudgets,
} from '../../src/performance/capacity.js'
import type { PerformanceRun } from '../../src/performance/results.js'

const run = (families: number, ms: number): PerformanceRun => ({
  schema_version: 1,
  run_id: String(families),
  at: '2027-01-01T00:00:00Z',
  revision: { change_id: 'test', commit_id: 'same', parent_commit_id: '' },
  environment: { machine: 'one', runtime: 'node', platform: 'linux', arch: 'arm64' },
  workload: 'luebben2027-lifecycle-computation-v1:normal',
  shape: { families, events: families * 60, seed: 2027 },
  timings: [{ operation: 'organiser.edit', median_ms: ms / 2, p95_ms: ms, samples: 7 }],
  output_hash: 'same',
  status: 'complete',
  observations: {
    unplaced_families: 0,
    shortfall_places: 0,
    unscheduled_workshops: 0,
    underassigned_people: 0,
  },
})

test('capacity uses p95 and complete allocation; missing, partial and low-sample rows are incomplete', () => {
  expect(assessCapacity(run(50, 500), calculationBudgets).supported).toBe(true)
  expect(assessCapacity(run(50, 501), calculationBudgets).latency).toBe('fail')
  expect(assessCapacity({ ...run(50, 10), status: 'partial' }, calculationBudgets).latency).toBe(
    'incomplete',
  )
  expect(assessCapacity({ ...run(50, 10), timings: [] }, calculationBudgets).latency).toBe(
    'incomplete',
  )
  expect(
    assessCapacity(
      {
        ...run(50, 10),
        timings: [{ operation: 'organiser.edit', median_ms: 10, p95_ms: 10, samples: 1 }],
      },
      calculationBudgets,
    ).latency,
  ).toBe('incomplete')
  expect(
    assessCapacity(
      { ...run(50, 10), observations: { ...run(50, 10).observations, unplaced_families: 1 } },
      calculationBudgets,
    ).supported,
  ).toBe(false)
  expect(
    assessCapacity({ ...run(50, 10), observations: undefined }, calculationBudgets).allocation,
  ).toBe('unknown')
  expect(assessCapacity({ ...run(50, 10), observations: {} }, calculationBudgets).allocation).toBe(
    'unknown',
  )
  expect(() => assessCapacity(run(50, 10), { 'organiser.edit': NaN })).toThrow()
})

test('capacity bounds use the tested passing prefix, preserve later failures, and suggest refinement', () => {
  const [group] = capacityGroups(
    [run(50, 100), run(100, 300), run(200, 600), run(300, 400)],
    calculationBudgets,
  )
  expect(group!.through!.run.shape.families).toBe(100)
  expect(group!.boundary!.run.shape.families).toBe(200)
  expect(group!.next_families).toBe(150)
  expect(group!.rows).toHaveLength(4)
  expect(capacityGroups([run(50, 100)], calculationBudgets)[0]!.boundary).toBeNull()
})

test('capacity comparisons separate source, runtime, fixture, seed and repeat observations', () => {
  const first = run(50, 100)
  expect(
    capacityGroups(
      [
        first,
        { ...first, environment: { ...first.environment, runtime: 'other' } },
        { ...first, revision: { ...first.revision, commit_id: 'other' } },
        { ...first, shape: { ...first.shape, seed: 42 } },
        { ...first, workload: 'luebben2027-lifecycle-computation-v1:contention' },
      ],
      calculationBudgets,
    ),
  ).toHaveLength(5)
  expect(capacityGroups([first, run(50, 600)], calculationBudgets)[0]!.rows).toHaveLength(1)
})
