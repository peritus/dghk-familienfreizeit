import type { Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod'
import type { AppEnvironment } from '../index.js'
import type { Principal } from '../../auth/principal.js'
import { consumeRateLimit, hash } from '../../auth/service.js'
import { authorizeEventBatch } from '../../auth/authorization.js'
import { activeProfile } from '../../config/index.js'
import { EventInputError, type Event, type EventDraft } from '../../events/types.js'
import { AppendInvariantError, type World } from '../../events/fold.js'
import { StaleHeadError } from '../../events/store.js'
import { buildFamilyDetailData } from '../../family-detail/read-model.js'
import { familyChangeEvents } from '../../family-detail/changes.js'
import type {
  FamilyChange,
  FamilyDetailData,
  PreferenceAnswer,
  PersonInput,
  FamilyRepresentation,
} from '../../family-detail/model.js'
import type { FeatureOverride } from '../../derive/features.js'

export type { FamilyRepresentation } from '../../family-detail/model.js'
type Dependencies = {
  principal: (context: Context<AppEnvironment>) => Promise<Principal | null>
  domain: (context: Context<AppEnvironment>) => Promise<{ events: Event[]; world: World }>
  invalidate: (context: Context<AppEnvironment>) => void
  prepare: (
    context: Context<AppEnvironment>,
    events: readonly Event[],
    drafts: readonly EventDraft[],
  ) => { events: Event[]; world: World }
  append: (
    context: Context<AppEnvironment>,
    head: number,
    events: readonly Event[],
  ) => Promise<unknown>
  origin: (context: Context<AppEnvironment>) => boolean
  body: (context: Context<AppEnvironment>) => Promise<unknown>
  overrides: (context: Context<AppEnvironment>) => readonly FeatureOverride[]
}
const personSchema = z
  .object({
    given_name: z.string().trim().min(1).max(200),
    family_name: z.string().trim().min(1).max(200),
    role: z.enum(['adult', 'child', 'infant']),
    age: z.number().int().min(0).max(120).nullable(),
  })
  .strict()
const answerSchema = z
  .object({
    values: z
      .array(
        z
          .object({
            value: z.union([z.string().max(4096), z.number().finite(), z.boolean(), z.null()]),
            strength: z.enum(['required', 'preferred']).nullable(),
          })
          .strict(),
      )
      .max(100),
    answered: z.boolean(),
  })
  .strict()
class ResourceError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    public readonly detail: string,
  ) {
    super(detail)
  }
}

function fail(status: ContentfulStatusCode, code: string, detail: string): never {
  throw new ResourceError(status, code, detail)
}
const preferencePath = (data: FamilyDetailData, targetId: string, key: string) =>
  targetId === data.family.id
    ? `/api/family/preferences/${encodeURIComponent(key)}`
    : `/api/family/people/${encodeURIComponent(targetId)}/preferences/${encodeURIComponent(key)}`
async function tag(value: unknown) {
  return `"${await hash(JSON.stringify(value))}"`
}
export async function familyRepresentation(data: FamilyDetailData): Promise<FamilyRepresentation> {
  const entries: [string, unknown][] = [['/api/family', data]]
  for (const person of data.people) {
    entries.push(
      [`/api/family/people/${encodeURIComponent(person.id)}`, person],
      [
        `/api/family/people/${encodeURIComponent(person.id)}/workshop-ranking`,
        { workshop_ids: data.rankings[person.id] ?? [] },
      ],
    )
    for (const workshop of data.workshops) {
      for (const [resource, values] of [
        ['workshop-signups', data.signups],
        ['workshop-interests', data.interests],
      ] as const)
        entries.push([
          `/api/family/people/${encodeURIComponent(person.id)}/${resource}/${encodeURIComponent(workshop.id)}`,
          { selected: (values[person.id] ?? []).includes(workshop.id) },
        ])
    }
  }
  for (const controls of Object.values(data.preferences))
    for (const control of Object.values(controls))
      entries.push([preferencePath(data, control.target_id, control.key), control.answer])
  return {
    data,
    resource_etags: Object.fromEntries(
      await Promise.all(entries.map(async ([path, value]) => [path, await tag(value)])),
    ),
  }
}
function resource(data: FamilyDetailData, parts: readonly string[]): unknown {
  if (!parts.length) return data.family
  if (parts[0] === 'workshops' && parts.length === 1) return data.workshops
  const targetId = parts[0] === 'people' ? parts[1] : data.family.id
  if (parts[0] === 'people' && parts.length === 1) return data.people
  const person = data.people.find((item) => item.id === targetId)
  if (parts[0] === 'people' && !person)
    fail(404, 'not_found', 'Diese Person gehört nicht zu deiner Familie.')
  if (parts[0] === 'people' && parts.length === 2) return person
  const rest = parts[0] === 'people' ? parts.slice(2) : parts
  if (rest[0] === 'preferences' && rest.length === 1) return data.preferences[targetId!] ?? {}
  if (rest[0] === 'preferences' && rest.length === 2) {
    const control = data.preferences[targetId!]?.[rest[1]!]
    if (!control) fail(404, 'not_found', 'Diese Angabe ist nicht verfügbar.')
    return control.answer
  }
  if (parts[0] === 'people' && rest[0] === 'workshop-ranking' && rest.length === 1)
    return { workshop_ids: data.rankings[targetId!] ?? [] }
  if (parts[0] === 'people' && ['workshop-signups', 'workshop-interests'].includes(rest[0] ?? '')) {
    const values =
      rest[0] === 'workshop-signups' ? data.signups[targetId!] : data.interests[targetId!]
    if (rest.length === 1) return values ?? []
    if (rest.length === 2 && data.workshops.some((item) => item.id === rest[1]))
      return { selected: (values ?? []).includes(rest[1]!) }
  }
  return fail(404, 'not_found', 'Diese Ressource gibt es nicht.')
}

