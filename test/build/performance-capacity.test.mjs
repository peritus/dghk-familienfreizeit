import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

test('capacity CLI reports both scopes, explicit limits and incomplete coverage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dghk-capacity-report-'))
  try {
    const file = join(dir, 'runs.jsonl')
    const base = {
      schema_version: 1,
      at: '2027-01-01T00:00:00Z',
      status: 'complete',
      output_hash: 'same',
      revision: { change_id: 'test', commit_id: 'same', parent_commit_id: '' },
      environment: { machine: 'one', platform: 'linux', arch: 'arm64', runtime: 'node' },
      shape: { families: 50, persons: 200, events: 3400, log_bytes: 1000000, seed: 2027 },
      observations: {
        unplaced_families: 0,
        shortfall_places: 0,
        unscheduled_workshops: 0,
        underassigned_people: 0,
      },
    }
    const computation = {
      ...base,
      run_id: 'compute',
      workload: 'luebben2027-lifecycle-computation-v1:normal',
      timings: [{ operation: 'organiser.edit', median_ms: 200, p95_ms: 400, samples: 7 }],
    }
    const requests = {
      ...base,
      run_id: 'http',
      workload: 'luebben2027-lifecycle-requests-v1:normal',
      timings: ['request.organiser-apply', 'request.family-write'].map((operation) => ({
        operation,
        median_ms: 500,
        p95_ms: 900,
        samples: 7,
      })),
    }
    const cli = () =>
      spawnSync(
        process.execPath,
        [
          '--experimental-strip-types',
          'scripts/performance-capacity.ts',
          '--',
          file,
          '--fail-on-limit',
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            DGHK_CAPACITY_CALCULATION_MS: '500',
            DGHK_CAPACITY_APPEND_MS: '1000',
          },
        },
      )
    writeFileSync(file, JSON.stringify(computation) + '\n')
    assert.equal(cli().status, 1)
    assert.match(cli().stdout, /requests: no observations/)
    writeFileSync(file, [computation, requests].map((row) => JSON.stringify(row)).join('\n') + '\n')
    assert.equal(cli().status, 0)
    assert.match(cli().stdout, /50 families, 200 people, 3400 events, 1000000 bytes/)
    assert.match(cli().stdout, /not a maximum/)
    computation.timings[0].p95_ms = 501
    writeFileSync(file, [computation, requests].map((row) => JSON.stringify(row)).join('\n') + '\n')
    assert.equal(cli().status, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
