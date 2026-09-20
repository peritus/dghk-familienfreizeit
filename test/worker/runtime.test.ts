import { env, exports } from 'cloudflare:workers'
import { afterEach, expect, test, vi } from 'vitest'
import app from '../../src/worker'

afterEach(() => vi.restoreAllMocks())

test('health traverses the Worker handler and its real local D1 binding', async () => {
  const response = await exports.default.fetch(new Request('https://example.invalid/api/health'))
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(await response.json()).toEqual({ status: 'ok' })
  expect(await env.DB.prepare('SELECT 40 + 2 AS answer').first('answer')).toBe(42)
})

test.each(['/api', '/api/missing', '/api/organiser/log', '/auth']) (
  '%s fails closed with JSON, not an application shell', async (path) => {
    const response = await exports.default.fetch(new Request(`https://example.invalid${path}`))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  },
)

test('an expired or unknown magic link redirects to the invalid-link screen', async () => {
  const response = await app.request('/auth/unknown-token', {}, env)
  expect(response.status).toBe(302)
  expect(response.headers.get('location')).toBe('/login?error=expired')
})

test('the health route does not accept writes', async () => {
  const response = await exports.default.fetch(new Request('https://example.invalid/api/health', { method: 'POST' }))
  expect(response.status).toBe(404)
})

test('D1 errors return an unavailable status without internal details', async () => {
  vi.spyOn(env.DB, 'prepare').mockImplementation(() => { throw new Error('private database details') })
  const response = await app.request('/api/health', {}, env)
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ status: 'unavailable' })
})
