import { readFileSync, writeFileSync } from 'node:fs'
import { cloudflareTrace, cpuProfileTrace } from '../src/performance/import-trace.ts'

const [format, input, output] = process.argv.slice(2).filter((value) => value !== '--')
if (!input || !output || !['cloudflare', 'cpu-profile'].includes(format ?? ''))
  throw new Error('usage: perf:export <cloudflare|cpu-profile> <input.json> <output.trace.json>')
const value: unknown = JSON.parse(readFileSync(input, 'utf8'))
writeFileSync(output, format === 'cloudflare' ? cloudflareTrace(value) : cpuProfileTrace(value), {
  mode: 0o600,
})
