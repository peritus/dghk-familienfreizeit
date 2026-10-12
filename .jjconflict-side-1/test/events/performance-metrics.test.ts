import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { performanceOperations } from '../../src/performance/operations.js'
import {
  computationMeasurements,
  maxPerformanceRows,
  parseMetricBatch,
  performanceLogMarker,
  writeMetrics,
  type MetricBatch,
} from '../../src/performance/metrics.js'
import { collectTailPerformance } from '../../src/performance/tail.js'

const operations = performanceOperations(luebben2027Profile)
const batch: MetricBatch = {
  schema_version: 1,
  source: 'worker',
  build_revision: 'a'.repeat(40),
  sample_interval: 20,
  root_operation: 'request.events',
  metrics: [
    {
      operation: 'events.derive',
      measurement_kind: 'calls',
      duration_ms: 0,
      event_count: 50000,
      call_count: 1,
      outcome: 'ok',
    },
  ],
}

test('frozen Worker clock records calls, browser clock records elapsed time, unsampled work stays silent', () => {
  const worker = computationMeasurements({
    source: 'worker',
    enabled: true,
    random: () => 0,
    operations,
    clock: () => {
      throw new Error('must not read a Worker CPU clock')
    },
  })
  worker.setEventCount(50000)
  expect(worker.measure('events.derive', () => 17)).toBe(17)
  expect(worker.metrics()).toEqual(batch.metrics)
  let clock = 0
  const browser = computationMeasurements({
    source: 'browser',
    enabled: true,
    random: () => 0,
    operations,
    clock: () => clock++,
  })
  browser.measure('events.derive', () => browser.measure('events.derive', () => 17))
  expect(browser.metrics()[0]).toMatchObject({
    measurement_kind: 'elapsed',
    duration_ms: 1,
    call_count: 1,
  })
  const silent = computationMeasurements({
    source: 'worker',
    enabled: true,
    random: () => 0.05,
    operations,
  })
  expect(silent.measure('events.derive', () => 17)).toBe(17)
  expect(silent.metrics()).toEqual([])
})

test('errors propagate unchanged with bounded aggregate metrics and I/O kind', async () => {
  let clock = 0
  const recorder = computationMeasurements({
    source: 'worker',
    enabled: true,
    random: () => 0,
    operations,
    clock: () => clock,
  })
  const error = new Error('private domain text')
  expect(() =>
    recorder.measure('events.derive', () => {
      throw error
    }),
  ).toThrow(error)
  await expect(
    recorder.io('events.read', async () => {
      clock = 5
      throw error
    }),
  ).rejects.toBe(error)
  expect(recorder.metrics()).toContainEqual({
    operation: 'events.read',
    measurement_kind: 'io-elapsed',
    duration_ms: 5,
    event_count: 0,
    call_count: 1,
    outcome: 'error',
  })
  expect(JSON.stringify(recorder.metrics())).not.toContain(error.message)
  for (let index = 0; index < 1000; index++) recorder.measure('events.derive', () => index)
  expect(recorder.metrics().length).toBeLessThanOrEqual(maxPerformanceRows)
  expect(recorder.metrics().find((row) => row.outcome === 'ok')?.call_count).toBe(1000)
})

test('ingestion rejects unknown identifiers, fields, malformed durations, sources and stale builds', () => {
  expect(parseMetricBatch(batch, operations, 'worker')).toEqual(batch)
  for (const invalid of [
    { ...batch, email: 'private@example.test' },
    { ...batch, build_revision: 'b'.repeat(40) },
    { ...batch, sample_interval: 1 },
    { ...batch, metrics: [{ ...batch.metrics[0], operation: 'family.fam_private' }] },
    { ...batch, metrics: [{ ...batch.metrics[0], duration_ms: NaN }] },
    { ...batch, metrics: [{ ...batch.metrics[0], duration_ms: 1 }] },
    { ...batch, metrics: [{ ...batch.metrics[0], event_count: -1 }] },
    { ...batch, metrics: [{ ...batch.metrics[0], payload: {} }] },
    { ...batch, metrics: Array.from({ length: maxPerformanceRows + 1 }, () => batch.metrics[0]) },
  ])
    expect(parseMetricBatch(invalid, operations, 'worker', batch.build_revision)).toBeNull()
  expect(parseMetricBatch(batch, operations, 'browser')).toBeNull()
})

test('Tail collector preserves provider CPU/wall totals and ignores unrelated private logs', () => {
  const points: unknown[] = []
  const writer = {
    writeDataPoint: (point: unknown) => {
      points.push(point)
    },
  }
  const event = {
    logs: [
      { message: ['email', 'private@example.test'] },
      { message: [performanceLogMarker, JSON.stringify(batch)] },
    ],
    cpuTime: 73,
    wallTime: 91,
    outcome: 'ok',
  }
  collectTailPerformance([event], writer, operations)
  expect(points).toHaveLength(3)
  expect(points[0]).toMatchObject({
    blobs: ['1', 'worker', 'request.events', 'ok', batch.build_revision, 'cpu'],
    doubles: [73, 50000, 1, 20],
  })
  expect(JSON.stringify(points)).not.toContain('private')
  points.length = 0
  collectTailPerformance(
    [
      {
        ...event,
        logs: [
          {
            message: [
              performanceLogMarker,
              JSON.stringify({
                ...batch,
                metrics: [
                  ...batch.metrics,
                  { ...batch.metrics[0], operation: batch.root_operation, outcome: 'error' },
                ],
              }),
            ],
          },
        ],
      },
    ],
    writer,
    operations,
  )
  expect(points[0]).toMatchObject({
    blobs: ['1', 'worker', 'request.events', 'error', batch.build_revision, 'cpu'],
  })
  points.length = 0
  collectTailPerformance(
    Array.from({ length: 100 }, () => event),
    writer,
    operations,
  )
  expect(points).toHaveLength(250)
  expect(points[249]).toMatchObject({
    blobs: ['1', 'worker', 'telemetry.dropped', 'ok', 'collector', 'calls'],
  })
  expect(() =>
    writeMetrics(
      {
        writeDataPoint() {
          throw new Error('sink unavailable')
        },
      },
      batch,
    ),
  ).not.toThrow()
})
