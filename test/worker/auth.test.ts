import { describe, expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import app from '../../src/worker/index.js'
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

  test('event append sets the actor and enforces family ownership', async () => {
    const now = new Date().toISOString()
    await env.DB.prepare('INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (1, ?1, ?2, ?3, NULL, ?4)').bind(now, 'organiser@example.test', 'FamilyInvited', JSON.stringify({ family_id: 'fam_owner', email: 'family-owner@example.test', display_name: 'Owner', locale: 'de' })).run()
    const options = { now: () => now, isOrganiser: (email: string) => email === 'organiser@example.test' }
    const link = await issueMagicLink(env.DB, 'family-owner@example.test', null, true, options)
    const session = await redeemMagicLink(env.DB, link.token!, options)
    const response = await app.request('/api/events', { method: 'POST', headers: { cookie: `sid=${session?.session}`, 'content-type': 'application/json' }, body: JSON.stringify({ expected_head: 1, events: [{ type: 'PersonAdded', payload: { person_id: 'per_owner', family_id: 'fam_owner', given_name: 'Own', family_name: 'Er', birthdate: null, role: 'adult' } }] }) }, env)
    expect(response.status).toBe(201)
    expect((await env.DB.prepare('SELECT actor FROM event WHERE seq = 2').first<{ actor: string }>())?.actor).toBe('family-owner@example.test')
    const forbidden = await app.request('/api/events', { method: 'POST', headers: { cookie: `sid=${session?.session}`, 'content-type': 'application/json' }, body: JSON.stringify({ expected_head: 2, events: [{ type: 'PersonAdded', payload: { person_id: 'per_other', family_id: 'fam_other', given_name: 'Other', family_name: 'Family', birthdate: null, role: 'adult' } }] }) }, env)
    expect(forbidden.status).toBe(403)
  })
})
