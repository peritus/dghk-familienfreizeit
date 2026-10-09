import { EventInputError } from '../events/types.js'
import { eventInputFindings } from '../organiser/proposal.js'
import {
  admitProfileProposal,
  CapacityReductionError,
  capacityReductionFinding,
  appendInvariantFindings,
} from '../organiser/proposal.js'
import { Hono, type Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { tracing } from 'cloudflare:workers'
import { derive, AppendInvariantError, type World } from '../events/fold.js'
import { activeProfile } from '../config/index.js'
import { buildRevision, compatibilityRevision } from '../config/build.js'
import { appendCanonicalEvents, readEvents, StaleHeadError } from '../events/store.js'
import {
  canonicalEmail,
  eventPayloadSchemas,
  parseEvent,
  type Event,
  type EventDraft,
  type JsonValue,
} from '../events/types.js'
import { organiserAllowlist } from '../auth/allowlist.js'
import { authorizeEventBatch, type FamilyLabelOffered } from '../auth/authorization.js'
import { deriveFeatureView, effectiveFeatureIds } from '../derive/features.js'
import { derivePhaseView, phaseActivation } from '../derive/phases.js'
import { familyGovernedLabelKeys } from '../modules/family-preferences/index.js'
import { currentPrincipal, familyForEmail, type Principal } from '../auth/principal.js'
import { expiredSessionCookie } from '../auth/cookies.js'
import { maxEventsPerBatch } from './request-limits.js'
import { readFeatureBindings, type FeatureBindingState } from './feature-bindings.js'
import {
  AreaNotReadyError,
  WorkshopReviewRequiredError,
  ClosingPayloadSuppliedError,
  closingEventAreas,
  fillClosingPayloads,
} from './closing.js'
import {
  cleanupOperationalRows,
  consumeLoginRateLimits,
  consumeRateLimit,
  issueMagicLink,
  redeemMagicLink,
  revokeSession,
} from '../auth/service.js'
import { organiserScreenRegistry } from '../organiser/registry.js'

const app = new Hono<{ Bindings: Env }>()
const maxJsonBodyBytes = 256 * 1024
const maxJsonDepth = 10
const maxJsonStringLength = 4096
const familyEventLimit = 120
const eventRateLimitDuration = 60 * 60 * 1000

let warnedMagicLinkConsole = false
let warnedInsecureSessionCookies = false
let warnedDemoLogin = false
let announcedFeatureBindings = ''

app.use('*', async (context, next) => {
  warnDangerousDevelopmentBindings(context.env)
  const features = featureBindings(context.env)
  if (features.invalid.length > 0 && new URL(context.req.url).pathname !== '/api/health') {
    context.res = context.json(
      { error: 'invalid_feature_bindings', invalid_feature_bindings: features.invalid },
      503,
    )
    applySecurityHeaders(context)
    return
  }
  await next()
  applySecurityHeaders(context)
})

app.post('/api/login', async (context) => {
  const body = await readJsonBody<{ email?: string }>(context)
  const email = (() => {
    try {
      return canonicalEmail(body?.email ?? '')
    } catch {
      return null
    }
  })()
  if (!email) return context.json({ accepted: true })
  const now = new Date().toISOString()
  const ip = context.req.header('CF-Connecting-IP') ?? null
  if (!(await consumeLoginRateLimits(context.env.DB, email, ip, now)))
    return context.json({ accepted: true })
  const events = await readEventLog(context)
  const world = deriveEventWorld(events)
  const familyExists = familyForEmail(world, email) !== null
  const isOrganiser = organiserPredicate(context.env)
  const result = await issueMagicLink(context.env.DB, email, ip, familyExists, {
    isOrganiser,
    now: () => now,
    rate_limits_consumed: true,
  })
  if (result.token && shouldShowMagicLinkOnConsole(context)) {
    const magicLink = new URL(`/auth/${result.token}`, context.req.url)
    console.log(`[DANGEROUS DEBUG] magic link for ${email}: ${magicLink}`)
  }
  const response: { accepted: true; magic_link?: string } = { accepted: true }
  if (
    result.token &&
    isOrganiser(email) &&
    context.env.DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN === 'true'
  ) {
    response.magic_link = new URL(`/auth/${result.token}`, context.req.url).toString()
  }
  return context.json(response)
})

app.get('/auth/:token', async (context) => {
  const isOrganiser = organiserPredicate(context.env)
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
  const features = featureBindings(context.env)
  if (features.invalid.length > 0)
    return context.json(
      {
        status: 'misconfigured',
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        invalid_feature_bindings: features.invalid,
      },
      503,
    )
  try {
    const row = await context.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    if (row?.ok === 1)
      return context.json({
        status: 'ok',
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        feature_overrides: features.overrides,
      })
  } catch {
    // Report availability without disclosing binding details or database errors.
  }
  return context.json({ status: 'unavailable' }, 503)
})

app.get('/api/me', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal) {
    context.header('Set-Cookie', expiredSessionCookie(!shouldAllowInsecureSessionCookies(context)))
    return context.json({ error: 'unauthorized' }, 401)
  }
  return context.json({ principal })
})

