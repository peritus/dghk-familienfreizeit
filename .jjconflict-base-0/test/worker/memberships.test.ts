import { test, expect } from 'vitest'
import { env } from 'cloudflare:workers'
import { app } from '../../src/worker/index.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'

test('one email can access both apps through one session, and membership follows current family email', async () => {
  await env.DB.prepare(
    'INSERT INTO event(seq,at,actor,type,subject,payload) VALUES (1,?1,?2,?3,?4,?5)',
  )
    .bind(
      '2026-10-11T00:00:00Z',
      'both@example.test',
      'FamilyInvited',
      'fam_both',
      JSON.stringify({
        family_id: 'fam_both',
        email: 'both@example.test',
        display_name: 'Both',
        locale: 'de',
      }),
    )
    .run()
  const options = { isOrganiser: (email: string) => email === 'both@example.test' }
  const link = await issueMagicLink(env.DB, 'BOTH@example.test', null, true, options)
  const session = await redeemMagicLink(env.DB, link.token!, options)
  const bindings = { ...env, DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'both@example.test' }
  const response = await app.request(
    '/api/me',
    { headers: { cookie: `sid=${session!.session}` } },
    bindings,
  )
  expect(await response.json()).toEqual({
    principal: {
      email: 'both@example.test',
      roles: ['family', 'organiser'],
      family_id: 'fam_both',
    },
  })
  const organiser = await app.request(
    '/api/organiser/log',
    { headers: { cookie: `sid=${session!.session}` } },
    bindings,
  )
  expect(organiser.status).toBe(200)
  await env.DB.prepare(
    'INSERT INTO event(seq,at,actor,type,subject,payload) VALUES (2,?1,?2,?3,?4,?5)',
  )
    .bind(
      '2026-10-11T00:00:00Z',
      'both@example.test',
      'FamilyEmailChanged',
      'fam_both',
      JSON.stringify({
        family_id: 'fam_both',
        old_email: 'both@example.test',
        new_email: 'other@example.test',
      }),
    )
    .run()
  const after = await app.request(
    '/api/me',
    { headers: { cookie: `sid=${session!.session}` } },
    bindings,
  )
  expect(
    ((await after.json()) as { principal: { roles: string[]; family_id: string | null } })
      .principal,
  ).toEqual({ email: 'both@example.test', roles: ['organiser'], family_id: null })
})
