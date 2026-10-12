export type Measurement = {
  operation: string
  duration_ms: number
  event_count: number
  outcome: 'ok' | 'error'
}

export type TimingSummary = {
  operation: string
  median_ms: number
  p95_ms: number
  samples: number
}

export type PerformanceRun = {
  schema_version: 1
  run_id: string
  at: string
  revision: { change_id: string; commit_id: string; parent_commit_id: string }
  environment: { machine: string; platform: string; arch: string; runtime: string }
  workload: string
  shape: Readonly<Record<string, number>>
  timings: readonly TimingSummary[]
  output_hash: string
  status?: 'complete' | 'partial'
  pending_operation?: string
  pending_started_at?: string
  /** Allocation completeness and measured payload sizes; never domain output. */
  observations?: Readonly<Record<string, number>>
}

export function summarize(operation: string, samples: readonly number[]): TimingSummary {
  if (samples.length === 0 || samples.some((value) => !Number.isFinite(value) || value < 0))
    throw new Error('timing samples must be finite, nonnegative, and nonempty')
  const sorted = samples.slice().sort((left, right) => left - right)
  return {
    operation,
    median_ms: sorted[Math.floor(sorted.length / 2)]!,
    p95_ms: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
    samples: sorted.length,
  }
}

export function compareRuns(
  current: PerformanceRun,
  history: readonly PerformanceRun[],
  threshold = 0.2,
): readonly {
  operation: string
  baseline_ms: number
  baseline_p95_ms: number
  change: number
  p95_change: number
  regression: boolean
}[] {
  const signature = (value: Readonly<Record<string, string | number>>) =>
    JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
  const comparable = history
    .filter(
      (run) =>
        run.schema_version === current.schema_version &&
        run.run_id !== current.run_id &&
        run.workload === current.workload &&
        signature(run.shape) === signature(current.shape) &&
        signature(run.environment) === signature(current.environment),
    )
    .slice(-10)
  return current.timings.flatMap((timing) => {
    const values = comparable.flatMap((run) =>
      run.timings
        .filter((entry) => entry.operation === timing.operation)
        .map((entry) => entry.median_ms),
    )
    if (!values.length) return []
    const baseline = summarize(timing.operation, values).median_ms
    const tails = comparable.flatMap((run) =>
      run.timings
        .filter((entry) => entry.operation === timing.operation)
        .map((entry) => entry.p95_ms),
    )
    const baselineP95 = summarize(timing.operation, tails).median_ms
    const change =
      baseline === 0 ? (timing.median_ms === 0 ? 0 : Infinity) : timing.median_ms / baseline - 1
    const p95Change =
      baselineP95 === 0 ? (timing.p95_ms === 0 ? 0 : Infinity) : timing.p95_ms / baselineP95 - 1
    return [
      {
        operation: timing.operation,
        baseline_ms: baseline,
        baseline_p95_ms: baselineP95,
        change,
        p95_change: p95Change,
        regression: change > threshold || p95Change > threshold,
      },
    ]
  })
}

/** Compare log scaling only within one source revision and runtime/machine. */
export function scaleGrowth(runs: readonly PerformanceRun[]): readonly {
  workload: string
  operation: string
  from_events: number
  to_events: number
  exponent: number
}[] {
  const result: {
    workload: string
    operation: string
    from_events: number
    to_events: number
    exponent: number
  }[] = []
  for (const larger of runs)
    for (const smaller of runs) {
      const from = smaller.shape.events ?? 0
      const to = larger.shape.events ?? 0
      if (
        from <= 0 ||
        to <= from ||
        smaller.workload !== larger.workload ||
        smaller.revision.commit_id !== larger.revision.commit_id ||
        JSON.stringify(smaller.environment) !== JSON.stringify(larger.environment)
      )
        continue
      for (const timing of larger.timings) {
        const baseline = smaller.timings.find((entry) => entry.operation === timing.operation)
        if (baseline && baseline.median_ms > 0 && timing.median_ms > 0)
          result.push({
            workload: larger.workload,
            operation: timing.operation,
            from_events: from,
            to_events: to,
            exponent: Math.log(timing.median_ms / baseline.median_ms) / Math.log(to / from),
          })
      }
    }
  return result
}
