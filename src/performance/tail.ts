/* eslint-disable @typescript-eslint/naming-convention -- Cloudflare TraceItem fields. */
import {
  parseMetricBatch,
  performanceLogMarker,
  writeMetrics,
  type Metric,
  type MetricWriter,
} from './metrics.js'

/** Reads only our sanitized marker; URLs, headers, exceptions and other logs are ignored. */
export function collectTailPerformance(
  events: readonly {
    logs: readonly { message: readonly unknown[] }[]
    cpuTime: number
    wallTime: number
    outcome: string
  }[],
  writer: MetricWriter,
  operations: ReadonlySet<string>,
): void {
  let written = 0
  let dropped = 0
  const bounded: MetricWriter = {
    writeDataPoint(point) {
      if (written < 249) {
        written += 1
        writer.writeDataPoint(point)
      } else dropped += 1
    },
  }
  for (const event of events) {
    const marker = event.logs.find(
      (log) => log.message[0] === performanceLogMarker && log.message.length === 2,
    )
    if (!marker || typeof marker.message[1] !== 'string') continue
    let decoded: unknown
    try {
      decoded = JSON.parse(marker.message[1])
    } catch {
      continue
    }
    const batch = parseMetricBatch(decoded, operations, 'worker')
    if (!batch || !batch.root_operation.startsWith('request.')) continue
    const eventCount = Math.max(0, ...batch.metrics.map((row) => row.event_count))
    const totals: Metric[] = []
    const handledError = batch.metrics.some(
      (row) => row.operation === batch.root_operation && row.outcome === 'error',
    )
    for (const [kind, value] of [
      ['cpu', event.cpuTime],
      ['wall', event.wallTime],
    ] as const)
      if (Number.isFinite(value) && value >= 0)
        totals.push({
          operation: batch.root_operation,
          measurement_kind: kind,
          duration_ms: value,
          event_count: eventCount,
          call_count: 1,
          outcome: event.outcome === 'ok' && !handledError ? 'ok' : 'error',
        })
    writeMetrics(bounded, { ...batch, metrics: [...totals, ...batch.metrics] })
  }
  if (dropped)
    writeMetrics(writer, {
      schema_version: 1,
      source: 'worker',
      root_operation: 'telemetry.dropped',
      build_revision: 'collector',
      sample_interval: 20,
      metrics: [
        {
          operation: 'telemetry.dropped',
          measurement_kind: 'calls',
          duration_ms: 0,
          event_count: 0,
          call_count: dropped,
          outcome: 'ok',
        },
      ],
    })
}
