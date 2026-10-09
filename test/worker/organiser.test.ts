import { expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import { app } from '../../src/worker/index.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { readEvents } from '../../src/events/store.js'

const organiserEnv = {
  ...env,
  DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test' as const,
}

async function organiserCookie(): Promise<string> {
  const options = {
    now: () => '2027-01-01T00:00:00.000Z',
    isOrganiser: (email: string) => email === 'organiser@example.test',
  }
  const link = await issueMagicLink(env.DB, 'organiser@example.test', null, false, options)
  const session = await redeemMagicLink(env.DB, link.token!, options)
  if (!session) throw new Error('organiser session was not created')
  return `sid=${session.session}`
}

test('organiser log is authenticated and exposes the selected-profile registry', async () => {
  const response = await app.request(
    '/api/organiser/log',
    { headers: { cookie: await organiserCookie() } },
    organiserEnv,
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    head_seq: 0,
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    screen_registry: expect.arrayContaining([
      expect.objectContaining({ id: 'organiser-dashboard', route: '/organiser' }),
    ]),
  })
})

test('organiser apply validates the prospective batch and returns its world', async () => {
  const cookie = await organiserCookie()
  const response = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: 0,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [
          {
            type: 'FamilyInvited',
            payload: {
              family_id: 'fam_fixture',
              email: 'organiser@example.test',
              display_name: 'Organiser',
              locale: 'de',
            },
          },
          {
            type: 'PersonAdded',
            payload: {
              person_id: 'per_fixture',
              family_id: 'fam_fixture',
              given_name: 'Alex',
              family_name: 'Family',
              age: null,
              role: 'adult',
            },
          },
        ],
      }),
    },
    organiserEnv,
  )
  expect(response.status).toBe(200)
  const result = (await response.json()) as {
    events: unknown
    head_seq: number
    world: { head_seq: number }
  }
  expect(result).toMatchObject({ head_seq: 2, world: { head_seq: 2 } })
  expect(result.events).toEqual(
    JSON.parse(JSON.stringify(await readEvents(env.DB, luebben2027Profile.validation_view))),
  )

  const invalid = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: 2,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [
          {
            type: 'PersonAdded',
            payload: {
              person_id: 'per_invalid',
              family_id: 'fam_missing',
              given_name: 'Invalid',
              family_name: 'Family',
              age: null,
              role: 'adult',
            },
          },
        ],
      }),
    },
    organiserEnv,
  )
  expect(invalid.status).toBe(400)
  expect(
    await env.DB.prepare('SELECT COUNT(*) AS count FROM event').first<{ count: number }>(),
  ).toEqual({ count: 2 })
})

test('organiser log replays selected-profile module events', async () => {
  const cookie = await organiserCookie()
  const applied = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: 0,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [
          {
            type: 'BuildingAdded',
            payload: { building_id: 'bld_log', name: 'Log House', sort_key: 1 },
          },
        ],
      }),
    },
    organiserEnv,
  )
  expect(applied.status).toBe(200)

  const log = await app.request('/api/organiser/log', { headers: { cookie } }, organiserEnv)
  expect(log.status).toBe(200)
  expect(await log.json()).toMatchObject({
    head_seq: 1,
    events: [
      expect.objectContaining({
        type: 'BuildingAdded',
        payload: { building_id: 'bld_log', name: 'Log House', sort_key: 1 },
      }),
    ],
  })
})

test('organiser apply reports intervening events for a stale head', async () => {
  const cookie = await organiserCookie()
  const first = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: 0,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [
          {
            type: 'FamilyInvited',
            payload: {
              family_id: 'fam_stale',
              email: 'stale@example.test',
              display_name: 'Stale',
              locale: 'de',
            },
          },
        ],
      }),
    },
    organiserEnv,
  )
  expect(first.status).toBe(200)

  const stale = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: 0,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [],
      }),
    },
    organiserEnv,
  )
  expect(stale.status).toBe(409)
  expect(await stale.json()).toMatchObject({ error: 'stale_head', actual_head: 1 })
})

test('organiser log carries the operational feature overrides', async () => {
  const response = await app.request(
    '/api/organiser/log',
    { headers: { cookie: await organiserCookie() } },
    { ...organiserEnv, DGHK_FEATURE_FAMILY_PREFERENCES_FAMILY_ROOM_WISHES: 'off' as const },
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    feature_overrides: [{ feature: 'family-preferences.family-room-wishes', value: 'off' }],
  })
})

