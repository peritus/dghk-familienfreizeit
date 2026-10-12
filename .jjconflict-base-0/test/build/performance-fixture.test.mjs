import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('private request fixture import preserves large closing payloads through bound D1 inserts', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',

      '-e',
      `
    import assert from 'node:assert/strict'
    import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
    import { tmpdir } from 'node:os'
    import { join } from 'node:path'
    import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
    import { seedRequestFixture, fixtureDatabaseId } from './scripts/performance-fixture.ts'
    const path = mkdtempSync(join(tmpdir(), 'dghk-fixture-import-'))
    const open = () => new Miniflare(convertV4MiniflareOptions({
      modules: true, script: "export default { fetch() { return new Response('test') } }", compatibilityDate: '2026-09-01', resourcePersistencePath: join(path, 'v3'),
      d1Databases: { DATABASE: fixtureDatabaseId },
    }))
    let runtime
    try {
      runtime = open()
      const initial = await runtime.getD1Database('DATABASE')
      await initial.batch(readFileSync('migrations/0001_m1_kernel.sql', 'utf8').split(';').filter(sql => sql.trim()).map(sql => initial.prepare(sql)))
      await runtime.dispose()
      runtime = undefined
      const payload = { assignments: "quotes ' and Unicode ä 🌍 ".repeat(12000) }
      const event = { seq: 1, at: '2027-04-01T00:00:00Z', actor: 'test@example.test',
        type: 'WorkshopsClosed', subject: null, payload }
      await seedRequestFixture(path, [event], [{
        token_hash: 'fake', email: 'test@example.test', expires_at: '2027-05-01T00:00:00Z',
        created_at: event.at, last_seen_at: event.at,
      }])
      runtime = open()
      const db = await runtime.getD1Database('DATABASE')
      const row = await db.prepare('SELECT * FROM event WHERE seq = 1').first()
      assert.deepEqual(JSON.parse(row.payload), payload)
      assert.equal(row.actor, event.actor)
      assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM session').first('n'), 1)
    } finally {
      await runtime?.dispose()
      rmSync(path, { recursive: true, force: true })
    }
  `,
    ],
    { encoding: 'utf8', timeout: 30000, killSignal: 'SIGKILL' },
  )
  assert.equal(result.status, 0, result.stderr)
})
