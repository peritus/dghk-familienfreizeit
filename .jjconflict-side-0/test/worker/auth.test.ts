import { describe, expect, test, vi } from 'vitest'
import { env } from 'cloudflare:workers'
import { activeProfile } from '../../src/config/index.js'
import app from '../../src/worker/index.js'
import { currentPrincipal } from '../../src/auth/principal.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'

describe('authentication boundary', () => {
  test('local login mode prints a magic link and redeems it to the organiser host', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const localEnv = {
      ...env,
      DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE: 'true' as const,
    }
    try {
      const response = await app.request(
        'https://example.invalid/api/login',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'organiser@example.test' }),
        },
        localEnv,
      )
      expect(response.status).toBe(200)
      const output = String(log.mock.calls[0]?.[0])
      expect(output).toMatch(
        /^\[DANGEROUS DEBUG\] magic link for organiser@example\.test: https:\/\/example\.invalid\/auth\//,
      )

      const link = new URL(output.slice(output.indexOf('https://')))
      const redeemed = await app.request(link.pathname, {}, localEnv)
      expect(redeemed.status).toBe(302)
      expect(redeemed.headers.get('location')).toBe('/organiser')
    } finally {
      log.mockRestore()
    }
  })

  test('magic links are single-use and sessions resolve by email', async () => {
    await env.DB.prepare(
      'INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (1, ?1, ?2, ?3, NULL, ?4)',
    )
      .bind(
        '2026-01-01T00:00:00.000Z',
        'organiser@example.test',
        'FamilyInvited',
        JSON.stringify({
          family_id: 'fam_auth',
          email: 'family-auth@example.test',
          display_name: 'Auth',
          locale: 'de',
        }),
      )
      .run()
    await env.DB.prepare(
      'INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (2, ?1, ?2, ?3, NULL, ?4)',
    )
      .bind(
        '2026-01-01T00:00:00.000Z',
        'organiser@example.test',
        'BuildingAdded',
        JSON.stringify({ building_id: 'bld_auth', name: 'Auth House', sort_key: 1 }),
      )
      .run()
    const options = {
      now: () => '2026-01-01T00:00:00.000Z',
      isOrganiser: (email: string) => email === 'organiser@example.test',
    }
    const link = await issueMagicLink(
      env.DB,
      'family-auth@example.test',
      '127.0.0.1',
      true,
      options,
    )
    expect(link.token).toBeTruthy()
    const session = await redeemMagicLink(env.DB, link.token!, options)
    expect(session?.email).toBe('family-auth@example.test')
    expect(await redeemMagicLink(env.DB, link.token!, options)).toBeNull()
    expect(
      await currentPrincipal(env.DB, session?.session, options, activeProfile.validation_view),
    ).toMatchObject({
      kind: 'family',
      family_id: 'fam_auth',
    })
  })

  test('event append sets the actor and enforces family ownership', async () => {
    const now = new Date().toISOString()
    await env.DB.prepare(
      'INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (1, ?1, ?2, ?3, NULL, ?4)',
    )
      .bind(
        now,
        'organiser@example.test',
        'FamilyInvited',
        JSON.stringify({
          family_id: 'fam_owner',
          email: 'family-owner@example.test',
          display_name: 'Owner',
          locale: 'de',
        }),
      )
      .run()
    const options = {
      now: () => now,
      isOrganiser: (email: string) => email === 'organiser@example.test',
    }
    const link = await issueMagicLink(env.DB, 'family-owner@example.test', null, true, options)
    const session = await redeemMagicLink(env.DB, link.token!, options)
    const response = await app.request(
      '/api/events',
      {
        method: 'POST',
        headers: { cookie: `sid=${session?.session}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          expected_head: 1,
          events: [
            {
              type: 'PersonAdded',
              payload: {
                person_id: 'per_owner',
                family_id: 'fam_owner',
                given_name: 'Own',
                family_name: 'Er',
                birthdate: null,
                role: 'adult',
              },
            },
          ],
        }),
      },
      env,
    )
    expect(response.status).toBe(201)
    expect(
      (await env.DB.prepare('SELECT actor FROM event WHERE seq = 2').first<{ actor: string }>())
        ?.actor,
    ).toBe('family-owner@example.test')
    const forbidden = await app.request(
      '/api/events',
      {
        method: 'POST',
        headers: { cookie: `sid=${session?.session}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          expected_head: 2,
          events: [
            {
              type: 'PersonAdded',
              payload: {
                person_id: 'per_other',
                family_id: 'fam_other',
                given_name: 'Other',
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
    expect(forbidden.status).toBe(403)
  })

  test('rejects a family LabelSet on a key that is not declared family_writable', async () => {
    const now = new Date().toISOString()
    await env.DB.prepare(
      'INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (1, ?1, ?2, ?3, NULL, ?4)',
    )
      .bind(
        now,
        'organiser@example.test',
        'FamilyInvited',
        JSON.stringify({
          family_id: 'fam_labelset',
          email: 'family-labelset@example.test',
          display_name: 'Label',
          locale: 'de',
        }),
      )
      .run()
    const options = {
      now: () => now,
      isOrganiser: (email: string) => email === 'organiser@example.test',
    }
    const link = await issueMagicLink(env.DB, 'family-labelset@example.test', null, true, options)
    const session = await redeemMagicLink(env.DB, link.token!, options)
    const response = await app.request(
      '/api/events',
      {
        method: 'POST',
        headers: { cookie: `sid=${session?.session}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          expected_head: 1,
          events: [
            {
              type: 'LabelSet',
              payload: {
                entity_id: 'fam_labelset',
                key: 'role',
                value: 'adult',
                strength: null,
                note: null,
              },
            },
          ],
        }),
      },
      env,
    )
    expect(response.status).toBe(403)
  })
})