function changeFor(
  data: FamilyDetailData,
  parts: readonly string[],
  method: string,
  body: unknown,
): FamilyChange {
  if (!parts.length && method === 'PATCH') {
    const parsed = z
      .object({ display_name: z.string().trim().min(1).max(200) })
      .strict()
      .safeParse(body)
    if (!parsed.success) fail(422, 'invalid_family', 'Bitte gib einen gültigen Familiennamen ein.')
    return { type: 'family', display_name: parsed.data.display_name }
  }
  if (parts[0] === 'people' && parts.length === 1 && method === 'POST') {
    const parsed = personSchema.safeParse(body)
    if (!parsed.success) fail(422, 'invalid_person', 'Bitte prüfe Namen, Altersgruppe und Alter.')
    validatePerson(parsed.data)
    return { type: 'person-create', person: parsed.data }
  }
  const targetId = parts[0] === 'people' ? parts[1]! : data.family.id
  const person = data.people.find((item) => item.id === targetId)
  if (parts[0] === 'people' && !person)
    fail(404, 'not_found', 'Diese Person gehört nicht zu deiner Familie.')
  if (parts[0] === 'people' && parts.length === 2 && method === 'PATCH') {
    const parsed = personSchema.partial().safeParse(body)
    if (!parsed.success) fail(422, 'invalid_person', 'Bitte prüfe Namen, Altersgruppe und Alter.')
    const next = {
      given_name: person!.given_name,
      family_name: person!.family_name,
      age: person!.age,
      role: person!.role,
      ...parsed.data,
    }
    validatePerson(next)
    return { type: 'person-update', person_id: targetId, person: next }
  }
  const rest = parts[0] === 'people' ? parts.slice(2) : parts
  if (rest[0] === 'preferences' && rest.length === 2 && ['PUT', 'DELETE'].includes(method)) {
    const control = data.preferences[targetId]?.[rest[1]!]
    if (!control) fail(404, 'not_found', 'Diese Angabe ist nicht verfügbar.')
    if (control.disabled)
      fail(
        403,
        'not_writable',
        control.disabled_reason ?? 'Diese Angabe kann nicht geändert werden.',
      )
    const parsed = answerSchema.safeParse(
      method === 'DELETE' ? { values: [], answered: false } : body,
    )
    if (!parsed.success) fail(422, 'invalid_answer', 'Bitte prüfe deine Antwort.')
    const answer = parsed.data as PreferenceAnswer
    if (
      (!answer.answered && answer.values.length) ||
      (answer.answered && !answer.values.length && control.kind !== 'tri-state')
    )
      fail(422, 'invalid_answer', 'Die Antwort ist unvollständig.')
    if (control.kind !== 'family-picker' && answer.values.length > 1)
      fail(422, 'invalid_answer', 'Bitte wähle eine Antwort.')
    if (
      new Set(answer.values.map((entry) => JSON.stringify(entry.value))).size !==
      answer.values.length
    )
      fail(422, 'invalid_answer', 'Die Antwort enthält doppelte Werte.')
    for (const entry of answer.values) {
      if (
        control.options.length &&
        !control.options.some(
          (option) => JSON.stringify(option.value) === JSON.stringify(entry.value),
        )
      )
        fail(422, 'invalid_answer', 'Diese Auswahl ist nicht erlaubt.')
      if (entry.strength !== null && !control.strengths.includes(entry.strength))
        fail(422, 'invalid_answer', 'Diese Stärke ist nicht erlaubt.')
      if (control.kind === 'tri-state' && entry.strength === null)
        fail(422, 'invalid_answer', 'Bitte wähle die Stärke des Wunsches.')
      if (control.kind === 'toggle' && entry.value !== true)
        fail(422, 'invalid_answer', 'Bitte wähle eine gültige Antwort.')
    }
    return { type: 'preference', target_id: targetId, key: control.key, answer }
  }
  if (parts[0] === 'people' && rest[0]?.startsWith('workshop-')) {
    if (!data.sections.find((section) => section.key === 'workshops')?.writable)
      fail(403, 'not_writable', 'Workshopangaben sind derzeit nicht zur Änderung geöffnet.')
    if (rest[0] === 'workshop-ranking' && rest.length === 1 && method === 'PUT') {
      const parsed = z
        .object({ workshop_ids: z.array(z.string()).max(data.max_rank) })
        .strict()
        .safeParse(body)
      if (
        !parsed.success ||
        new Set(parsed.data.workshop_ids).size !== parsed.data.workshop_ids.length
      )
        fail(422, 'invalid_ranking', 'Bitte prüfe die Wunschliste.')
      for (const id of parsed.data.workshop_ids) {
        const workshop = data.workshops.find((item) => item.id === id)
        if (!workshop || workshop.mode !== 'assigned' || workshop.eligibility[targetId] !== null)
          fail(422, 'ineligible_workshop', 'Dieser Workshop passt nicht zur Person.')
      }
      return { type: 'ranking', person_id: targetId, workshop_ids: parsed.data.workshop_ids }
    }
    if (
      ['workshop-signups', 'workshop-interests'].includes(rest[0]) &&
      rest.length === 2 &&
      ['PUT', 'DELETE'].includes(method)
    ) {
      const workshop = data.workshops.find((item) => item.id === rest[1])
      const signup = rest[0] === 'workshop-signups'
      if (!workshop || workshop.mode !== (signup ? 'sign-up' : 'interest'))
        fail(422, 'invalid_workshop', 'Dieser Workshop bietet diese Teilnahme nicht an.')
      if (method === 'PUT' && !z.object({}).strict().safeParse(body).success)
        fail(422, 'invalid_membership', 'Bitte prüfe die Teilnahmeangabe.')
      if (method === 'PUT' && workshop.eligibility[targetId] !== null)
        fail(422, 'ineligible_workshop', 'Dieser Workshop passt nicht zur Person.')
      if (
        method === 'PUT' &&
        signup &&
        !(data.signups[targetId] ?? []).includes(workshop.id) &&
        workshop.signed_up_count >= workshop.capacity
      )
        fail(409, 'workshop_full', 'Der Workshop ist inzwischen ausgebucht.')
      return {
        type: signup ? 'signup' : 'interest',
        person_id: targetId,
        workshop_id: workshop.id,
        selected: method === 'PUT',
      }
    }
  }
  return fail(405, 'method_not_allowed', 'Diese Operation ist nicht verfügbar.')
}

