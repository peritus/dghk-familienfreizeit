import type { ComputationProfiler } from './domain.js'

export const performanceSampleRate = 0.05

export const performanceSampleInterval = 20

export const maxPerformanceRows = 192

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

