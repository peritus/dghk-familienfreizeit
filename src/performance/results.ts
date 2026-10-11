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
): readonly { operation: string; baseline_ms: number; change: number; regression: boolean }[] {
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
    const change =
      baseline === 0 ? (timing.median_ms === 0 ? 0 : Infinity) : timing.median_ms / baseline - 1
    return [
      {
        operation: timing.operation,
        baseline_ms: baseline,
        change,
        regression: change > threshold,
      },
    ]
  })
}