function allowedMethods(parts: readonly string[]): string {
  if (!parts.length) return 'GET, PATCH'
  if (parts[0] === 'people' && parts.length === 1) return 'GET, POST'
  if (parts[0] === 'people' && parts.length === 2) return 'GET, PATCH'
  const rest = parts[0] === 'people' ? parts.slice(2) : parts
  if (rest[0] === 'preferences' && rest.length === 2) return 'GET, PUT, DELETE'
  if (parts[0] === 'people' && rest[0] === 'workshop-ranking' && rest.length === 1)
    return 'GET, PUT'
  if (
    parts[0] === 'people' &&
    ['workshop-signups', 'workshop-interests'].includes(rest[0] ?? '') &&
    rest.length === 2
  )
    return 'GET, PUT, DELETE'
  return 'GET'
}

function validatePerson(person: PersonInput) {
  if (person.role === 'child' && (person.age === null || person.age < 1 || person.age > 17))
    fail(422, 'invalid_age', 'Bitte gib für ein Kind ein Alter zwischen 1 und 17 Jahren ein.')
}

export function registerFamilyResources(app: Hono<AppEnvironment>, deps: Dependencies) {
  const handler = async (context: Context<AppEnvironment>) => {
    let allowed = 'GET'
    try {
      const principal = await deps.principal(context)
      if (!principal || principal.kind !== 'family')
        fail(401, 'unauthorized', 'Bitte melde dich für deine Familie an.')
      const path = new URL(context.req.url).pathname.replace(/\/$/, '')
      const parts = path
        .slice('/api/family'.length)
        .split('/')
        .filter(Boolean)
        .map((part) => {
          try {
            return decodeURIComponent(part)
          } catch {
            return fail(400, 'invalid_path', 'Diese Adresse ist ungültig.')
          }
        })
      allowed = allowedMethods(parts)
      const method = context.req.method
      if (method !== 'GET' && !deps.origin(context))
        fail(403, 'origin_required', 'Die Anfrage konnte nicht bestätigt werden.')
      const now = new Date().toISOString()
      const makeData = (world: World) =>
        buildFamilyDetailData(world, activeProfile, principal.family_id, {
          audience: 'family',
          now,
          overrides: deps.overrides(context),
        })
      if (method === 'GET') {
        const { world } = await deps.domain(context)
        const data = makeData(world)
        const representation = !parts.length
          ? await familyRepresentation(data)
          : resource(data, parts)
        context.header('ETag', await tag(!parts.length ? data : representation))
        return context.json(representation)
      }
      if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method))
        fail(405, 'method_not_allowed', 'Diese Operation ist nicht verfügbar.')
      if (
        !(await consumeRateLimit(
          context.env.DB,
          `family-resources:${principal.email}`,
          120,
          60 * 60 * 1000,
          now,
        ))
      ) {
        context.header('Retry-After', '3600')
        fail(429, 'rate_limited', 'Zu viele Änderungen. Bitte versuche es später erneut.')
      }
      const body = method === 'DELETE' ? null : await deps.body(context)
      const newPersonId = `per_${crypto.randomUUID()}`
      for (let attempt = 0; attempt < 3; attempt++) {
        const { events, world } = await deps.domain(context)
        if (world.family_id_by_email[principal.email] !== principal.family_id)
          fail(
            401,
            'unauthorized',
            'Dein Familienzugang hat sich geändert. Bitte melde dich erneut an.',
          )
        const data = makeData(world)
        if (!(method === 'POST' && parts.length === 1 && parts[0] === 'people')) {
          const current = parts.length ? resource(data, parts) : data
          const etag = await tag(current)
          const match = context.req.header('If-Match')
          if (!match)
            fail(428, 'precondition_required', 'Bitte lade die aktuellen Angaben vor der Änderung.')
          if (
            !match
              .split(',')
              .map((item) => item.trim())
              .includes(etag)
          )
            fail(
              412,
              'resource_changed',
              'Die Angaben wurden inzwischen geändert. Bitte lade sie neu.',
            )
        }
        const change = changeFor(data, parts, method, body)
        const drafts = familyChangeEvents(
          change,
          world,
          principal.family_id,
          principal.email,
          now,
          newPersonId,
        )
        const prepared = deps.prepare(context, events, drafts)
        if (!authorizeEventBatch(principal, prepared.events, world, activeProfile.validation_view))
          fail(403, 'forbidden', 'Diese Änderung ist nicht erlaubt.')
        try {
          await deps.append(context, events.length, prepared.events)
        } catch (error) {
          if (error instanceof StaleHeadError) {
            deps.invalidate(context)
            continue
          }
          throw error
        }
        const after = makeData(prepared.world)
        if (method === 'DELETE') return context.body(null, 204)
        const resultParts = change.type === 'person-create' ? ['people', newPersonId] : parts
        const result = resultParts.length
          ? resource(after, resultParts)
          : await familyRepresentation(after)
        context.header('ETag', await tag(resultParts.length ? result : after))
        if (change.type === 'person-create')
          context.header('Location', `/api/family/people/${encodeURIComponent(newPersonId)}`)
        return context.json(result, change.type === 'person-create' ? 201 : 200)
      }
      return context.json(
        {
          error: 'conflict',
          message: 'Gleichzeitig wurden Angaben geändert. Bitte versuche es erneut.',
        },
        409,
      )
    } catch (error) {
      if (error instanceof ResourceError) {
        if (error.status === 405) context.header('Allow', allowed)
        return context.json({ error: error.code, message: error.detail }, error.status)
      }
      if (error instanceof EventInputError || error instanceof AppendInvariantError)
        return context.json(
          {
            error: 'invalid_resource',
            message: 'Bitte prüfe die Angaben. Die Änderung wurde nicht gespeichert.',
          },
          422,
        )
      return context.json(
        {
          error: 'unavailable',
          message: 'Die Angaben sind gerade nicht verfügbar. Bitte versuche es später erneut.',
        },
        500,
      )
    }
  }
  app.all('/api/family', handler)
  app.all('/api/family/*', handler)
}
