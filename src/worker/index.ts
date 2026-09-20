import { Hono, type Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { derive } from '../events/fold.js'
import { readEvents } from '../events/store.js'
import { canonicalEmail } from '../events/types.js'
import { organiserAllowlist } from '../auth/allowlist.js'
import { currentPrincipal, familyForEmail, type Principal } from '../auth/principal.js'
import { expiredSessionCookie } from '../auth/cookies.js'
import { issueMagicLink, redeemMagicLink } from '../auth/service.js'

const app = new Hono<{ Bindings: Env }>()

const isOrganiser = (email: string): boolean => organiserAllowlist.has(email)

app.post('/api/login', async (context) => {
  const email = await context.req.json<{ email?: string }>().then((body) => { try { return canonicalEmail(body.email ?? '') } catch { return null } }).catch(() => null)
  if (!email) return context.json({ accepted: true })
  const events = await readEvents(context.env.DB)
  const world = derive(events)
  const familyExists = familyForEmail(world, email) !== null
  await issueMagicLink(context.env.DB, email, context.req.header('CF-Connecting-IP') ?? null, familyExists, { isOrganiser })
  return context.json({ accepted: true })
})

app.get('/auth/:token', async (context) => {
  let result
  try { result = await redeemMagicLink(context.env.DB, context.req.param('token'), { isOrganiser }) } catch { result = null }
  if (!result) return context.redirect('/login?error=expired', 302)
  setCookie(context, 'sid', result.session, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: isOrganiser(result.email) ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60 })
  return context.redirect('/', 302)
})

app.get('/api/health', async (context) => {
  try {
    const row = await context.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    if (row?.ok === 1) return context.json({ status: 'ok' })
  } catch {
    // Report availability without disclosing binding details or database errors.
  }
  return context.json({ status: 'unavailable' }, 503)
})

app.get('/api/me', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal) { context.header('Set-Cookie', expiredSessionCookie()); return context.json({ error: 'unauthorized' }, 401) }
  return context.json({ principal })
})

app.get('/api/family/view', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal || principal.kind !== 'family') return context.json({ error: 'unauthorized' }, 401)
  return context.json({ family_id: principal.family_id })
})

app.get('/api/organiser', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal || principal.kind !== 'organiser') return context.json({ error: 'not_found' }, 404)
  return context.json({ ok: true })
})

app.notFound((context) => context.json({ error: 'not_found' }, 404))

export default app

async function principalFromContext(context: Context<{ Bindings: Env }>): Promise<Principal | null> {
  return currentPrincipal(context.env.DB, getCookie(context, 'sid'), { isOrganiser })
}
