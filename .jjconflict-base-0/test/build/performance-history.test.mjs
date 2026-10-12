import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

test('history retains checkpoints, deduplicates runs, exports traces and reports comparable regressions', () => {
  const state = mkdtempSync(join(tmpdir(), 'dghk-history-test-'))
  const module = new URL('../../scripts/performance-history.ts', import.meta.url).href
  const env = { ...process.env, XDG_STATE_HOME: state, CI: 'true', GITHUB_SHA: 'a'.repeat(40) }
  const run = (script) =>
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '-e', script],
      { env, encoding: 'utf8' },
    )
  try {
    const prelude = `import { startRun, readHistory } from ${JSON.stringify(module)};`
    const timings = '[{operation:"events.derive",median_ms:10,p95_ms:12,samples:3}]'
    run(
      `${prelude} const run=startRun("fixture",{events:20000}); run.checkpoint(${timings},"solver.solve"); if(readHistory().length!==1 || readHistory()[0].pending_operation!=="solver.solve") throw Error("checkpoint lost");`,
    )
    const path = join(state, 'dghk-familienfreizeit', 'performance', 'runs.jsonl')
    assert.equal(readFileSync(path, 'utf8').trim().split('\n').length, 2)
    run(
      `${prelude} const run=startRun("fixture",{events:20000}); run.finish([{operation:"events.derive",median_ms:20,p95_ms:24,samples:3}],"hash",'{"traceEvents":[]}'); if(readHistory().length!==2) throw Error("history not retained");`,
    )
    assert.equal(
      readdirSync(join(state, 'dghk-familienfreizeit', 'performance')).filter((file) =>
        file.endsWith('.trace.json'),
      ).length,
      1,
    )
    const report = execFileSync(
      process.execPath,
      [
        '--experimental-strip-types',
        new URL('../../scripts/performance-history.ts', import.meta.url).pathname,
      ],
      { env, encoding: 'utf8' },
    )
    assert.match(report, /REGRESSION events.derive: 100.0%/)
    assert.throws(() =>
      execFileSync(
        process.execPath,
        [
          '--experimental-strip-types',
          new URL('../../scripts/performance-history.ts', import.meta.url).pathname,
          '--fail-on-regression',
        ],
        { env, stdio: 'pipe' },
      ),
    )
  } finally {
    rmSync(state, { recursive: true, force: true })
  }
})
