import { describe, expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import { currentPrincipal } from '../../src/auth/principal.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'

describe('authentication boundary', () => {
  test('magic links are single-use and sessions resolve by email', async () => {
    await env.DB.prepare('INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (1, ?1, ?2, ?3, NULL, ?4)').bind('2026-01-01T00:00:00.000Z', 'organiser@example.test', 'FamilyInvited', JSON.stringify({ family_id: 'fam_auth', email: 'family-auth@example.test', display_name: 'Auth', locale: 'de' })).run()
    const options = { now: () => '2026-01-01T00:00:00.000Z', isOrganiser: (email: string) => email === 'organiser@example.test' }
    const link = await issueMagicLink(env.DB, 'family-auth@example.test', '127.0.0.1', true, options)
    expect(link.token).toBeTruthy()
    const session = await redeemMagicLink(env.DB, link.token!, options)
    expect(session?.email).toBe('family-auth@example.test')
    expect(await redeemMagicLink(env.DB, link.token!, options)).toBeNull()
    expect(await currentPrincipal(env.DB, session?.session, options)).toMatchObject({ kind: 'family', family_id: 'fam_auth' })
  })
})
