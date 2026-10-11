import type { PerformanceRun } from './results.ts'

export type CapacityBudgets = Readonly<Record<string, number>>

/* eslint-disable @typescript-eslint/naming-convention -- Stable telemetry operation keys. */
export const calculationBudgets: CapacityBudgets = { 'organiser.edit': 500 }

export const appendBudgets: CapacityBudgets = {
  'request.organiser-apply': 1000,
  'request.events:family': 1000,
}

/* eslint-enable @typescript-eslint/naming-convention */

export function assessCapacity(run: PerformanceRun, budgets: CapacityBudgets) {
  if (
    !Object.keys(budgets).length ||
    Object.values(budgets).some((limit) => !Number.isFinite(limit) || limit <= 0)
  )
    throw new Error('capacity budgets must be positive finite milliseconds')
  const checks = Object.entries(budgets).map(([operation, limitMs]) => {
    const timing = run.timings.find((timing) => timing.operation === operation)
    return {
      operation,
      limit_ms: limitMs,
      p95_ms: timing?.p95_ms ?? null,
      status:
        !timing || !Number.isFinite(timing.p95_ms) || timing.p95_ms < 0 || timing.samples < 3
          ? ('incomplete' as const)
          : timing.p95_ms > limitMs
            ? ('fail' as const)
            : ('pass' as const),
    }
  })
  const latency =
    run.status === 'partial' || checks.some((check) => check.status === 'incomplete')
      ? ('incomplete' as const)
      : checks.some((check) => check.status === 'fail')
        ? ('fail' as const)
        : ('pass' as const)
  const quality = run.observations
  const allocation =
    !quality ||
    ['unplaced_families', 'shortfall_places', 'unscheduled_workshops', 'underassigned_people'].some(
      (key) => !Number.isSafeInteger(quality[key]) || quality[key]! < 0,
    )
      ? ('unknown' as const)
      : quality.unplaced_families === 0 &&
          quality.shortfall_places === 0 &&
          quality.unscheduled_workshops === 0 &&
          quality.underassigned_people === 0
        ? ('complete' as const)
        : ('needs-attention' as const)
  return {
    run,
    checks,
    latency,
    allocation,
    supported: latency === 'pass' && allocation === 'complete',
  }
}

/** One measured workload/revision/environment at a time; no cross-machine or cross-seed limit. */
export function capacityGroups(runs: readonly PerformanceRun[], budgets: CapacityBudgets) {
  const groups = new Map<string, PerformanceRun[]>()
  for (const run of runs) {
    if (!run.workload.startsWith('luebben2027-lifecycle-')) continue
    const key = JSON.stringify([
      run.workload,
      run.revision.commit_id,
      Object.entries(run.environment).sort(),
      run.shape.seed,
      run.shape.samples ?? null,
    ])
    const rows = groups.get(key) ?? []
    rows.push(run)
    groups.set(key, rows)
  }
  return [...groups.values()].map((runs) => {
    // Keep the latest observation for each family count in this source/environment.
    const rows = [...new Map(runs.map((run) => [run.shape.families, run])).values()]
      .sort((a, b) => a.shape.families! - b.shape.families!)
      .map((run) => assessCapacity(run, budgets))
    const firstFailure = rows.findIndex((row) => !row.supported)
    const supportedRows = firstFailure < 0 ? rows : rows.slice(0, firstFailure)
    const through = supportedRows.at(-1) ?? null
    const boundary = firstFailure < 0 ? null : rows[firstFailure]!
    const nextFamilies =
      through && boundary && boundary.run.shape.families! - through.run.shape.families! > 1
        ? Math.floor((through.run.shape.families! + boundary.run.shape.families!) / 2)
        : null
    return { rows, through, boundary, next_families: nextFamilies }
  })
}
