import { spawn } from 'node:child_process'

const timeout = Number(process.env.DGHK_BENCH_TIMEOUT_MS ?? '600000')
if (!Number.isSafeInteger(timeout) || timeout <= 0) throw new Error('invalid benchmark timeout')
const sizes = (process.env.DGHK_BENCH_EVENTS ?? '20000,50000').split(',')
const scenarios = (process.env.DGHK_BENCH_SCENARIOS ?? 'history,population').split(',')
let failed = false
for (const size of sizes) {
  for (const scenario of scenarios) {
    process.stderr.write(`Scale bench: ${scenario}, ${size} events; deadline ${timeout} ms\n`)
    const result = await new Promise<number>((resolve) => {
      const child = spawn('pnpm', ['run', 'bench'], {
        stdio: 'inherit',
        detached: true,
        env: { ...process.env, DGHK_BENCH_EVENTS: size, DGHK_BENCH_SCENARIOS: scenario },
      })
      const timer = setTimeout(() => {
        process.stderr.write(
          `Benchmark deadline exceeded: ${scenario} ${size}. Completed measurements and pending operation remain in JSONL.\n`,
        )
        if (child.pid) process.kill(-child.pid, 'SIGTERM')
      }, timeout)
      child.once('error', (error) => {
        clearTimeout(timer)
        process.stderr.write(`${error.message}\n`)
        resolve(1)
      })
      child.once('exit', (code, signal) => {
        clearTimeout(timer)
        resolve(code ?? (signal ? 124 : 1))
      })
    })
    failed = result !== 0 || failed
  }
}
if (failed) process.exitCode = 1