test('capacity admission agrees across organiser and generic append and never partially saves', async () => {
  const cookie = await organiserCookie(),
    headers = { cookie, origin: 'http://localhost', 'content-type': 'application/json' }
  const workshop = {
    workshop_id: 'wks_capacity',
    title: 'Kapazität',
    description: '',
    audience: 'all',
    age_min: 0,
    age_max: 99,
    capacity: 2,
    participation_mode: 'sign-up',
    leader_ids: [],
    needs: [],
    sort_key: 1,
  }
  const initial = [
    {
      type: 'FamilyInvited',
      payload: {
        family_id: 'fam_capacity',
        email: 'capacity@example.test',
        display_name: 'Kapazität',
        locale: 'de',
      },
    },
    {
      type: 'PersonAdded',
      payload: {
        person_id: 'per_capacity',
        family_id: 'fam_capacity',
        given_name: 'Ada',
        family_name: 'Kapazität',
        age: 30,
        role: 'adult',
      },
    },
    { type: 'WorkshopAdded', payload: workshop },
    {
      type: 'LabelSet',
      payload: {
        entity_id: 'per_capacity',
        key: 'signed-up-for',
        value: 'wks_capacity',
        strength: null,
        note: null,
      },
    },
  ]
  const apply = (input: number, events: unknown[]) =>
    app.request(
      '/api/organiser/apply',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input_seq: input,
          events,
          build_revision: buildRevision,
          compatibility_revision: compatibilityRevision,
        }),
      },
      organiserEnv,
    )
  expect((await apply(0, initial)).status).toBe(200)
  const lowering = {
    type: 'LabelSet',
    payload: { entity_id: 'wks_capacity', key: 'capacity', value: 0, strength: null, note: null },
  }
  for (const response of [
    await apply(4, [
      {
        type: 'FamilyDisplayNameChanged',
        payload: {
          family_id: 'fam_capacity',
          old_display_name: 'Kapazität',
          new_display_name: 'Entwurf',
        },
      },
      lowering,
    ]),
    await app.request(
      '/api/events',
      { method: 'POST', headers, body: JSON.stringify({ expected_head: 4, events: [lowering] }) },
      organiserEnv,
    ),
  ]) {
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(await response.json()).toMatchObject({
      error: 'attention_required',
      findings: [
        expect.objectContaining({
          code: 'official-workshops.capacity-reduction-invalid',
          evidence: expect.objectContaining({ capacity: 0, attendance: 1 }),
          blocks: ['capacity-reduction'],
        }),
      ],
    })
    expect((await readEvents(env.DB, luebben2027Profile.validation_view)).length).toBe(4)
  }
  // Capacity-preserving restatements remain legal despite pre-existing overflow.
  expect(
    (
      await apply(4, [
        { type: 'WorkshopUpdated', payload: { ...workshop, title: 'Metadaten', capacity: 2 } },
      ])
    ).status,
  ).toBe(200)
  const race = await apply(4, [lowering])
  expect(race.status).toBe(409)
  expect(await race.json()).toMatchObject({ error: 'stale_head' })
  const clear = {
    type: 'LabelCleared',
    payload: { entity_id: 'per_capacity', key: 'signed-up-for', value: null },
  }
  expect((await apply(5, [clear, lowering])).status).toBe(200)
})
test('field failures return structured sanitized findings and preserve the event head', async () => {
  const response = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: {
        cookie: await organiserCookie(),
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        input_seq: 0,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [
          {
            type: 'FamilyInvited',
            payload: {
              family_id: 'fam_bad',
              email: 'secret-invalid-value',
              display_name: 'Name',
              locale: 'de',
            },
          },
        ],
      }),
    },
    organiserEnv,
  )
  expect(response.status).toBe(400)
  const body = await response.json()
  expect(body).toMatchObject({
    error: 'attention_required',
    findings: [
      expect.objectContaining({
        code: 'operation.invalid-field',
        evidence: expect.objectContaining({ field: 'email' }),
      }),
    ],
  })
  expect(JSON.stringify(body)).not.toContain('secret-invalid-value')
  expect(await readEvents(env.DB, luebben2027Profile.validation_view)).toEqual([])
})
