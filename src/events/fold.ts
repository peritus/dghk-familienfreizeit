import { canonicalEmail, canonicalJson, parseEvent, type Event, type JsonValue } from './types.js'
import { resolve, type Diagnostic, type ResolvedConstraint } from './resolver.js'

export type EntityKind = 'family' | 'person'

export type Entity = {
  id: string
  kind: EntityKind
  sort_key: number
  created_seq: number
  retired_seq: number | null
}

export type Label = {
  entity_id: string
  key: string
  value: JsonValue
  strength: 'required' | 'preferred' | null
  note: string | null
  set_seq: number
}

export type KernelWorld = {
  families: Entity[]
  persons: Entity[]
  labels: Label[]
  withdrawn_person_ids: string[]
  head_seq: number
  labels_by_entity: Readonly<Record<string, readonly Label[]>>
  labels_by_key: Readonly<Record<string, readonly Label[]>>
  constraints: readonly ResolvedConstraint[]
  diagnostics: readonly Diagnostic[]
}

export type LabelSchema = {
  key: string
  aliases?: readonly string[]
  validate?: (value: JsonValue) => string | null
  scopes?: readonly string[]
  cardinality?: 'zero-or-one' | 'exactly-one' | 'zero-or-more'
}

export type ResolverDescriptor = { key: string; operator: string; scopes: readonly EntityKind[] }

export type KernelConfig = {
  entity_kinds?: readonly EntityKind[]
  label_schemas?: readonly LabelSchema[]
  aliases?: Readonly<Record<string, string>>
  resolver_descriptors?: readonly ResolverDescriptor[]
  event_value_validators?: Readonly<Record<string, (value: unknown) => string | null>>
}
type MutableWorld = {
  families: Map<string, Entity>
  persons: Map<string, Entity>
  labels: Map<string, Label>
  emails: Map<string, string>
  withdrawn: Set<string>
  head_seq: number
}

export function derive(events: readonly Event[], config: KernelConfig = {}): KernelWorld {
  const validatedEvents = normalizeEvents(events, config)
  const state: MutableWorld = {
    families: new Map(),
    persons: new Map(),
    labels: new Map(),
    emails: new Map(),
    withdrawn: new Set(),
    head_seq: 0,
  }
  for (const event of validatedEvents) applyEvent(state, event, config)
  const labels = [...state.labels.values()].sort(
    (a, b) =>
      a.set_seq - b.set_seq || a.entity_id.localeCompare(b.entity_id) || a.key.localeCompare(b.key),
  )
  const entities = [...state.families.values(), ...state.persons.values()].sort(sortEntities)
  const resolved = resolve(labels, entities)
  return {
    families: [...state.families.values()].sort(sortEntities),
    persons: [...state.persons.values()].sort(sortEntities),
    labels,
    withdrawn_person_ids: [...state.withdrawn].sort(),
    head_seq: state.head_seq,
    labels_by_entity: indexLabels(labels, (label) => label.entity_id),
    labels_by_key: indexLabels(labels, (label) => label.key),
    constraints: resolved.constraints,
    diagnostics: resolved.diagnostics,
  }
}

export function validateEventStream(events: readonly Event[], config: KernelConfig = {}): void {
  normalizeEvents(events, config)
}

function normalizeEvents(events: readonly Event[], config: KernelConfig): Event[] {
  const validatedEvents = events.map((event) => parseEvent(event))
  let expectedSeq = 1
  for (const event of validatedEvents) {
    if (event.seq !== expectedSeq)
      throw new Error(`event sequence gap: expected ${expectedSeq}, got ${event.seq}`)
    const validator = config.event_value_validators?.[event.type]
    if (validator) {
      const error = validator(event.payload)
      if (error) throw new Error(error)
    }
    expectedSeq += 1
  }
  const state: MutableWorld = {
    families: new Map(),
    persons: new Map(),
    labels: new Map(),
    emails: new Map(),
    withdrawn: new Set(),
    head_seq: 0,
  }
  for (const event of validatedEvents) applyEvent(state, event, config)
  return validatedEvents
}

