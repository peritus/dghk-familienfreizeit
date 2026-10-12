import { afterEach, expect, test, vi } from 'vitest'
import { env } from 'cloudflare:workers'
import { app } from '../../src/worker/index.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'
import { buildRevision } from '../../src/config/build.js'
import { compatibilityRevision } from '../../src/config/build.js'
import { performanceLogMarker } from '../../src/performance/metrics.js'

afterEach(() => vi.restoreAllMocks())

test('organiser batches perform two replays regardless of batch size', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const options = { now: () => '2027-01-01T00:00:00.000Z', isOrganiser: () => true }
  const link = await issueMagicLink(env.DB, 'organiser@example.test', null, false, options)
  const session = await redeemMagicLink(env.DB, link.token!, options)
  const events = [
    {
      type: 'FamilyInvited',
      payload: {
        family_id: 'fam_budget',
        email: 'family@example.test',
        display_name: 'Budget',
        locale: 'de',
      },
    },
    {
      type: 'PersonAdded',
      payload: {
        person_id: 'per_budget',
        family_id: 'fam_budget',
        given_name: 'A',
        family_name: 'B',
        age: 18,
        role: 'adult',
      },
    },
    ...Array.from({ length: 62 }, (_, index) => ({
      type: 'LabelSet',
      payload: {
        entity_id: 'fam_budget',
        key: 'family-note',
        value: String(index),
        strength: null,
        note: null,
      },
    })),
  ]
  const response = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: {
        cookie: `sid=${session!.session}`,
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        input_seq: 0,
        events,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
      }),
    },
    {
      ...env,
      DGHK_PERFORMANCE: 'on',
      DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test',
    },
  )
  expect(response.status).toBe(200)
  const marker = log.mock.calls.find((args) => args[0] === performanceLogMarker)!
  const batch = JSON.parse(String(marker[1])) as {
    metrics: { operation: string; call_count: number; outcome: string }[]
  }
  const calls = (operation: string) =>
    batch.metrics
      .filter((row) => row.operation === operation)
      .reduce((count, row) => count + row.call_count, 0)
  expect(calls('events.derive')).toBe(2)
  expect(calls('events.prepare')).toBe(1)
  expect(calls('events.read')).toBe(1)
  expect(calls('events.append')).toBe(1)
  expect(batch.metrics.find((row) => row.operation === 'request.organiser-apply')?.outcome).toBe(
    'ok',
  )
  expect(JSON.stringify(batch)).not.toMatch(/fam_budget|per_budget|family@example/)
})

test('browser performance ingestion is authenticated, origin checked, bounded and operational only', async () => {
  const points: unknown[] = []
  const bindings = {
    ...env,
    DGHK_PERFORMANCE: 'on' as const,
    PERFORMANCE: { writeDataPoint: (point: unknown) => points.push(point) },
    DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test',
  }
  const options = {
    now: () => '2027-01-01T00:00:00.000Z',
    isOrganiser: (email: string) => email === 'organiser@example.test',
  }
  const link = await issueMagicLink(env.DB, 'organiser@example.test', null, false, options)
  const session = await redeemMagicLink(env.DB, link.token!, options)
  const cookie = `sid=${session!.session}`
  const body = {
    schema_version: 1,
    source: 'browser',
    build_revision: buildRevision,
    sample_interval: 20,
    root_operation: 'events.derive',
    metrics: [
      {
        operation: 'events.derive',
        measurement_kind: 'elapsed',
        duration_ms: 12,
        event_count: 50000,
        call_count: 1,
        outcome: 'ok',
      },
    ],
  }
  const send = (
    payload: unknown,
    headers: Record<string, string> = { cookie, origin: 'http://localhost' },
  ) =>
    app.request(
      '/api/performance',
      {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
      bindings,
    )
  expect((await send(body, {})).status).toBe(401)
  expect((await send(body, { cookie })).status).toBe(403)
  expect((await send({ ...body, email: 'private' })).status).toBe(400)
  expect((await send({ ...body, build_revision: '0'.repeat(40) })).status).toBe(400)
  expect((await send({ ...body, extra: 'x'.repeat(50000) })).status).toBe(400)
  expect(points).toHaveLength(0)
  expect((await send(body)).status).toBe(204)
  expect(points).toHaveLength(1)
  expect(JSON.stringify(points)).not.toContain('organiser@example.test')
  expect(await env.DB.prepare('SELECT count(*) AS n FROM event').first('n')).toBe(0)
  await env.DB.prepare('UPDATE rate_limit SET count = 120 WHERE bucket = ?1')
    .bind('performance:organiser@example.test')
    .run()
  expect((await send(body)).status).toBe(429)
  expect(points).toHaveLength(1)
})

test('disabled telemetry does not write or replay domain state', async () => {
  expect((await app.request('/api/performance', { method: 'POST', body: '{}' }, env)).status).toBe(
    204,
  )
})

test('family REST uses one committed replay, one prospective replay and stable operation names', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO event(seq,at,actor,type,subject,payload) VALUES (1,?1,?2,?3,NULL,?4)',
  )
    .bind(
      now,
      'org@example.test',
      'FamilyInvited',
      JSON.stringify({
        family_id: 'fam_private_metric',
        email: 'private@example.test',
        display_name: 'Private',
        locale: 'de',
      }),
    )
    .run()
  const options = { isOrganiser: () => false }
  const link = await issueMagicLink(env.DB, 'private@example.test', null, true, options)
  const session = await redeemMagicLink(env.DB, link.token!, options)
  const bindings = { ...env, DGHK_PERFORMANCE: 'on' as const },
    headers = { cookie: `sid=${session!.session}` }
  const response = await app.request('/api/family', { headers }, bindings)
  const data = (await response.json()) as { resource_etags: Record<string, string> }
  let batch = JSON.parse(
    String(log.mock.calls.find((args) => args[0] === performanceLogMarker)![1]),
  ) as { root_operation: string; metrics: { operation: string; call_count: number }[] }
  const calls = (name: string) =>
    batch.metrics
      .filter((item) => item.operation === name)
      .reduce((sum, item) => sum + item.call_count, 0)
  expect(batch.root_operation).toBe('request.family-read')
  expect(calls('events.read')).toBe(1)
  expect(calls('events.derive')).toBe(1)
  log.mockClear()
  const changed = await app.request(
    '/api/family',
    {
      method: 'PATCH',
      headers: {
        ...headers,
        origin: 'http://localhost',
        'content-type': 'application/json',
        'If-Match': data.resource_etags['/api/family']!,
      },
      body: JSON.stringify({ display_name: 'Changed' }),
    },
    bindings,
  )
  expect(changed.status).toBe(200)
  batch = JSON.parse(
    String(log.mock.calls.find((args) => args[0] === performanceLogMarker)![1]),
  ) as typeof batch
  expect(batch.root_operation).toBe('request.family-write')
  expect(calls('events.read')).toBe(1)
  expect(calls('events.derive')).toBe(2)
  expect(calls('events.prepare')).toBe(1)
  expect(calls('events.append')).toBe(1)
  expect(JSON.stringify(batch)).not.toMatch(/fam_private_metric|private@example|Changed/)
})
