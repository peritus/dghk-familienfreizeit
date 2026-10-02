import { Hono, type Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { assertAppendableWorld, derive } from '../events/fold.js'
import { activeProfile } from '../config/index.js'
import { buildRevision, compatibilityRevision } from '../config/build.js'
import { appendEvents, readEvents, StaleHeadError, type EventDraft } from '../events/store.js'
import { canonicalEmail, eventPayloadSchemas, parseEvent, type JsonValue } from '../events/types.js'
import { prepareEventBatch } from '../events/prepare.js'
import { organiserAllowlist } from '../auth/allowlist.js'
import { canAppendEvent } from '../auth/authorization.js'
import { currentPrincipal, familyForEmail, type Principal } from '../auth/principal.js'
import { expiredSessionCookie } from '../auth/cookies.js'
import { issueMagicLink, redeemMagicLink } from '../auth/service.js'
import { organiserScreenRegistry } from '../organiser/registry.js'

const app = new Hono<{ Bindings: Env }>()

const isOrganiser = (email: string): boolean => organiserAllowlist.has(email)

let warnedMagicLinkConsole = false
let warnedInsecureSessionCookies = false

app.use('*', async (context, next) => {
  warnDangerousDevelopmentBindings(context.env)
  await next()
})

app.post('/api/login', async (context) => {
  const email = await context.req
    .json<{ email?: string }>()
    .then((body) => {
      try {
        return canonicalEmail(body.email ?? '')
      } catch {
        return null
      }
    })
    .catch(() => null)
  if (!email) return context.json({ accepted: true })
  const events = await readEvents(context.env.DB, activeProfile.validation_view)
  const world = derive(events, activeProfile.validation_view)
  const familyExists = familyForEmail(world, email) !== null
  const result = await issueMagicLink(
    context.env.DB,
    email,
    context.req.header('CF-Connecting-IP') ?? null,
    familyExists,
    { isOrganiser },
  )
  if (result.token && shouldShowMagicLinkOnConsole(context)) {
    const magicLink = new URL(`/auth/${result.token}`, context.req.url)
    console.log(`[DANGEROUS DEBUG] magic link for ${email}: ${magicLink}`)
  }
  return context.json({ accepted: true })
})

app.get('/auth/:token', async (context) => {
  let result
  try {
    result = await redeemMagicLink(context.env.DB, context.req.param('token'), { isOrganiser })
  } catch {
    result = null
  }
  if (!result) return context.redirect('/login?error=expired', 302)
  setCookie(context, 'sid', result.session, {
    httpOnly: true,
    secure: !shouldAllowInsecureSessionCookies(context),
    sameSite: 'Lax',
    path: '/',
    maxAge: isOrganiser(result.email) ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
  })
  return context.redirect(isOrganiser(result.email) ? '/organiser' : '/', 302)
})

app.get('/api/health', async (context) => {
  try {
    const row = await context.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    if (row?.ok === 1)
      return context.json({
        status: 'ok',
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
      })
  } catch {
    // Report availability without disclosing binding details or database errors.
  }
  return context.json({ status: 'unavailable' }, 503)
})

app.get('/api/me', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal) {
    context.header('Set-Cookie', expiredSessionCookie())
    return context.json({ error: 'unauthorized' }, 401)
  }
  return context.json({ principal })
})

app.get('/api/organiser/log', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal || principal.kind !== 'organiser')
    return context.json({ error: 'unauthorized' }, 401)
  const events = await readEvents(context.env.DB, activeProfile.validation_view)
  return context.json({
    events,
    head_seq: events.length,
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    screen_registry: organiserScreenRegistry,
  })
})

app.post('/api/organiser/apply', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal || principal.kind !== 'organiser')
    return context.json({ error: 'unauthorized' }, 401)

  const body = await context.req
    .json<{
      input_seq?: unknown
      events?: unknown
      build_revision?: unknown
      compatibility_revision?: unknown
    }>()
    .catch(() => null)
  if (
    !body ||
    !Number.isSafeInteger(body.input_seq) ||
    (body.input_seq as number) < 0 ||
    !Array.isArray(body.events) ||
    typeof body.build_revision !== 'string' ||
    !Number.isSafeInteger(body.compatibility_revision)
  )
    return context.json({ error: 'invalid_request' }, 400)
  if (
    body.build_revision !== buildRevision ||
    body.compatibility_revision !== compatibilityRevision
  )
    return context.json(
      {
        error: 'stale_build',
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
      },
      409,
    )

  const existing = await readEvents(context.env.DB, activeProfile.validation_view)
  const inputSeq = body.input_seq as number
  if (inputSeq !== existing.length)
    return context.json(
      {
        error: 'stale_head',
        expected_head: inputSeq,
        actual_head: existing.length,
        events: existing.filter((event) => event.seq > inputSeq),
      },
      409,
    )

  try {
    const now = new Date().toISOString()
    const drafts = body.events.map((candidate) => eventDraft(candidate, principal.email, now))
    const events = prepareEventBatch(existing, drafts, activeProfile.validation_view)
    if (
      events.some(
        (event) =>
          !canAppendEvent(
            principal,
            event,
            derive(existing, activeProfile.validation_view),
            activeProfile.validation_view,
          ),
      )
    )
      return context.json({ error: 'forbidden' }, 403)
    const appended = await appendEvents(
      context.env.DB,
      inputSeq,
      events.map(({ seq: _seq, ...event }) => event),
      activeProfile.validation_view,
    )
    const world = derive([...existing, ...appended], activeProfile.validation_view)
    return context.json({
      events: appended,
      head_seq: inputSeq + appended.length,
      world,
      build_revision: buildRevision,
      compatibility_revision: compatibilityRevision,
    })
  } catch (error) {
    if (error instanceof StaleHeadError) {
      const current = await readEvents(context.env.DB, activeProfile.validation_view)
      return context.json(
        {
          error: 'stale_head',
          expected_head: inputSeq,
          actual_head: current.length,
          events: current.filter((event) => event.seq > inputSeq),
        },
        409,
      )
    }
    return context.json({ error: 'invalid_event' }, 400)
  }
})

