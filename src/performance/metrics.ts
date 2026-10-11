import type { ComputationProfiler } from './domain.js'

export const performanceSampleRate = 0.05

export const performanceSampleInterval = 20

export const maxPerformanceRows = 192

export const performanceLogMarker = 'dghk.performance.v1'

export type MetricKind = 'elapsed' | 'io-elapsed' | 'calls' | 'cpu' | 'wall'

export type Metric = {
  operation: string
  measurement_kind: MetricKind
  duration_ms: number
  event_count: number
  call_count: number
  outcome: 'ok' | 'error'
}

export type MetricBatch = {
  schema_version: 1
  source: 'worker' | 'browser'
  build_revision: string
  sample_interval: 20
  root_operation: string
  metrics: readonly Metric[]
}

export type MetricWriter = {
  writeDataPoint(point: { blobs: string[]; doubles: number[]; indexes: string[] }): void
}

export type SpanRunner = <T>(operation: string, run: () => T) => T
const direct: SpanRunner = (_operation, run) => run()

/** Worker sync work records calls: its clock cannot measure CPU-only execution. */
export function computationMeasurements(options: {
  source: MetricBatch['source']
  enabled: boolean
  operations: ReadonlySet<string>
  random?: () => number
  clock?: () => number
  span?: SpanRunner
}) {
  const sampled = options.enabled && (options.random ?? Math.random)() < performanceSampleRate
  const rows = new Map<string, Metric>()
  const clock = options.clock ?? (() => performance.now())
  const span = options.span ?? direct
  let eventCount = 0
  let dropped = 0
  const active = new Set<string>()
  const record = (
    operation: string,
    kind: MetricKind,
    duration: number,
    outcome: Metric['outcome'],
  ) => {
    if (!options.operations.has(operation)) return
    const key = `${operation}:${kind}:${outcome}`
    const existing = rows.get(key)
    if (existing) {
      existing.duration_ms += duration
      existing.call_count += 1
      existing.event_count = Math.max(existing.event_count, eventCount)
    } else if (rows.size < maxPerformanceRows - 1)
      rows.set(key, {
        operation,
        measurement_kind: kind,
        duration_ms: duration,
        event_count: eventCount,
        call_count: 1,
        outcome,
      })
    else dropped += 1
  }
  const measure: ComputationProfiler = (operation, run) => {
    if (!sampled || active.has(operation)) return run()
    active.add(operation)
    const started = options.source === 'browser' ? clock() : 0
    let outcome: Metric['outcome'] = 'ok'
    try {
      return span(operation, run)
    } catch (error) {
      outcome = 'error'
      throw error
    } finally {
      active.delete(operation)
      record(
        operation,
        options.source === 'browser' ? 'elapsed' : 'calls',
        options.source === 'browser' ? Math.max(0, clock() - started) : 0,
        outcome,
      )
    }
  }
  return {
    sampled,
    measure,
    markOutcome(operation: string, outcome: Metric['outcome']) {
      if (sampled) record(operation, 'calls', 0, outcome)
    },
    setEventCount(count: number) {
      if (Number.isSafeInteger(count) && count >= 0) eventCount = count
    },
    async io<T>(operation: string, run: () => Promise<T>): Promise<T> {
      if (!sampled) return run()
      const started = clock()
      let outcome: Metric['outcome'] = 'ok'
      try {
        return await span(operation, run)
      } catch (error) {
        outcome = 'error'
        throw error
      } finally {
        record(operation, 'io-elapsed', Math.max(0, clock() - started), outcome)
      }
    },
    metrics(): Metric[] {
      return [
        ...rows.values(),
        ...(dropped
          ? [
              {
                operation: 'telemetry.dropped',
                measurement_kind: 'calls' as const,
                duration_ms: 0,
                event_count: eventCount,
                call_count: dropped,
                outcome: 'ok' as const,
              },
            ]
          : []),
      ]
    },
  }
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join(',') === expected.slice().sort().join(',')
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
const boundedInteger = (value: unknown, maximum: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum

/** Reject unknown fields instead of accidentally persisting a future payload/identifier. */
export function parseMetricBatch(
  value: unknown,
  operations: ReadonlySet<string>,
  source: MetricBatch['source'],
  build?: string,
): MetricBatch | null {
  if (
    !object(value) ||
    !exactKeys(value, [
      'schema_version',
      'source',
      'build_revision',
      'sample_interval',
      'root_operation',
      'metrics',
    ]) ||
    value.schema_version !== 1 ||
    value.source !== source ||
    value.sample_interval !== performanceSampleInterval ||
    typeof value.build_revision !== 'string' ||
    !/^(?:[a-f0-9]{40}|development)$/.test(value.build_revision) ||
    (build !== undefined && value.build_revision !== build) ||
    typeof value.root_operation !== 'string' ||
    !operations.has(value.root_operation) ||
    !Array.isArray(value.metrics) ||
    value.metrics.length > maxPerformanceRows
  )
    return null
  for (const row of value.metrics) {
    if (
      !object(row) ||
      !exactKeys(row, [
        'operation',
        'measurement_kind',
        'duration_ms',
        'event_count',
        'call_count',
        'outcome',
      ]) ||
      typeof row.operation !== 'string' ||
      !operations.has(row.operation) ||
      !(['ok', 'error'] as unknown[]).includes(row.outcome) ||
      typeof row.duration_ms !== 'number' ||
      !Number.isFinite(row.duration_ms) ||
      row.duration_ms < 0 ||
      row.duration_ms > 600_000 ||
      !boundedInteger(row.event_count, 1_000_000) ||
      !boundedInteger(row.call_count, 100_000) ||
      row.call_count === 0 ||
      !(source === 'browser' ? ['elapsed', 'calls'] : ['io-elapsed', 'calls']).includes(
        String(row.measurement_kind),
      ) ||
      (row.measurement_kind === 'calls' && row.duration_ms !== 0)
    )
      return null
  }
  return value as unknown as MetricBatch
}

/** Best effort; a failed observability binding must not fail a domain operation. */
export function writeMetrics(writer: MetricWriter | undefined, batch: MetricBatch): void {
  if (!writer) return
  for (const row of batch.metrics) {
    try {
      writer.writeDataPoint({
        blobs: [
          '1',
          batch.source,
          row.operation,
          row.outcome,
          batch.build_revision,
          row.measurement_kind,
        ],
        doubles: [row.duration_ms, row.event_count, row.call_count, batch.sample_interval],
        indexes: [`${batch.source}:${row.operation.split(':')[0]}`.slice(0, 96)],
      })
    } catch {
      /* Operational telemetry is expendable. */
    }
  }
}
