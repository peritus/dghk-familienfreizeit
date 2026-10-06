import { env, exports } from 'cloudflare:workers'
import { afterEach, expect, test, vi } from 'vitest'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'
import { app } from '../../src/worker'

afterEach(() => vi.restoreAllMocks())

test('health traverses the Worker handler and its real local D1 binding', async () => {
  const response = await exports.default.fetch(new Request('https://example.invalid/api/health'))
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(await response.json()).toEqual({
    status: 'ok',
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    feature_overrides: [],
  })
  expect(await env.DB.prepare('SELECT 40 + 2 AS answer').first('answer')).toBe(42)
})

test.each(['/api', '/api/missing', '/auth'])(
  '%s fails closed with JSON, not an application shell',
  async (path) => {
    const response = await exports.default.fetch(new Request(`https://example.invalid${path}`))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  },
)

test('organiser log requires an authenticated organiser', async () => {
  const response = await exports.default.fetch(
    new Request('https://example.invalid/api/organiser/log'),
  )
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: 'unauthorized' })
})

test('an expired or unknown magic link redirects to the invalid-link screen', async () => {
  const response = await app.request('/auth/unknown-token', {}, env)
  expect(response.status).toBe(302)
  expect(response.headers.get('location')).toBe('/login?error=expired')
})

test('the health route does not accept writes', async () => {
  const response = await exports.default.fetch(
    new Request('https://example.invalid/api/health', { method: 'POST' }),
  )
  expect(response.status).toBe(404)
})

test('D1 errors return an unavailable status without internal details', async () => {
  vi.spyOn(env.DB, 'prepare').mockImplementation(() => {
    throw new Error('private database details')
  })
  const response = await app.request('/api/health', {}, env)
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ status: 'unavailable' })
})

test('health reports set feature bindings as sorted overrides', async () => {
  const response = await app.request(
    '/api/health',
    {},
    {
      ...env,
      DGHK_FEATURE_WORKSHOP_RANKINGS_FAMILY_WORKSHOP_WISHES: 'off',
      DGHK_FEATURE_FAMILY_PREFERENCES_ORGANISER_ROOM_WISHES: 'on',
    },
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    status: 'ok',
    feature_overrides: [
      { feature: 'family-preferences.organiser-room-wishes', value: 'on' },
      { feature: 'workshop-rankings.family-workshop-wishes', value: 'off' },
    ],
  })
})

test.each([
  ['a malformed value', { DGHK_FEATURE_WORKSHOP_RANKINGS_FAMILY_WORKSHOP_WISHES: 'yes' }],
  ['an undeclared feature', { DGHK_FEATURE_ROOM_ASSIGNMENT_FAMILY_ROOM_ALLOCATION: 'on' }],
])('%s fails closed for application routes and is named by health', async (_case, binding) => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const misconfigured = { ...env, ...binding }
  const health = await app.request('/api/health', {}, misconfigured)
  expect(health.status).toBe(503)
  expect(await health.json()).toEqual({
    status: 'misconfigured',
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    invalid_feature_bindings: Object.keys(binding),
  })
  const me = await app.request('/api/me', {}, misconfigured)
  expect(me.status).toBe(503)
  expect(await me.json()).toEqual({
    error: 'invalid_feature_bindings',
    invalid_feature_bindings: Object.keys(binding),
  })
  expect(error).toHaveBeenCalledWith(expect.stringContaining(Object.keys(binding)[0]!))
})
