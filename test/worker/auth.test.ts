import { describe, expect, test, vi } from 'vitest'
import { env } from 'cloudflare:workers'
import { activeProfile } from '../../src/config/index.js'
import { app } from '../../src/worker/index.js'
import { currentPrincipal } from '../../src/auth/principal.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'

const organiserEnv = {
  ...env,
  DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test' as const,
}

describe('authentication boundary', () => {
  test('local login mode prints a magic link and redeems it to the organiser host', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const localEnv = {
      ...env,
      DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE: 'true' as const,
      DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test' as const,
      DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN: 'true' as const,
    }
    try {
      const response = await app.request(
        'http://127.0.0.1/api/login',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'organiser@example.test' }),
        },
        localEnv,
      )
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        accepted: true,
        magic_link: expect.stringMatching(/^http:\/\/127\.0\.0\.1\/auth\//),
      })
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE is enabled: magic links will be printed to Worker logs',
        ),
      )
      const output = String(log.mock.calls[0]?.[0])
      expect(output).toMatch(
        /^\[DANGEROUS DEBUG\] magic link for organiser@example\.test: http:\/\/127\.0\.0\.1\/auth\//,
      )

      const link = new URL(output.slice(output.indexOf('http://')))
      const redeemed = await app.request(link.pathname, {}, localEnv)
      expect(redeemed.status).toBe(302)
      expect(redeemed.headers.get('location')).toBe('/apps')
      expect(redeemed.headers.get('set-cookie')).toContain('Secure')
    } finally {
      log.mockRestore()
      warn.mockRestore()
    }
  })

  test('demo login never returns a link without the runtime organiser allowlist', async () => {
    const response = await app.request(
      'http://127.0.0.1/api/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'organiser@example.test' }),
      },
      {
        ...env,
        DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN: 'true' as const,
      },
    )

    expect(await response.json()).toEqual({ accepted: true })
  })

  test('the explicit dangerous development flag permits an insecure session cookie', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const localEnv = {
      ...env,
      DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE: 'true' as const,
      DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES: 'true' as const,
      DGHK_DEBUG_ONLY_LOCAL_PREVIEW_HOST: 'preview.tailnet.ts.net',
      DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test' as const,
    }
    try {
      const response = await app.request(
        'http://preview.tailnet.ts.net/api/login',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'organiser@example.test' }),
        },
        localEnv,
      )
      expect(response.status).toBe(200)
      const output = String(log.mock.calls[0]?.[0])
      const link = new URL(output.slice(output.indexOf('http://')))
      const redeemed = await app.request(link.pathname, {}, localEnv)
      expect(redeemed.headers.get('set-cookie')).not.toContain('Secure')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES is enabled: session cookies will not require HTTPS',
        ),
      )
    } finally {
      log.mockRestore()
      warn.mockRestore()
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
      now: () => '2027-01-01T00:00:00.000Z',
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

  test('the generic event endpoint is unavailable to family sessions', async () => {
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
    const options = { isOrganiser: () => false }
    const link = await issueMagicLink(env.DB, 'family-owner@example.test', null, true, options)
    const session = await redeemMagicLink(env.DB, link.token!, options)
    const response = await app.request(
      '/api/events',
      {
        method: 'POST',
        headers: {
          cookie: `sid=${session!.session}`,
          origin: 'http://localhost',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ expected_head: 1, events: [] }),
      },
      organiserEnv,
    )
    expect(response.status).toBe(401)
    expect(await env.DB.prepare('SELECT COUNT(*) FROM event').first('COUNT(*)')).toBe(1)
  })

  test('generic event append reports stale lower and forward heads before parsing', async () => {
    await env.DB.prepare(
      'INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (1, ?1, ?2, ?3, NULL, ?4)',
    )
      .bind(
        '2026-01-01T00:00:00.000Z',
        'organiser@example.test',
        'FamilyInvited',
        JSON.stringify({
          family_id: 'fam_stale',
          email: 'stale@example.test',
          display_name: 'Stale',
          locale: 'de',
        }),
      )
      .run()
    const options = {
      now: () => '2027-01-01T00:00:00.000Z',
      isOrganiser: (email: string) => email === 'organiser@example.test',
    }
    const link = await issueMagicLink(env.DB, 'organiser@example.test', null, false, options)
    const session = await redeemMagicLink(env.DB, link.token!, options)
    const request = (expected_head: number) =>
      app.request(
        '/api/events',
        {
          method: 'POST',
          headers: {
            cookie: `sid=${session?.session}`,
            origin: 'http://localhost',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ expected_head, events: [] }),
        },
        organiserEnv,
      )

    const lower = await request(0)
    expect(lower.status).toBe(409)
    expect(await lower.json()).toMatchObject({
      error: 'stale_head',
      expected_head: 0,
      actual_head: 1,
    })

    const forward = await request(2)
    expect(forward.status).toBe(409)
    expect(await forward.json()).toMatchObject({
      error: 'stale_head',
      expected_head: 2,
      actual_head: 1,
    })
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
        headers: {
          cookie: `sid=${session?.session}`,
          origin: 'http://localhost',
          'content-type': 'application/json',
        },
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
      organiserEnv,
    )
    expect(response.status).toBe(401)
  })

  test('logout revokes the session and mutating requests require a same-origin header', async () => {
    const options = {
      now: () => '2027-01-01T00:00:00.000Z',
      isOrganiser: (email: string) => email === 'organiser@example.test',
    }
    const link = await issueMagicLink(env.DB, 'organiser@example.test', null, false, options)
    const session = await redeemMagicLink(env.DB, link.token!, options)
    const cookie = `sid=${session?.session}`
    const missingOrigin = await app.request(
      '/api/logout',
      { method: 'POST', headers: { cookie } },
      organiserEnv,
    )
    expect(missingOrigin.status).toBe(403)
    const foreignOrigin = await app.request(
      '/api/logout',
      { method: 'POST', headers: { cookie, origin: 'https://attacker.example' } },
      organiserEnv,
    )
    expect(foreignOrigin.status).toBe(403)

    const loggedOut = await app.request(
      '/api/logout',
      { method: 'POST', headers: { cookie, origin: 'http://localhost' } },
      organiserEnv,
    )
    expect(loggedOut.status).toBe(200)
    expect(loggedOut.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(
      await currentPrincipal(env.DB, session?.session, options, activeProfile.validation_view),
    ).toBeNull()
  })

  test('worker responses include browser security headers', async () => {
    const response = await app.request('/api/health', {}, env)
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
