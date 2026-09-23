import { Hono, type Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { derive } from '../events/fold.js'
import { activeProfile } from '../config/index.js'
import { buildRevision, compatibilityRevision } from '../config/build.js'
import { appendEvents, readEvents, StaleHeadError, type EventDraft } from '../events/store.js'
import {
  kernelPayloadSchemas,
  canonicalEmail,
  parseEvent,
  type JsonValue,
} from '../events/types.js'
import { prepareEventBatch } from '../events/prepare.js'
import { organiserAllowlist } from '../auth/allowlist.js'
import { canAppendEvent } from '../auth/authorization.js'
import { currentPrincipal, familyForEmail, type Principal } from '../auth/principal.js'
import { expiredSessionCookie } from '../auth/cookies.js'
import { issueMagicLink, redeemMagicLink } from '../auth/service.js'
import { organiserScreenRegistry } from '../organiser/registry.js'

const app = new Hono<{ Bindings: Env }>()

const isOrganiser = (email: string): boolean => organiserAllowlist.has(email)

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
  const events = await readEvents(context.env.DB)
  const world = derive(events, activeProfile.validation_view)
  const familyExists = familyForEmail(world, email) !== null
  await issueMagicLink(
    context.env.DB,
    email,
    context.req.header('CF-Connecting-IP') ?? null,
    familyExists,
    { isOrganiser },
  )
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
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: isOrganiser(result.email) ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
  })
  return context.redirect('/', 302)
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
  const events = await readEvents(context.env.DB)
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

  const existing = await readEvents(context.env.DB)
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

  const now = new Date().toISOString()
  const drafts = body.events.map((candidate) => {
    const item = candidate as { type?: unknown; subject?: unknown; payload?: unknown }
    return {
      at: now,
      actor: principal.email,
      subject: item.subject === undefined ? null : (item.subject as string | null),
      type: item.type as string,
      payload: item.payload as JsonValue,
    } satisfies EventDraft
  })
  try {
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
      eventSchemas(),
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
      const current = await readEvents(context.env.DB)
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
  const existing = await readEvents(context.env.DB)
  const world = derive(existing, activeProfile.validation_view)
  const now = new Date().toISOString()
  const drafts = body.events.map((draft) => ({
    at: now,
    actor: principal.email,
    subject: draft.subject ?? null,
    type: draft.type,
    payload: draft.payload as JsonValue,
  }))
  try {
    const schemas = eventSchemas()
    const events = drafts.map((draft, index) =>
      parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
    )
    if (
      events.some(
        (event) => !canAppendEvent(principal, event, world, activeProfile.validation_view),
      )
    )
      throw new Error('forbidden')
    derive([...existing, ...events], activeProfile.validation_view)
    await appendEvents(
      context.env.DB,
      expectedHead,
      events.map(({ seq: _seq, ...event }) => event),
      eventSchemas(),
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
  return currentPrincipal(context.env.DB, getCookie(context, 'sid'), { isOrganiser })
}

function eventSchemas() {
  return { ...kernelPayloadSchemas, ...activeProfile.validation_view.event_payload_schemas }
}