app.post('/api/events', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal) return context.json({ error: 'unauthorized' }, 401)
  const body = await context.req
    .json<{
      expected_head?: number
      events?: Array<{ type: string; subject?: string | null; payload?: unknown }>
    }>()
    .catch(() => null)
  if (
    !body ||
    typeof body.expected_head !== 'number' ||
    !Number.isSafeInteger(body.expected_head) ||
    body.expected_head < 0 ||
    !Array.isArray(body.events)
  )
    return context.json({ error: 'invalid_request' }, 400)
  const expectedHead: number = body.expected_head
  const existing = await readEvents(context.env.DB, activeProfile.validation_view)
  if (expectedHead !== existing.length)
    return context.json(
      {
        error: 'stale_head',
        expected_head: expectedHead,
        actual_head: existing.length,
        events: existing.filter((event) => event.seq > expectedHead),
      },
      409,
    )
  const world = derive(existing, activeProfile.validation_view)
  const now = new Date().toISOString()
  try {
    const drafts = body.events.map((draft) => eventDraft(draft, principal.email, now))
    const schemas = eventPayloadSchemas(activeProfile.validation_view)
    const events = drafts.map((draft, index) =>
      parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
    )
    if (
      events.some(
        (event) => !canAppendEvent(principal, event, world, activeProfile.validation_view),
      )
    )
      throw new Error('forbidden')
    assertAppendableWorld(derive([...existing, ...events], activeProfile.validation_view))
    await appendEvents(
      context.env.DB,
      expectedHead,
      events.map(({ seq: _seq, ...event }) => event),
      activeProfile.validation_view,
    )
    return context.json({ head: expectedHead + events.length }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'forbidden')
      return context.json({ error: 'forbidden' }, 403)
    if (error instanceof StaleHeadError)
      return context.json(
        { error: 'stale_head', expected_head: error.expected, actual_head: error.actual },
        409,
      )
    return context.json({ error: 'invalid_event' }, 400)
  }
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

async function principalFromContext(
  context: Context<{ Bindings: Env }>,
): Promise<Principal | null> {
  return currentPrincipal(
    context.env.DB,
    getCookie(context, 'sid'),
    { isOrganiser },
    activeProfile.validation_view,
  )
}

function shouldShowMagicLinkOnConsole(context: Context<{ Bindings: Env }>): boolean {
  const hostname = new URL(context.req.url).hostname
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    context.env.DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE === 'true'
  )
}

function shouldAllowInsecureSessionCookies(context: Context<{ Bindings: Env }>): boolean {
  return context.env.DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES === 'true'
}

function warnDangerousDevelopmentBindings(env: Env): void {
  if (
    env.DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE === 'true' &&
    !warnedMagicLinkConsole
  ) {
    console.warn(
      '[WARN] DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE is enabled: magic links will be printed to Worker logs. This exposes authentication tokens and is dangerous; never enable it in production.',
    )
    warnedMagicLinkConsole = true
  }
  if (
    env.DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES === 'true' &&
    !warnedInsecureSessionCookies
  ) {
    console.warn(
      '[WARN] DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES is enabled: session cookies will not require HTTPS. This can expose sessions over plain HTTP and is dangerous; never enable it in production.',
    )
    warnedInsecureSessionCookies = true
  }
}

function eventDraft(candidate: unknown, actor: string, at: string): EventDraft {
  if (!candidate || typeof candidate !== 'object') throw new Error('invalid event draft')
  const item = candidate as { type?: unknown; subject?: unknown; payload?: unknown }
  if (typeof item.type !== 'string') throw new Error('invalid event draft')
  if (item.subject !== undefined && item.subject !== null && typeof item.subject !== 'string')
    throw new Error('invalid event draft')
  return {
    at,
    actor,
    subject: item.subject === undefined ? null : item.subject,
    type: item.type,
    payload: item.payload as JsonValue,
  }
}
