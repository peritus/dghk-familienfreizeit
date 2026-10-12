import { maxPerformanceRows, performanceSampleInterval } from './recorder.js'
import type { MetricBatch, MetricWriter } from './recorder.js'

export {
  computationMeasurements,
  maxPerformanceRows,
  performanceSampleInterval,
  performanceSampleRate,
} from './recorder.js'

export type {
  Metric,
  MetricBatch,
  MetricKind,
  MetricWriter,
  SpanRunner,
} from './recorder.js'

export const performanceLogMarker = 'dghk.performance.v1'

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
