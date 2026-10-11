import { activeProfile } from '../../config/index.js'
import { buildRevision } from '../../config/build.js'
import { computationMeasurements, performanceSampleInterval } from '../../performance/metrics.js'
import { performanceOperations } from '../../performance/operations.js'
import type { ComputationProfiler } from '../../performance/domain.js'

const operations = performanceOperations(activeProfile)
let enabled = false
export function configureBrowserPerformance(value: boolean): void {
  enabled = value
}

/** Never updates React state or blocks an edit on telemetry delivery. */
export function browserComputation<T>(
  operation: string,
  eventCount: number,
  run: (measure: ComputationProfiler) => T,
): T {
  const recorder = computationMeasurements({ source: 'browser', enabled, operations })
  recorder.setEventCount(eventCount)
  try {
    return recorder.measure(operation, () => run(recorder.measure))
  } finally {
    if (recorder.sampled) {
      const body = JSON.stringify({
        schema_version: 1,
        source: 'browser',
        build_revision: buildRevision,
        sample_interval: performanceSampleInterval,
        root_operation: operation,
        metrics: recorder.metrics(),
      })
      // Scheduling avoids network effects during React's calculation.
      setTimeout(() => {
        if (!enabled) return
        void fetch('/api/performance', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body,
          keepalive: true,
        }).catch(() => {})
      }, 0)
    }
  }
}
