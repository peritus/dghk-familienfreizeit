import { activeProfile } from '../config/index.js'
import { collectTailPerformance } from '../performance/tail.js'
import { performanceOperations } from '../performance/operations.js'
import type { MetricWriter } from '../performance/metrics.js'

const operations = performanceOperations(activeProfile)
export default {
  tail(events: TraceItem[], env: { PERFORMANCE: MetricWriter }) {
    collectTailPerformance(events, env.PERFORMANCE, operations)
  },
}
