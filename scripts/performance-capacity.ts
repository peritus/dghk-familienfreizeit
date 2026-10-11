import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { readHistory } from './performance-history.ts'
import {
  calculationBudgets,
  appendBudgets,
  capacityGroups,
  type CapacityBudgets,
} from '../src/performance/capacity.ts'
import { positiveList } from '../test/bench/cases.ts'

export function printCapacity(path?: string): boolean {
  let failed = false
  const all = readHistory(path)
  for (const [kind, defaults, variable] of [
    ['computation', calculationBudgets, 'DGHK_CAPACITY_CALCULATION_MS'],
    ['requests', appendBudgets, 'DGHK_CAPACITY_APPEND_MS'],
  ] as const) {
    const limit = Number(process.env[variable] ?? Object.values(defaults)[0])
    const budgets: CapacityBudgets = Object.fromEntries(
      Object.keys(defaults).map((operation) => [operation, limit]),
    )
    const groups = capacityGroups(
      all.filter((run) => run.workload.startsWith(`luebben2027-lifecycle-${kind}-v1:`)),
      budgets,
    )
    if (!groups.length) {
      process.stdout.write(`${kind}: no observations (incomplete).\n`)
      failed = true
    }
    for (const group of groups) {
      const first = group.rows[0]!.run
      process.stdout.write(
        `\n${first.workload} source=${first.revision.commit_id} environment=${JSON.stringify(first.environment)} seed=${first.shape.seed}\n`,
      )
      for (const row of group.rows)
        process.stdout.write(
          `${row.run.shape.families} families, ${row.run.shape.persons} people, ${row.run.shape.events} events, ${row.run.shape.log_bytes} bytes: latency=${row.latency}, allocation=${row.allocation}; ${row.checks.map((check) => `${check.operation} p95=${check.p95_ms?.toFixed(2) ?? 'missing'}ms/${check.limit_ms}ms`).join('; ')}\n`,
        )
      process.stdout.write(
        group.through
          ? `Tested passing prefix through ${group.through.run.shape.families} families / ${group.through.run.shape.events} events.\n`
          : 'No tested passing prefix.\n',
      )
      process.stdout.write(
        group.boundary
          ? `First unsupported tested row: ${group.boundary.run.shape.families} families (${group.boundary.latency}, ${group.boundary.allocation}).\n`
          : 'No failing upper bound measured; the largest tested row is not a maximum.\n',
      )
      if (group.next_families)
        process.stdout.write(`Refine with DGHK_CAPACITY_FAMILIES=${group.next_families}.\n`)
      failed = failed || group.rows.some((row) => !row.supported)
    }
  }
  if (!all.some((run) => run.workload.startsWith('luebben2027-lifecycle-'))) {
    process.stdout.write(
      'No lifecycle capacity observations. Run bench:capacity and bench:capacity:requests.\n',
    )
    failed = true
  }
  return failed
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--run')) {
    const families = positiveList(process.env.DGHK_CAPACITY_FAMILIES ?? '50,100,150,200,300,500')
    const scenarios = (process.env.DGHK_CAPACITY_SCENARIOS ?? 'normal,contention').split(',')
    if (scenarios.some((scenario) => !['normal', 'contention'].includes(scenario)))
      throw new Error('invalid capacity scenarios')
    const timeout = Number(process.env.DGHK_BENCH_TIMEOUT_MS ?? '900000')
    if (!Number.isSafeInteger(timeout) || timeout < 1) throw new Error('invalid capacity timeout')
    let failed = false
    let interrupted = false
    sweep: for (const familyCount of families)
      for (const scenario of scenarios) {
        const code = await new Promise<number>((resolve) => {
          const child = spawn('pnpm', ['run', 'bench'], {
            stdio: 'inherit',
            detached: true,
            env: {
              ...process.env,
              DGHK_CAPACITY_FAMILIES: String(familyCount),
              DGHK_CAPACITY_SCENARIOS: scenario,
              DGHK_BENCH_MIN_SAMPLES: process.env.DGHK_BENCH_MIN_SAMPLES ?? '7',
              DGHK_BENCH_SAMPLE_MS: process.env.DGHK_BENCH_SAMPLE_MS ?? '0',
            },
          })
          let escalation: ReturnType<typeof setTimeout> | undefined
          const signalGroup = (signal: NodeJS.Signals) => {
            if (!child.pid) return
            try {
              process.kill(-child.pid, signal)
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
            }
          }
          const stop = () => {
            signalGroup('SIGTERM')
            escalation ??= setTimeout(() => signalGroup('SIGKILL'), 5000)
          }
          const interrupt = () => {
            interrupted = true
            stop()
          }
          process.once('SIGINT', interrupt)
          process.once('SIGTERM', interrupt)
          const timer = setTimeout(stop, timeout)
          const cleanup = () => {
            clearTimeout(timer)
            clearTimeout(escalation)
            process.off('SIGINT', interrupt)
            process.off('SIGTERM', interrupt)
          }
          child.once('error', () => {
            cleanup()
            resolve(1)
          })
          child.once('exit', (code) => {
            cleanup()
            resolve(code ?? 124)
          })
        })
        failed = code !== 0 || failed
        if (interrupted) break sweep
      }
    if (failed || interrupted) process.exitCode = 1
  } else {
    const path = process.argv
      .slice(2)
      .find((value) => value !== '--fail-on-limit' && value !== '--')
    if (printCapacity(path) && process.argv.includes('--fail-on-limit')) process.exitCode = 1
  }
}
