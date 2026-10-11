import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, hostname, cpus, platform, arch } from 'node:os'
import { join, dirname } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { compareRuns, type PerformanceRun, type TimingSummary } from '../src/performance/results.ts'

export function historyPath(): string {
  return join(
    process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state'),
    'dghk-familienfreizeit',
    'performance',
    'runs.jsonl',
  )
}

export function readHistory(path = historyPath()): PerformanceRun[] {
  try {
    const rows = readFileSync(path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line, index) => {
        try {
          const run = JSON.parse(line) as PerformanceRun
          if (run.schema_version !== 1 || !Array.isArray(run.timings))
            throw new Error('unsupported record')
          return run
        } catch {
          throw new Error(`invalid history record at ${path}:${index + 1}`)
        }
      })
    return [...new Map(rows.map((run) => [run.run_id, run])).values()]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export function startRun(workload: string, shape: PerformanceRun['shape']) {
  const ciCommit = process.env.CI && process.env.GITHUB_SHA
  if (ciCommit && !/^[a-f0-9]{40}$/.test(ciCommit)) throw new Error('invalid CI revision')
  const revision = ciCommit
    ? { change_id: 'ci', commit_id: ciCommit, parent_commit_id: '' }
    : (JSON.parse(
        execFileSync(
          'jj',
          [
            'log',
            '-r',
            '@',
            '--no-graph',
            '-T',
            '"{\\"change_id\\":\\"" ++ change_id ++ "\\",\\"commit_id\\":\\"" ++ commit_id ++ "\\",\\"parent_commit_id\\":\\"" ++ parents.map(|p| p.commit_id()).join("") ++ "\\"}"',
          ],
          { encoding: 'utf8' },
        ),
      ) as PerformanceRun['revision'])
  const run: PerformanceRun = {
    schema_version: 1,
    run_id: randomUUID(),
    at: new Date().toISOString(),
    revision,
    environment: {
      machine: createHash('sha256')
        .update(`${hostname()}:${cpus()[0]?.model}`)
        .digest('hex')
        .slice(0, 16),
      platform: platform(),
      arch: arch(),
      runtime: process.version,
    },
    workload,
    shape,
    timings: [],
    output_hash: '',
    status: 'partial',
  }
  const path = historyPath()
  const history = readHistory(path)
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const checkpoint = (timings: readonly TimingSummary[], pending?: string) => {
    run.timings = timings.slice()
    run.pending_operation = pending
    run.pending_started_at = pending ? new Date().toISOString() : undefined
    appendFileSync(path, JSON.stringify(run) + '\n', { mode: 0o600 })
  }
  checkpoint([])
  return {
    checkpoint,
    finish(timings: readonly TimingSummary[], outputHash: string, trace: string) {
      run.status = 'complete'
      run.output_hash = outputHash
      const tracePath = join(dirname(path), `${run.run_id}.trace.json`)
      writeFileSync(tracePath, trace, { mode: 0o600 })
      checkpoint(timings)
      process.stderr.write(`History: ${path}\nTrace: ${tracePath}\n`)
      report(run, history)
      return run
    },
  }
}

export function recordRun(
  workload: string,
  shape: PerformanceRun['shape'],
  timings: readonly TimingSummary[],
  outputHash: string,
  trace: string,
): PerformanceRun {
  return startRun(workload, shape).finish(timings, outputHash, trace)
}

function report(run: PerformanceRun, history: readonly PerformanceRun[]): boolean {
  const threshold = Number(process.env.DGHK_PERF_REGRESSION_THRESHOLD ?? '0.2')
  if (!Number.isFinite(threshold) || threshold < 0) throw new Error('invalid regression threshold')
  const comparisons = compareRuns(run, history, threshold)
  for (const entry of comparisons)
    process.stdout.write(
      `${entry.regression ? 'REGRESSION' : 'comparison'} ${entry.operation}: ${(entry.change * 100).toFixed(1)}% vs ${entry.baseline_ms.toFixed(2)} ms\n`,
    )
  return comparisons.some((entry) => entry.regression)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const history = readHistory(
    process.argv.slice(2).find((value) => value !== '--fail-on-regression'),
  )
  const latestByWorkload = new Map(
    history.map((run) => [`${run.workload}:${JSON.stringify(run.shape)}`, run]),
  )
  let regressed = false
  for (const run of latestByWorkload.values()) {
    process.stdout.write(
      `${run.at} ${run.revision.commit_id} ${JSON.stringify(run.shape)} ${run.status ?? 'complete'}${run.pending_operation ? ` pending ${run.pending_operation} since ${run.pending_started_at}` : ''}\n`,
    )
    const index = history.indexOf(run)
    regressed = report(run, history.slice(0, index)) || regressed
  }
  if (regressed && process.argv.includes('--fail-on-regression')) process.exitCode = 1
}
