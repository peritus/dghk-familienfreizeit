import { Hono } from 'hono'
import { registerFamilyResources } from '../../src/worker/family/resources.js'
import type { AppEnvironment } from '../../src/worker/index.js'
import { derive } from '../../src/events/fold.js'
import { readEvents, appendCanonicalEvents, StaleHeadError } from '../../src/events/store.js'
import { profiledPrepare } from '../../src/performance/domain.js'
import { activeProfile } from '../../src/config/index.js'
import { beforeEach, expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import { app } from '../../src/worker/index.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'
import type { FamilyRepresentation } from '../../src/worker/family/resources.js'

let cookie: string
async function seed(type: string, payload: unknown) {
  const n = Number(await env.DB.prepare('SELECT COUNT(*) FROM event').first('COUNT(*)'))
  await env.DB.prepare(
    'INSERT INTO event(seq,at,actor,type,subject,payload) VALUES (?1,?2,?3,?4,NULL,?5)',
  )
    .bind(n + 1, new Date().toISOString(), 'organiser@example.test', type, JSON.stringify(payload))
    .run()
}
const person = (id: string, family_id = 'fam_a') => ({
  person_id: id,
  family_id,
  given_name: 'Ada',
  family_name: 'Linde',
  role: 'child',
  age: 9,
})
const input = { given_name: 'Bo', family_name: 'Linde', role: 'child', age: 10 }
const bindings = {
  ...env,
  DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test',
}
async function get(path = '/api/family') {
  return app.request(path, { headers: { cookie } }, bindings)
}

async function write(
  path: string,
  method: string,
  body?: unknown,
  etag?: string,
  origin: string | null = 'http://localhost',
) {
  return app.request(
    path,
    {
      method,
      headers: {
        cookie,
        'content-type': 'application/json',
        ...(origin ? { origin } : {}),
        ...(etag ? { 'If-Match': etag } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    bindings,
  )
}

async function current() {
  return (await (await get()).json()) as FamilyRepresentation
}

async function workshop(id: string, mode = 'assigned', capacity = 3) {
  await seed('WorkshopAdded', {
    workshop_id: id,
    title: id,
    description: 'Workshop',
    audience: 'children',
    age_min: 7,
    age_max: 12,
    capacity,
    participation_mode: mode,
    sort_key: 1,
  })
}
beforeEach(async () => {
  await seed('FamilyInvited', {
    family_id: 'fam_a',
    email: 'a@example.test',
    display_name: 'Linde',
    locale: 'de',
  })
  await seed('FamilyInvited', {
    family_id: 'fam_b',
    email: 'hidden@example.test',
    display_name: 'Hidden',
    locale: 'de',
  })
  await seed('PersonAdded', person('per_a'))
  await seed('PersonAdded', person('per_b', 'fam_b'))
  await seed('LabelSet', {
    entity_id: 'fam_a',
    key: 'apart-from',
    value: 'fam_b',
    strength: 'required',
    note: 'Private organiser note',
  })
  const options = { isOrganiser: () => false }
  const link = await issueMagicLink(env.DB, 'a@example.test', null, true, options)
  const session = await redeemMagicLink(env.DB, link.token!, options)
  cookie = `sid=${session!.session}`
})
test('allowlisted family resources expose no foreign IDs, private labels, events or World', async () => {
  const response = await get()
  expect(response.status).toBe(200)
  const data = (await response.json()) as FamilyRepresentation
  expect(data.data.people.map((p) => p.id)).toEqual(['per_a'])
  expect(JSON.stringify(data)).not.toMatch(
    /fam_b|per_b|hidden@example|Private organiser|apart-from|head_seq|set_seq|summaries|diagnostics|"events"/,
  )
  expect(response.headers.get('etag')).toBe(data.resource_etags['/api/family'])
  expect((await get('/api/family/people/per_b')).status).toBe(404)
  expect((await get('/api/organiser/log')).status).toBe(401)
  expect((await get('/api/family/view')).status).toBe(404)
  expect((await app.request('/api/family', {}, bindings)).status).toBe(401)
})
test('resource CRUD creates typed people and records the authenticated actor', async () => {
  const before = await current()
  expect(
    (
      await write(
        '/api/family',
        'PATCH',
        { display_name: 'Eiche' },
        before.resource_etags['/api/family'],
      )
    ).status,
  ).toBe(200)
  const created = await write('/api/family/people', 'POST', input)
  expect(created.status).toBe(201)
  const path = created.headers.get('location')!
  expect(path).toMatch(/^\/api\/family\/people\/per_/)
  const personResponse = await get(path)
  expect(await personResponse.json()).toMatchObject(input)
  const updated = await write(
    path,
    'PATCH',
    { given_name: 'Berta' },
    personResponse.headers.get('etag')!,
  )
  expect(updated.status).toBe(200)
  expect(await updated.json()).toMatchObject({ given_name: 'Berta', age: 10 })
  const actor = await env.DB.prepare('SELECT actor FROM event ORDER BY seq DESC LIMIT 1').first(
    'actor',
  )
  expect(actor).toBe('a@example.test')
  const unavailable = await write(path, 'DELETE', undefined, updated.headers.get('etag')!)
  expect(unavailable.status).toBe(405)
  expect(unavailable.headers.get('allow')).toBe('GET, PATCH')
})
test('ETags detect edits to this resource while unrelated changes remain writable', async () => {
  const path = '/api/family/people/per_a'
  const etag = (await get(path)).headers.get('etag')!
  expect((await write(path, 'PATCH', { given_name: 'Fresh' })).status).toBe(428)
  await seed('PersonUpdated', { ...person('per_b', 'fam_b'), given_name: 'Other change' })
  const changed = await write(path, 'PATCH', { given_name: 'Fresh' }, etag)
  expect(changed.status).toBe(200)
  expect((await write(path, 'PATCH', { given_name: 'Stale' }, etag)).status).toBe(412)
  expect(((await (await get(path)).json()) as { given_name: string }).given_name).toBe('Fresh')
})
test('strict ownership, payload, origin and family identity checks precede append', async () => {
  const path = '/api/family/people/per_a',
    etag = (await get(path)).headers.get('etag')!
  expect(
    (await write('/api/family/people/per_b', 'PATCH', { given_name: 'Hijacked' }, etag)).status,
  ).toBe(404)
  expect((await write(path, 'PATCH', { family_id: 'fam_b' }, etag)).status).toBe(422)
  expect((await write(path, 'PATCH', { role: 'child', age: null }, etag)).status).toBe(422)
  expect((await write(path, 'PATCH', { age: 10 }, etag, null)).status).toBe(403)
  expect((await write(path, 'PATCH', { age: 10 }, etag, 'https://attacker.example')).status).toBe(
    403,
  )
  const data = await current()
  expect(
    (
      await write(
        '/api/family',
        'PATCH',
        { email: 'new@example.test' },
        data.resource_etags['/api/family'],
      )
    ).status,
  ).toBe(422)
  await seed('FamilyEmailChanged', {
    family_id: 'fam_a',
    old_email: 'a@example.test',
    new_email: 'new@example.test',
  })
  expect((await get()).status).toBe(401)
})
test('preferences support explicit indifference, values and delete without exposing organiser controls', async () => {
  let data = await current()
  const path = '/api/family/preferences/needs-private-sanitary'
  expect(
    (await write(path, 'PUT', { values: [], answered: true }, data.resource_etags[path])).status,
  ).toBe(200)
  expect(await (await get(path)).json()).toEqual({ values: [], answered: true })
  data = await current()
  expect(
    (
      await write(
        path,
        'PUT',
        { values: [{ value: 'private-sanitary', strength: 'required' }], answered: true },
        data.resource_etags[path],
      )
    ).status,
  ).toBe(200)
  data = await current()
  expect((await write(path, 'DELETE', undefined, data.resource_etags[path])).status).toBe(204)
  expect(await (await get(path)).json()).toEqual({ values: [], answered: false })
  expect(
    (
      await write(
        '/api/family/preferences/apart-from',
        'PUT',
        { values: [{ value: 'fam_b', strength: 'required' }], answered: true },
        '"fake"',
      )
    ).status,
  ).toBe(404)
  const diet = '/api/family/people/per_a/preferences/diet'
  data = await current()
  expect(
    (
      await write(
        diet,
        'PUT',
        { values: [{ value: 'unconfigured', strength: null }], answered: true },
        data.resource_etags[diet],
      )
    ).status,
  ).toBe(422)
})
test('workshop resources enforce phase, rank limits, reference scope, age and capacity', async () => {
  await workshop('wks_rank')
  await workshop('wks_signup', 'sign-up', 1)
  await workshop('wks_interest', 'interest')
  const ranking = '/api/family/people/per_a/workshop-ranking'
  let data = await current()
  expect(data.data.workshops).toEqual([])
  expect(
    (await write(ranking, 'PUT', { workshop_ids: ['wks_rank'] }, data.resource_etags[ranking]))
      .status,
  ).toBe(403)
  await seed('WorkshopChoiceOpened', {})
  data = await current()
  expect(data.data.workshops).toHaveLength(3)
  expect(
    (
      await write(
        ranking,
        'PUT',
        { workshop_ids: ['wks_rank', 'wks_rank'] },
        data.resource_etags[ranking],
      )
    ).status,
  ).toBe(422)
  expect(
    (await write(ranking, 'PUT', { workshop_ids: ['wks_rank'] }, data.resource_etags[ranking]))
      .status,
  ).toBe(200)
  const signup = '/api/family/people/per_a/workshop-signups/wks_signup'
  data = await current()
  await seed('LabelSet', {
    entity_id: 'per_b',
    key: 'signed-up-for',
    value: 'wks_signup',
    strength: null,
    note: null,
  })
  expect((await write(signup, 'PUT', {}, data.resource_etags[signup])).status).toBe(409)
  await seed('LabelCleared', { entity_id: 'per_b', key: 'signed-up-for', value: null })
  expect((await write(signup, 'PUT', {}, data.resource_etags[signup])).status).toBe(200)
  data = await current()
  expect((await write(signup, 'PUT', {}, data.resource_etags[signup])).status).toBe(200)
  data = await current()
  expect((await write(signup, 'DELETE', undefined, data.resource_etags[signup])).status).toBe(204)
  const interest = '/api/family/people/per_a/workshop-interests/wks_interest'
  data = await current()
  expect((await write(interest, 'PUT', {}, data.resource_etags[interest])).status).toBe(200)
  data = await current()
  expect((await write(interest, 'DELETE', undefined, data.resource_etags[interest])).status).toBe(
    204,
  )
  const together = '/api/family/people/per_a/preferences/workshop-with'
  data = await current()
  expect(
    (
      await write(
        together,
        'PUT',
        { values: [{ value: 'per_b', strength: 'required' }], answered: true },
        data.resource_etags[together],
      )
    ).status,
  ).toBe(422)
  await seed('PersonUpdated', { ...person('per_a'), age: 4 })
  data = await current()
  expect((await write(interest, 'PUT', {}, data.resource_etags[interest])).status).toBe(422)
})
test('family writes have a separate bounded rate limit', async () => {
  const data = await current(),
    path = '/api/family/people/per_a'
  await write(path, 'PATCH', { given_name: 'One' }, data.resource_etags[path])
  await env.DB.prepare('UPDATE rate_limit SET count=120 WHERE bucket=?1')
    .bind('family-resources:a@example.test')
    .run()
  const limited = await write(
    path,
    'PATCH',
    { given_name: 'Two' },
    (await get(path)).headers.get('etag')!,
  )
  expect(limited.status).toBe(429)
  expect(limited.headers.get('retry-after')).toBe('3600')
})

test('closed preferences remain visible and readonly; an operational disable hides them', async () => {
  await seed('AccommodationClosed', {
    placements: [],
    unplaced: [{ family_id: 'fam_a' }, { family_id: 'fam_b' }],
    build_revision: 'development',
    compatibility_revision: 1,
  })
  const data = await current(),
    path = '/api/family/preferences/needs-private-sanitary'
  expect(data.data.sections.find((section) => section.key === 'room-wishes')).toMatchObject({
    visible: true,
    writable: false,
  })
  expect(
    (await write(path, 'PUT', { values: [], answered: true }, data.resource_etags[path])).status,
  ).toBe(403)
  const response = await app.request(
    '/api/family',
    { headers: { cookie } },
    { ...bindings, DGHK_FEATURE_FAMILY_PREFERENCES_FAMILY_ROOM_WISHES: 'off' },
  )
  const off = (await response.json()) as FamilyRepresentation
  expect(off.data.preferences.fam_a?.['needs-private-sanitary']).toBeUndefined()
})

async function racedWrite(path: string, body: unknown, etag: string, race: () => Promise<void>) {
  const testApp = new Hono<AppEnvironment>()
  let invalidations = 0,
    attempts = 0
  registerFamilyResources(testApp, {
    principal: async () => ({ kind: 'family', email: 'a@example.test', family_id: 'fam_a' }),
    domain: async () => {
      const events = await readEvents(env.DB, activeProfile.validation_view)
      return { events, world: derive(events, activeProfile.validation_view) }
    },
    invalidate: () => {
      invalidations++
    },
    prepare: (_context, events, drafts) =>
      profiledPrepare(events, drafts, activeProfile.validation_view, (_name, run) => run()),
    append: async (_context, head, events) => {
      if (attempts++ === 0) {
        await race()
        throw new StaleHeadError(head, head + 1)
      }
      return appendCanonicalEvents(env.DB, head, events)
    },
    origin: () => true,
    body: (context) => context.req.json(),
    overrides: () => [],
  })
  const response = await testApp.request(
    path,
    {
      method: path.includes('signups') ? 'PUT' : 'PATCH',
      headers: { 'content-type': 'application/json', 'If-Match': etag },
      body: JSON.stringify(body),
    },
    env,
  )
  return { response, invalidations, attempts }
}
test('an unrelated append race retries against fresh state without exposing the log', async () => {
  const path = '/api/family/people/per_a',
    etag = (await get(path)).headers.get('etag')!
  const result = await racedWrite(path, { given_name: 'New' }, etag, () =>
    seed('PersonUpdated', { ...person('per_b', 'fam_b'), given_name: 'Other' }),
  )
  expect(result.response.status).toBe(200)
  expect(result.invalidations).toBe(1)
  expect(result.attempts).toBe(2)
  expect(((await result.response.json()) as { given_name: string }).given_name).toBe('New')
})
test('a race changing the edited resource is refused after refreshing its ETag', async () => {
  const path = '/api/family/people/per_a',
    etag = (await get(path)).headers.get('etag')!
  const result = await racedWrite(path, { given_name: 'Overwritten' }, etag, () =>
    seed('PersonUpdated', { ...person('per_a'), given_name: 'Concurrent' }),
  )
  expect(result.response.status).toBe(412)
  expect(result.attempts).toBe(1)
  expect(((await (await get(path)).json()) as { given_name: string }).given_name).toBe('Concurrent')
})
test('an append race rechecks signup capacity and prevents taking the last place twice', async () => {
  await workshop('wks_last', 'sign-up', 1)
  await seed('WorkshopChoiceOpened', {})
  const path = '/api/family/people/per_a/workshop-signups/wks_last',
    data = await current()
  const result = await racedWrite(path, {}, data.resource_etags[path]!, () =>
    seed('LabelSet', {
      entity_id: 'per_b',
      key: 'signed-up-for',
      value: 'wks_last',
      strength: null,
      note: null,
    }),
  )
  expect(result.response.status).toBe(409)
  expect(result.attempts).toBe(1)
  expect((await current()).data.signups.per_a).toEqual([])
})

test('malformed paths and structured preference values fail safely', async () => {
  expect((await get('/api/family/people/%ZZ')).status).toBe(400)
  const data = await current(),
    path = '/api/family/people/per_a/preferences/diet'
  const result = await write(
    path,
    'PUT',
    { values: [{ value: { unexpected: ['nested'] }, strength: null }], answered: true },
    data.resource_etags[path],
  )
  expect(result.status).toBe(422)
})
