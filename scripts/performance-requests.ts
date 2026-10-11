import { execFileSync, spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'node:net'
import { syntheticLogSize } from '../test/bench/log.ts'
import { startRun, benchmarkRevision } from './performance-history.ts'
import { summarize, type TimingSummary } from '../src/performance/results.ts'
import { chromeTrace, type TraceSlice } from '../src/performance/trace.ts'

const sizes = (process.env.DGHK_BENCH_EVENTS ?? '20000,50000').split(',').map(Number)
const scenarios = (process.env.DGHK_BENCH_SCENARIOS ?? 'history,population').split(',')
const samples = Number(process.env.DGHK_PERF_REQUEST_SAMPLES ?? '7')
if (!Number.isSafeInteger(samples) || samples < 1 || samples > 25)
  throw new Error('request samples must be 1..25')
if (
  sizes.some((size) => !Number.isSafeInteger(size) || size < 611) ||
  scenarios.some((scenario) => !['history', 'population'].includes(scenario))
)
  throw new Error('invalid request workloads')

// This inherits the flake environment. Setup/build/import are excluded from timings.
const measuredRevision = benchmarkRevision()
execFileSync('pnpm', ['run', 'build'], {
  stdio: 'ignore',
  env: { ...process.env, BUILD_REVISION: measuredRevision.commit_id },
})
const sqlString = (value: string) => `'${value.replaceAll("'", "''")}'`
const clock = () => performance.now()
const interrupted = new AbortController()
process.once('SIGINT', () => interrupted.abort(new Error('benchmark interrupted')))
process.once('SIGTERM', () => interrupted.abort(new Error('benchmark interrupted')))
const workerRuntime = execFileSync('pnpm', ['exec', 'wrangler', '--version'], {
  encoding: 'utf8',
}).trim()

async function unusedPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('port unavailable')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}

