import { z } from 'zod'

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

const jsonValueSchema = z.custom<JsonValue>((value) => isJsonValue(value))
const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => canonicalEmail(value))
const localeSchema = z.enum(['de', 'en'])
const roleSchema = z.string().min(1).max(64)
const labelKeySchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9-]*$/)

export type FamilyInvited = {
  type: 'FamilyInvited'
  payload: { family_id: string; email: string; display_name: string; locale: 'de' | 'en' }
}

export type FamilyEmailChanged = {
  type: 'FamilyEmailChanged'
  payload: { family_id: string; old_email: string; new_email: string }
}

export type PersonAdded = {
  type: 'PersonAdded'
  payload: {
    person_id: string
    family_id: string
    given_name: string
    family_name: string
    birthdate: string | null
    role: string
  }
}

export type PersonUpdated = {
  type: 'PersonUpdated'
  payload: {
    person_id: string
    family_id: string
    given_name: string
    family_name: string
    birthdate: string | null
    role: string
  }
}

export type PersonWithdrawn = {
  type: 'PersonWithdrawn'
  payload: { person_id: string; reason: string | null }
}

export type LabelSet = {
  type: 'LabelSet'
  payload: {
    entity_id: string
    key: string
    value: JsonValue
    strength: 'required' | 'preferred' | null
    note: string | null
  }
}

export type LabelCleared = {
  type: 'LabelCleared'
  payload: { entity_id: string; key: string; value: JsonValue | null }
}

export type KernelEvent =
  | FamilyInvited
  | FamilyEmailChanged
  | PersonAdded
  | PersonUpdated
  | PersonWithdrawn
  | LabelSet
  | LabelCleared

export type EventType = KernelEvent['type']

export type Event = KernelEvent & { seq: number; at: string; actor: string; subject: string | null }

const payloadSchemas: {
  [K in EventType]: z.ZodType<Extract<KernelEvent, { type: K }>['payload']>
} = {
  FamilyInvited: z.object({
    family_id: z.string().min(1),
    email: emailSchema,
    display_name: z.string().min(1),
    locale: localeSchema,
  }),
  FamilyEmailChanged: z.object({
    family_id: z.string().min(1),
    old_email: emailSchema,
    new_email: emailSchema,
  }),
  PersonAdded: z.object({
    person_id: z.string().min(1),
    family_id: z.string().min(1),
    given_name: z.string().min(1),
    family_name: z.string().min(1),
    birthdate: z.string().date().nullable(),
    role: roleSchema,
  }),
  PersonUpdated: z.object({
    person_id: z.string().min(1),
    family_id: z.string().min(1),
    given_name: z.string().min(1),
    family_name: z.string().min(1),
    birthdate: z.string().date().nullable(),
    role: roleSchema,
  }),
  PersonWithdrawn: z.object({ person_id: z.string().min(1), reason: z.string().nullable() }),
  LabelSet: z.object({
    entity_id: z.string().min(1),
    key: labelKeySchema,
    value: jsonValueSchema,
    strength: z.enum(['required', 'preferred']).nullable(),
    note: z.string().nullable(),
  }),
  LabelCleared: z.object({
    entity_id: z.string().min(1),
    key: labelKeySchema,
    value: jsonValueSchema.nullable(),
  }),
}

export function parsePayload(type: EventType, payload: unknown): KernelEvent['payload'] {
  const parsed: unknown = payloadSchemas[type].parse(payload)
  return parsed as KernelEvent['payload']
}

export function parseEvent(input: unknown): Event {
  const value = input as Partial<Event> & { payload?: unknown }
  const seq = value.seq
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 1)
    throw new Error('event seq must be a positive integer')
  if (typeof value.at !== 'string' || Number.isNaN(Date.parse(value.at)))
    throw new Error('event at must be an ISO timestamp')
  if (typeof value.actor !== 'string' || value.actor.length === 0)
    throw new Error('event actor is required')
  if (value.subject !== null && typeof value.subject !== 'string')
    throw new Error('event subject must be a string or null')
  if (!isEventType(value.type)) throw new Error(`unknown event type: ${String(value.type)}`)
  return {
    seq,
    at: new Date(value.at).toISOString(),
    actor: value.actor,
    subject: value.subject ?? null,
    type: value.type,
    payload: parsePayload(value.type, value.payload),
  } as Event
}

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && value in payloadSchemas
}

export function canonicalEmail(value: string): string {
  const email = value.normalize('NFC').trim().toLocaleLowerCase('en-US')
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@'))
    throw new Error('invalid email address')
  return email
}

export function canonicalJson(value: JsonValue): string {
  return JSON.stringify(sortJson(value))
}
function sortJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortJson(item)]),
    )
  return value
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (typeof value === 'object') return Object.values(value).every(isJsonValue)
  return false
}
