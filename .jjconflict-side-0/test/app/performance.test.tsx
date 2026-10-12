import { afterEach, expect, test, vi } from 'vitest'
import {
  browserComputation,
  configureBrowserPerformance,
} from '../../src/app/organiser/performance.js'

afterEach(() => {
  configureBrowserPerformance(false)
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('sampled browser computation preserves output and queues a bounded payload after calculation', async () => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetch)
  configureBrowserPerformance(true)
  expect(
    browserComputation('events.derive', 50000, (measure) => measure('events.fold', () => 17)),
  ).toBe(17)
  expect(fetch).not.toHaveBeenCalled()
  await vi.runAllTimersAsync()
  expect(fetch).toHaveBeenCalledTimes(1)
  const body = JSON.parse(fetch.mock.calls[0]![1].body as string)
  expect(body.metrics.map((row: { operation: string }) => row.operation)).toEqual([
    'events.fold',
    'events.derive',
  ])
  expect(body.metrics.every((row: { event_count: number }) => row.event_count === 50000)).toBe(true)
  expect(Object.keys(body).sort()).toEqual([
    'build_revision',
    'metrics',
    'root_operation',
    'sample_interval',
    'schema_version',
    'source',
  ])
})

test('disabled browser telemetry runs the calculation without delivering data', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(browserComputation('solver.solve', 20000, () => 17)).toBe(17)
  await vi.runAllTimersAsync()
  expect(fetch).not.toHaveBeenCalled()
})