function applyEvent(state: MutableWorld, event: Event, config: KernelConfig): void {
  if (event.seq !== state.head_seq + 1) throw new Error(`event sequence gap at ${event.seq}`)
  switch (event.type) {
    case 'FamilyInvited': {
      const { family_id: familyId, email, display_name: displayName, locale } = event.payload
      if (state.families.has(familyId)) throw new Error(`family already exists: ${familyId}`)
      const normalizedEmail = canonicalEmail(email)
      if (state.emails.has(normalizedEmail))
        throw new Error(`email already belongs to a family: ${normalizedEmail}`)
      state.families.set(familyId, entity(familyId, 'family', event.seq))
      state.emails.set(normalizedEmail, familyId)
      setLabel(state, event, familyId, 'display-name', displayName, null, null)
      setLabel(state, event, familyId, 'email', normalizedEmail, null, null)
      setLabel(state, event, familyId, 'locale', locale, null, null)
      break
    }
    case 'FamilyEmailChanged': {
      const {
        family_id: familyId,
        old_email: oldEmailValue,
        new_email: newEmailValue,
      } = event.payload
      requireEntity(state.families, familyId, 'family')
      const oldEmail = canonicalEmail(oldEmailValue)
      const newEmail = canonicalEmail(newEmailValue)
      if (state.emails.get(oldEmail) !== familyId)
        throw new Error(`old email does not belong to family: ${familyId}`)
      if (state.emails.has(newEmail))
        throw new Error(`email already belongs to a family: ${newEmail}`)
      state.emails.delete(oldEmail)
      state.emails.set(newEmail, familyId)
      replaceLabels(state, familyId, 'email')
      setLabel(state, event, familyId, 'email', newEmail, null, null)
      break
    }
    case 'PersonAdded':
      addPerson(state, event)
      break
    case 'PersonUpdated':
      updatePerson(state, event)
      break
    case 'PersonWithdrawn':
      requireEntity(state.persons, event.payload.person_id, 'person')
      state.withdrawn.add(event.payload.person_id)
      state.persons.get(event.payload.person_id)!.retired_seq = event.seq
      break
    case 'LabelSet':
      requireKnownEntity(state, event.payload.entity_id)
      setConfiguredLabel(
        state,
        event,
        config,
        event.payload.entity_id,
        event.payload.key,
        event.payload.value,
        event.payload.strength,
        event.payload.note,
      )
      break
    case 'LabelCleared': {
      requireKnownEntity(state, event.payload.entity_id)
      const clearKey = configuredLabelKey(config, event.payload.key)
      if (event.payload.value === null)
        for (const key of state.labels.keys())
          if (key.startsWith(`${event.payload.entity_id}|${clearKey}|`)) state.labels.delete(key)
          else state.labels.delete(labelKey(event.payload.entity_id, clearKey, event.payload.value))
      break
    }
  }
  state.head_seq = event.seq
}

function addPerson(state: MutableWorld, event: Extract<Event, { type: 'PersonAdded' }>): void {
  const { person_id: personId, family_id: familyId } = event.payload
  requireEntity(state.families, familyId, 'family')
  if (state.persons.has(personId)) throw new Error(`person already exists: ${personId}`)
  state.persons.set(personId, entity(personId, 'person', event.seq))
  writePersonLabels(state, event)
}

function updatePerson(state: MutableWorld, event: Extract<Event, { type: 'PersonUpdated' }>): void {
  requireEntity(state.persons, event.payload.person_id, 'person')
  requireEntity(state.families, event.payload.family_id, 'family')
  for (const key of ['member-of', 'given-name', 'family-name', 'birthdate', 'role'])
    replaceLabels(state, event.payload.person_id, key)
  writePersonLabels(state, event)
}

