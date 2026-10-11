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
    return readFileSync(path, 'utf8')
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
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export function recordRun(
  workload: string,
  shape: PerformanceRun['shape'],
  timings: readonly TimingSummary[],
  outputHash: string,
  trace: string,
): PerformanceRun {
  const revision = JSON.parse(
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
  ) as PerformanceRun['revision']
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
    timings,
    output_hash: outputHash,
  }
  const path = historyPath()
  const history = readHistory(path)
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(join(dirname(path), `${run.run_id}.trace.json`), trace, { mode: 0o600 })
  appendFileSync(path, JSON.stringify(run) + '\n', { mode: 0o600 })
  process.stderr.write(
    `History: ${path}\nTrace: ${join(dirname(path), `${run.run_id}.trace.json`)}\n`,
  )
  report(run, history)
  return run
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
  const history = readHistory(process.argv[2])
  const latestByWorkload = new Map(
    history.map((run) => [`${run.workload}:${JSON.stringify(run.shape)}`, run]),
  )
  let regressed = false
  for (const run of latestByWorkload.values()) {
    process.stdout.write(`${run.at} ${run.revision.commit_id} ${JSON.stringify(run.shape)}\n`)
    const index = history.indexOf(run)
    regressed = report(run, history.slice(0, index)) || regressed
  }
  if (regressed && process.argv.includes('--fail-on-regression')) process.exitCode = 1
}
