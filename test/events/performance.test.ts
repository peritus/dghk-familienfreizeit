import { expect, test } from 'vitest'
import { summarize, compareRuns, type PerformanceRun } from '../../src/performance/results.js'
import { chromeTrace, traceRecorder } from '../../src/performance/trace.js'

test('nested and failed computations retain timing and propagate their result or error', () => {
  let tick = 0
  const recorder = traceRecorder(() => tick++)
  expect(recorder.measure('outer', 50000, () => recorder.measure('inner', 50000, () => 7))).toBe(7)
  expect(() =>
    recorder.measure('failed', 50000, () => {
      throw new Error('bad')
    }),
  ).toThrow('bad')
  const trace = JSON.parse(chromeTrace(recorder.slices, 'bench'))
  expect(trace.traceEvents.filter((event: { ph: string }) => event.ph === 'X')).toEqual([
    expect.objectContaining({ name: 'outer', ts: 0, dur: 3000 }),
    expect.objectContaining({ name: 'inner', ts: 1000, dur: 1000 }),
    expect.objectContaining({ name: 'failed', args: { event_count: 50000, outcome: 'error' } }),
  ])
})

test('comparison excludes different machines, runtimes and workloads', () => {
  const run: PerformanceRun = {
    schema_version: 1,
    run_id: 'current',
    at: '',
    revision: { change_id: '', commit_id: '', parent_commit_id: '' },
    environment: { machine: 'one', platform: 'linux', arch: 'x64', runtime: 'v22' },
    workload: 'fixture-a',
    shape: { events: 50000 },
    output_hash: 'same',
    timings: [summarize('derive', [13, 15, 14])],
  }
  const previous = { ...run, run_id: 'previous', timings: [summarize('derive', [10])] }
  expect(
    compareRuns(run, [
      previous,
      { ...previous, workload: 'other' },
      { ...previous, environment: { ...run.environment, machine: 'two' } },
    ]),
  ).toEqual([
    { operation: 'derive', baseline_ms: 10, change: 0.3999999999999999, regression: true },
  ])
  expect(() => summarize('derive', [])).toThrow()
  expect(() => summarize('derive', [NaN])).toThrow()
})