function writePersonLabels(
  state: MutableWorld,
  event: Extract<Event, { type: 'PersonAdded' | 'PersonUpdated' }>,
): void {
  const {
    person_id: personId,
    family_id: familyId,
    given_name: givenName,
    family_name: familyName,
    birthdate,
    role,
  } = event.payload
  setLabel(state, event, personId, 'member-of', familyId, null, null)
  setLabel(state, event, personId, 'given-name', givenName, null, null)
  setLabel(state, event, personId, 'family-name', familyName, null, null)
  setLabel(state, event, personId, 'birthdate', birthdate, null, null)
  setLabel(state, event, personId, 'role', role, null, null)
}

function setLabel(
  state: MutableWorld,
  event: Event,
  entityId: string,
  key: string,
  value: JsonValue,
  strength: 'required' | 'preferred' | null,
  note: string | null,
): void {
  state.labels.set(labelKey(entityId, key, value), {
    entity_id: entityId,
    key,
    value,
    strength,
    note,
    set_seq: event.seq,
  })
}

function setConfiguredLabel(
  state: MutableWorld,
  event: Event,
  config: KernelConfig,
  entityId: string,
  key: string,
  value: JsonValue,
  strength: 'required' | 'preferred' | null,
  note: string | null,
): void {
  const canonicalKey = configuredLabelKey(config, key)
  const schema = config.label_schemas?.find((candidate) => candidate.key === canonicalKey)
  const entity = state.families.get(entityId) ?? state.persons.get(entityId)
  if (schema?.scopes && entity && !schema.scopes.includes(entity.kind))
    throw new Error(`label ${canonicalKey} is not valid for ${entity.kind}`)
  if (schema?.cardinality !== 'zero-or-more') replaceLabels(state, entityId, canonicalKey)
  const error = schema?.validate?.(value)
  if (error) throw new Error(error)
  setLabel(state, event, entityId, canonicalKey, value, strength, note)
}

function configuredLabelKey(config: KernelConfig, key: string): string {
  const canonicalKey = config.aliases?.[key] ?? key
  const schemas = config.label_schemas ?? []
  const resolverKeys = new Set(
    (config.resolver_descriptors ?? []).map((descriptor) => descriptor.key),
  )
  const kernelKeys = new Set([
    'display-name',
    'email',
    'locale',
    'member-of',
    'given-name',
    'family-name',
    'birthdate',
    'role',
  ])
  if (
    schemas.length > 0 &&
    !schemas.some((schema) => schema.key === canonicalKey) &&
    !resolverKeys.has(canonicalKey) &&
    !kernelKeys.has(canonicalKey)
  )
    throw new Error(`unknown label key: ${key}`)
  return canonicalKey
}

function replaceLabels(state: MutableWorld, entityId: string, key: string): void {
  for (const keyValue of state.labels.keys())
    if (keyValue.startsWith(`${entityId}|${key}|`)) state.labels.delete(keyValue)
}

function labelKey(entityId: string, key: string, value: JsonValue): string {
  return `${entityId}|${key}|${canonicalJson(value)}`
}

function requireKnownEntity(state: MutableWorld, id: string): void {
  if (!state.families.has(id) && !state.persons.has(id)) throw new Error(`unknown entity: ${id}`)
}

function requireEntity(map: Map<string, Entity>, id: string, kind: EntityKind): void {
  if (!map.has(id)) throw new Error(`unknown ${kind}: ${id}`)
}

function entity(id: string, kind: EntityKind, seq: number): Entity {
  return { id, kind, sort_key: seq, created_seq: seq, retired_seq: null }
}

function sortEntities(a: Entity, b: Entity): number {
  return a.sort_key - b.sort_key || a.id.localeCompare(b.id)
}

function indexLabels(
  labels: readonly Label[],
  key: (label: Label) => string,
): Readonly<Record<string, readonly Label[]>> {
  const index: Record<string, Label[]> = {}
  for (const label of labels) (index[key(label)] ??= []).push(label)
  return index
}