for (const size of sizes)
  for (const scenario of scenarios) {
    const fixture = syntheticLogSize(size, scenario as 'history' | 'population')
    const history = startRun(
      `luebben2027-requests-v1:${scenario}`,
      {
        events: size,
        ...fixture.scale,
        samples,
      },
      `/wrangler:${workerRuntime}`,
      measuredRevision,
    )
    const lab = mkdtempSync(join(tmpdir(), 'dghk-performance-'))
    const config = join(lab, 'wrangler.json')
    const state = join(lab, 'state')
    const port = await unusedPort()
    const origin = `http://127.0.0.1:${port}`
    const organiserEmail = 'performance-organiser@example.test'
    const invited = fixture.events.find((event) => event.type === 'FamilyInvited')!
    const family = invited.payload as { family_id: string; email: string; display_name: string }
    const person = fixture.events.find(
      (event) =>
        event.type === 'PersonAdded' &&
        (event.payload as { family_id?: string }).family_id === family.family_id,
    )!
    const organiserToken = randomBytes(32).toString('hex')
    const familyToken = randomBytes(32).toString('hex')
    writeFileSync(
      config,
      JSON.stringify({
        name: 'dghk-performance-lab',
        main: resolve('dist/dghk_familienfreizeit/index.js'),
        compatibility_date: '2026-09-01',
        compatibility_flags: ['nodejs_compat'],
        vars: { DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: organiserEmail },
        assets: {
          directory: resolve('dist/client'),
          binding: 'ASSETS',
          run_worker_first: ['/api/*'],
        },
        d1_databases: [
          {
            binding: 'DB',
            database_name: 'performance-lab',
            database_id: '00000000-0000-0000-0000-000000000001',
            remote: false,
            migrations_dir: resolve('migrations'),
          },
        ],
        observability: { enabled: false },
      }),
      { mode: 0o600 },
    )
    let child: ReturnType<typeof spawn> | undefined
    let log = ''
    try {
      history.checkpoint([], 'lab.setup')
      const wrangler = (args: string[]) =>
        execFileSync(
          'pnpm',
          ['exec', 'wrangler', ...args, '--config', config, '--persist-to', state],
          {
            stdio: 'pipe',
            maxBuffer: 32 * 1024 * 1024,
            env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
          },
        )
      wrangler(['d1', 'migrations', 'apply', 'performance-lab', '--local'])
      const statements: string[] = []
      for (let offset = 0; offset < fixture.events.length; offset += 100) {
        const rows = fixture.events
          .slice(offset, offset + 100)
          .map(
            (event) =>
              `(${event.seq},${sqlString(event.at)},${sqlString(event.actor)},${sqlString(event.type)},${event.subject === null ? 'NULL' : sqlString(event.subject)},${sqlString(JSON.stringify(event.payload))})`,
          )
        statements.push(
          `INSERT INTO event(seq,at,actor,type,subject,payload) VALUES ${rows.join(',')};`,
        )
      }
      const now = new Date().toISOString()
      const expires = new Date(Date.now() + 86400000).toISOString()
      for (const [token, email] of [
        [organiserToken, organiserEmail],
        [familyToken, family.email],
      ])
        statements.push(
          `INSERT INTO session(token_hash,email,expires_at,created_at,last_seen_at) VALUES (${sqlString(createHash('sha256').update(token!).digest('hex'))},${sqlString(email!)},${sqlString(expires)},${sqlString(now)},${sqlString(now)});`,
        )
      const sql = join(lab, 'fixture.sql')
      writeFileSync(sql, statements.join('\n'), { mode: 0o600 })
      wrangler(['d1', 'execute', 'performance-lab', '--local', '--file', sql])
      child = spawn(
        'pnpm',
        [
          'exec',
          'wrangler',
          'dev',
          '--local',
          '--ip',
          '127.0.0.1',
          '--port',
          String(port),
          '--config',
          config,
          '--persist-to',
          state,
        ],
        {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
        },
      )
      child.on('error', (error) => {
        log = error.message
      })
      for (const stream of [child.stdout, child.stderr])
        stream?.on('data', (chunk: Buffer) => {
          log = (log + chunk.toString()).slice(-16000)
        })
      const deadline = Date.now() + 60000
      let health: { build_revision: string; compatibility_revision: number } | undefined
      while (Date.now() < deadline) {
        if (interrupted.signal.aborted) throw interrupted.signal.reason
        try {
          const response = await fetch(`${origin}/api/health`, {
            signal: AbortSignal.timeout(1000),
          })
          if (response.ok) {
            health = (await response.json()) as typeof health
            break
          }
        } catch {
          /* Server startup. */
        }
        if (child.exitCode !== null) throw new Error('local Worker exited during startup')
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (!health) throw new Error('local Worker startup deadline exceeded')
      let head = size
      let edit = 0
      const timings: TimingSummary[] = []
      const slices: TraceSlice[] = []
      const traceOrigin = clock()
      const request = async (path: string, token: string, body?: unknown) => {
        const response = await fetch(`${origin}${path}`, {
          method: body === undefined ? 'GET' : 'POST',
          headers: { cookie: `sid=${token}`, origin, 'content-type': 'application/json' },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.any([interrupted.signal, AbortSignal.timeout(120000)]),
        })
        const result = (await response.json()) as {
          head?: number
          head_seq?: number
          principal?: { kind?: string }
        }
        if (!response.ok)
          throw new Error(`benchmark request ${path} failed with status ${response.status}`)
        return result
      }
      const operations = [
        [
          'request.organiser-log',
          async () => {
            const result = await request('/api/organiser/log', organiserToken)
            if (result.head_seq !== head) throw new Error('unexpected log head')
          },
        ],
        [
          'request.me:organiser',
          async () => {
            if ((await request('/api/me', organiserToken)).principal?.kind !== 'organiser')
              throw new Error('unexpected organiser principal')
          },
        ],
        [
          'request.me:family',
          async () => {
            if ((await request('/api/me', familyToken)).principal?.kind !== 'family')
              throw new Error('unexpected family principal')
          },
        ],
        [
          'request.organiser-apply',
          async () => {
            const result = await request('/api/organiser/apply', organiserToken, {
              input_seq: head,
              build_revision: health!.build_revision,
              compatibility_revision: health!.compatibility_revision,
              events: [
                {
                  type: 'LabelSet',
                  subject: null,
                  payload: {
                    entity_id: family.family_id,
                    key: 'family-note',
                    value: `performance ${edit++}`,
                    strength: null,
                    note: null,
                  },
                },
              ],
            })
            head++
            if (result.head_seq !== head) throw new Error('unexpected apply head')
          },
        ],
        [
          'request.events:family',
          async () => {
            const result = await request('/api/events', familyToken, {
              expected_head: head,
              events: [
                {
                  type: 'PersonUpdated',
                  payload: {
                    ...(person.payload as Record<string, unknown>),
                    given_name: `Performance ${edit++}`,
                  },
                },
              ],
            })
            head++
            if (result.head !== head) throw new Error('unexpected family append head')
          },
        ],
      ] as const
      for (const [operation, run] of operations) {
        history.checkpoint(timings, operation)
        await run()
        const durations: number[] = []
        for (let sample = 0; sample < samples; sample++) {
          const started = clock()
          await run()
          const duration = clock() - started
          durations.push(duration)
          slices.push({
            operation,
            started_ms: started - traceOrigin,
            duration_ms: duration,
            track: 1,
            event_count: head,
            outcome: 'ok',
          })
        }
        const timing = summarize(operation, durations)
        timings.push(timing)
        history.checkpoint(timings)
        process.stderr.write(
          `${scenario} ${size} ${operation}: median ${timing.median_ms.toFixed(2)} ms, p95 ${timing.p95_ms.toFixed(2)} ms, n=${samples}\n`,
        )
      }
      history.finish(
        timings,
        createHash('sha256')
          .update(JSON.stringify({ head, operations: operations.map(([operation]) => operation) }))
          .digest('hex'),
        chromeTrace(slices, `${scenario} ${size} HTTP (host clock)`),
      )
    } catch (error) {
      // Do not print captured server logs: they can contain session cookies.
      throw new Error(
        `local request benchmark failed (${scenario} ${size}); partial measurements retained. ${error instanceof Error ? error.message : 'unknown error'}`,
        { cause: error },
      )
    } finally {
      if (child?.pid && child.exitCode === null) {
        process.kill(-child.pid, 'SIGTERM')
        await new Promise<void>((resolve) => {
          child!.once('exit', () => {
            clearTimeout(timer)
            resolve()
          })
          const timer = setTimeout(() => {
            try {
              process.kill(-child!.pid!, 'SIGKILL')
            } catch {
              resolve()
            }
          }, 5000)
        })
      }
      // Keep synthetic lab state only when explicitly requested for examination.
      if (process.env.DGHK_PERF_KEEP_LAB === '1') process.stderr.write(`Synthetic lab: ${lab}\n`)
      else rmSync(lab, { recursive: true, force: true })
      void log
    }
  }
