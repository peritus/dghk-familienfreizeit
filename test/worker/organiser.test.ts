import { expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import app from '../../src/worker/index.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'

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
    env,
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
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: 0,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [
          {
            type: 'FamilyInvited',
            payload: {
              family_id: 'fam_m4',
              email: 'm4@example.test',
              display_name: 'M4',
              locale: 'de',
            },
          },
          {
            type: 'PersonAdded',
            payload: {
              person_id: 'per_m4',
              family_id: 'fam_m4',
              given_name: 'M4',
              family_name: 'Family',
              birthdate: null,
              role: 'adult',
            },
          },
        ],
      }),
    },
    env,
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ head_seq: 2, world: { head_seq: 2 } })

  const invalid = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
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
              birthdate: null,
              role: 'adult',
            },
          },
        ],
      }),
    },
    env,
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
      headers: { cookie, 'content-type': 'application/json' },
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
    env,
  )
  expect(applied.status).toBe(200)

  const log = await app.request('/api/organiser/log', { headers: { cookie } }, env)
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
      headers: { cookie, 'content-type': 'application/json' },
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
    env,
  )
  expect(first.status).toBe(200)

  const stale = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: 0,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        events: [],
      }),
    },
    env,
  )
  expect(stale.status).toBe(409)
  expect(await stale.json()).toMatchObject({ error: 'stale_head', actual_head: 1 })
})