app.post('/api/logout', async (context) => {
  if (!hasTrustedOrigin(context)) return context.json({ error: 'origin_required' }, 403)
  const raw = getCookie(context, 'sid')
  if (raw) await revokeSession(context.env.DB, raw)
  context.header('Set-Cookie', expiredSessionCookie(!shouldAllowInsecureSessionCookies(context)))
  return context.json({ ok: true })
})

app.get('/api/organiser/log', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal || principal.kind !== 'organiser')
    return context.json({ error: 'unauthorized' }, 401)
  const events = await readEventLog(context)
  return context.json({
    events,
    head_seq: events.length,
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
    screen_registry: organiserScreenRegistry,
    feature_overrides: featureBindings(context.env).overrides,
  })
})

app.post('/api/organiser/apply', async (context) => {
  const principal = await principalFromContext(context)
  if (!principal || principal.kind !== 'organiser')
    return context.json({ error: 'unauthorized' }, 401)
  if (!hasTrustedOrigin(context)) return context.json({ error: 'origin_required' }, 403)

  const body = await readJsonBody<{
    input_seq?: unknown
    events?: unknown
    build_revision?: unknown
    compatibility_revision?: unknown
  }>(context)
  if (
    !body ||
    !Number.isSafeInteger(body.input_seq) ||
    (body.input_seq as number) < 0 ||
    !Array.isArray(body.events) ||
    body.events.length > maxEventsPerBatch ||
    !isBoundedJsonValue(body.events) ||
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

  const existing = await readEventLog(context)
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
    const drafts = tracing.enterSpan('events.fill_closing_payloads', () =>
      fillClosingPayloads(
        existing,
        (body.events as unknown[]).map((candidate) => eventDraft(candidate, principal.email, now)),
        activeProfile,
        { build_revision: buildRevision, compatibility_revision: compatibilityRevision },
      ),
    )
    const prepared = tracing.enterSpan('events.prepare_and_validate', (span) => {
      span.setAttribute('event.count', drafts.length)
      return admitProfileProposal(existing, drafts, activeProfile, {
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
      })
    })
    const events = prepared.events
    const forbidden = tracing.enterSpan('events.authorize_batch', (span) => {
      span.setAttribute('event.count', events.length)
      return !authorizeEventBatch(
        principal,
        events,
        deriveEventWorld(existing),
        activeProfile.validation_view,
      )
    })
    if (forbidden) return context.json({ error: 'forbidden' }, 403)
    const appended = await appendEventBatch(context, inputSeq, events)
    const world = prepared.world
    return context.json({
      events: appended,
      head_seq: inputSeq + appended.length,
      world,
      build_revision: buildRevision,
      compatibility_revision: compatibilityRevision,
      feature_overrides: featureBindings(context.env).overrides,
    })
  } catch (error) {
    if (error instanceof EventInputError)
      return context.json(
        {
          error: 'attention_required',
          findings: eventInputFindings(
            error,
            activeProfile,
            buildRevision,
            new Date().toISOString(),
          ),
        },
        400,
      )
    if (error instanceof AppendInvariantError)
      return context.json(
        {
          error: 'attention_required',
          findings: appendInvariantFindings(
            error,
            activeProfile,
            buildRevision,
            new Date().toISOString(),
          ),
        },
        400,
      )
    if (error instanceof CapacityReductionError)
      return context.json(
        {
          error: 'attention_required',
          findings: [
            capacityReductionFinding(error, activeProfile, buildRevision, new Date().toISOString()),
          ],
        },
        409,
      )
    if (error instanceof WorkshopReviewRequiredError)
      return context.json({ error: 'workshop_review_required', findings: error.findings }, 409)
    if (error instanceof AreaNotReadyError)
      return context.json(
        { error: 'area_not_ready', area: error.area, findings: error.findings },
        409,
      )
    if (error instanceof ClosingPayloadSuppliedError)
      return context.json({ error: 'closing_payload_supplied', type: error.type }, 400)
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
  if (!hasTrustedOrigin(context)) return context.json({ error: 'origin_required' }, 403)
  const body = await readJsonBody<{
    expected_head?: number
    events?: Array<{ type: string; subject?: string | null; payload?: unknown }>
  }>(context)
  if (
    !body ||
    typeof body.expected_head !== 'number' ||
    !Number.isSafeInteger(body.expected_head) ||
    body.expected_head < 0 ||
    !Array.isArray(body.events) ||
    body.events.length > maxEventsPerBatch ||
    !isBoundedJsonValue(body.events)
  )
    return context.json({ error: 'invalid_request' }, 400)
  const now = new Date().toISOString()
  if (
    principal.kind === 'family' &&
    !(await consumeRateLimit(
      context.env.DB,
      `events:${principal.email}`,
      familyEventLimit,
      eventRateLimitDuration,
      now,
    ))
  ) {
    context.header('Retry-After', '3600')
    return context.json({ error: 'rate_limited' }, 429)
  }
  const expectedHead: number = body.expected_head
  const existing = await readEventLog(context)
  if (expectedHead !== existing.length)
    return context.json(
      {
        error: 'stale_head',
        expected_head: expectedHead,
        actual_head: existing.length,
        ...(principal.kind === 'organiser'
          ? { events: existing.filter((event) => event.seq > expectedHead) }
          : {}),
      },
      409,
    )
  const world = deriveEventWorld(existing)
  try {
    const drafts = body.events.map((draft) => eventDraft(draft, principal.email, now))
    // Closings are filled only on the organiser apply path (phases.md §5).
    const closings = closingEventAreas(activeProfile.modules)
    if (drafts.some(({ type }) => closings.has(type) || type === 'WorkshopWarningsAcknowledged'))
      throw new Error('forbidden')
    const schemas = eventPayloadSchemas(activeProfile.validation_view)
    const events = tracing.enterSpan('events.parse_and_validate', (span) => {
      const parsed = drafts.map((draft, index) =>
        parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
      )
      span.setAttribute('event.count', parsed.length)
      return parsed
    })
    const forbidden = tracing.enterSpan('events.authorize_batch', (span) => {
      span.setAttribute('event.count', events.length)
      return !authorizeEventBatch(
        principal,
        events,
        world,
        activeProfile.validation_view,
        principal.kind === 'family' ? familyLabelGate(world, context.env) : undefined,
      )
    })
    if (forbidden) throw new Error('forbidden')
    tracing.enterSpan('events.validate_world', () =>
      admitProfileProposal(existing, events, activeProfile, {
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
      }),
    )
    await appendEventBatch(context, expectedHead, events)
    return context.json({ head: expectedHead + events.length }, 201)
  } catch (error) {
    if (principal.kind === 'organiser' && error instanceof CapacityReductionError)
      return context.json(
        {
          error: 'attention_required',
          findings: [capacityReductionFinding(error, activeProfile, buildRevision, now)],
        },
        409,
      )
    if (principal.kind === 'organiser' && error instanceof EventInputError)
      return context.json(
        {
          error: 'attention_required',
          findings: eventInputFindings(error, activeProfile, buildRevision, now),
        },
        400,
      )
    if (principal.kind === 'organiser' && error instanceof AppendInvariantError)
      return context.json(
        {
          error: 'attention_required',
          findings: appendInvariantFindings(error, activeProfile, buildRevision, now),
        },
        400,
      )
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

export { app }

export default {
  fetch: app.fetch.bind(app),
  scheduled: async (_controller: ScheduledController, env: Env) => {
    await cleanupOperationalRows(env.DB, new Date().toISOString())
  },
}

async function principalFromContext(
  context: Context<{ Bindings: Env }>,
): Promise<Principal | null> {
  return tracing.enterSpan('auth.resolve_principal', async (span) => {
    const principal = await currentPrincipal(
      context.env.DB,
      getCookie(context, 'sid'),
      { isOrganiser: organiserPredicate(context.env) },
      activeProfile.validation_view,
    )
    if (principal) span.setAttribute('auth.kind', principal.kind)
    return principal
  })
}

function organiserPredicate(env: Env): (email: string) => boolean {
  const allowlist = organiserAllowlist(env)
  return (email) => allowlist.has(email)
}

async function readEventLog(context: Context<{ Bindings: Env }>) {
  return tracing.enterSpan('events.read_log', async (span) => {
    const events = await readEvents(context.env.DB, activeProfile.validation_view)
    span.setAttribute('event.count', events.length)
    return events
  })
}

function deriveEventWorld(events: Parameters<typeof derive>[0]) {
  return tracing.enterSpan('events.derive_world', (span) => {
    span.setAttribute('event.count', events.length)
    return derive(events, activeProfile.validation_view)
  })
}

async function appendEventBatch(
  context: Context<{ Bindings: Env }>,
  expectedHead: number,
  events: readonly Event[],
) {
  return tracing.enterSpan('events.append_batch', async (span) => {
    span.setAttribute('event.count', events.length)
    span.setAttribute('event.expected_head', expectedHead)
    return appendCanonicalEvents(context.env.DB, expectedHead, events)
  })
}

function shouldShowMagicLinkOnConsole(context: Context<{ Bindings: Env }>): boolean {
  const url = new URL(context.req.url)
  return (
    isLoopback(url.hostname) ||
    (context.env.DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE === 'true' &&
      context.env.DGHK_DEBUG_ONLY_LOCAL_PREVIEW_HOST === url.hostname)
  )
}

function shouldAllowInsecureSessionCookies(context: Context<{ Bindings: Env }>): boolean {
  return (
    context.env.DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES === 'true' &&
    isLocalPreviewRequest(context)
  )
}

function isLocalPreviewRequest(context: Context<{ Bindings: Env }>): boolean {
  const hostname = new URL(context.req.url).hostname
  return isLoopback(hostname) || context.env.DGHK_DEBUG_ONLY_LOCAL_PREVIEW_HOST === hostname
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  )
}

function hasTrustedOrigin(context: Context<{ Bindings: Env }>): boolean {
  const origin = context.req.header('Origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(context.req.url).origin
  } catch {
    return false
  }
}

async function readJsonBody<T>(
  context: Context<{ Bindings: Env }>,
  maxBytes = maxJsonBodyBytes,
): Promise<T | null> {
  const contentLength = Number(context.req.header('Content-Length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null
  const body = context.req.raw.body
  if (!body) return null
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  }
  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  const text = new TextDecoder().decode(bytes)
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function isBoundedJsonValue(value: unknown, depth = 0): boolean {
  if (depth > maxJsonDepth) return false
  if (typeof value === 'string') return value.length <= maxJsonStringLength
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return true
  if (Array.isArray(value))
    return (
      value.length <= maxEventsPerBatch &&
      value.every((item) => isBoundedJsonValue(item, depth + 1))
    )
  if (typeof value !== 'object') return false
  const entries = Object.entries(value)
  return (
    entries.length <= maxEventsPerBatch &&
    entries.every(
      ([key, item]) => key.length <= maxJsonStringLength && isBoundedJsonValue(item, depth + 1),
    )
  )
}

function applySecurityHeaders(context: Context<{ Bindings: Env }>): void {
  const url = new URL(context.req.url)
  context.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  )
  context.header('X-Content-Type-Options', 'nosniff')
  context.header('X-Frame-Options', 'DENY')
  context.header('Referrer-Policy', 'no-referrer')
  context.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (url.protocol === 'https:') context.header('Strict-Transport-Security', 'max-age=31536000')
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/'))
    context.header('Cache-Control', 'no-store')
}

/**
 * Narrows family label writes to the sections whose family feature is effective for the world
 * before the batch (spec/architecture/features.md §4).
 */
function familyLabelGate(world: World, env: Env): FamilyLabelOffered {
  const effective = effectiveFeatureIds(
    deriveFeatureView({
      modules: activeProfile.modules,
      world,
      overrides: featureBindings(env).overrides,
      phase_active: phaseActivation(
        derivePhaseView({
          modules: activeProfile.modules,
          meta: activeProfile.meta,
          world,
          now: new Date().toISOString(),
          plan: null,
        }),
      ),
      principal: 'family',
    }),
  )
  const governed = familyGovernedLabelKeys(activeProfile)
  return (key) => {
    const feature = governed.get(key)
    return feature === undefined || effective.has(feature)
  }
}

/**
 * Validates the operational feature bindings fail-closed and logs every set or invalid
 * binding whenever the set changes (spec/architecture/features.md §6).
 */
function featureBindings(env: Env): FeatureBindingState {
  const state = readFeatureBindings(env, activeProfile.modules)
  const announcement = JSON.stringify(state)
  if (announcement !== announcedFeatureBindings) {
    for (const { feature, value } of state.overrides)
      console.warn(`[WARN] Feature ${feature} is switched ${value} by its deployment binding.`)
    for (const name of state.invalid)
      console.error(
        `[ERROR] ${name} is not a valid feature binding: the Worker refuses to serve application routes.`,
      )
    announcedFeatureBindings = announcement
  }
  return state
}

function warnDangerousDevelopmentBindings(env: Env): void {
  if (env.DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN === 'true' && !warnedDemoLogin) {
    console.warn(
      '[WARN] DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN is enabled: organiser magic links will be returned to the browser. Never enable it for real user authentication.',
    )
    warnedDemoLogin = true
  }
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
