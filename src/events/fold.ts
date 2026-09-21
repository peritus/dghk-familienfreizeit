import {
  canonicalEmail,
  canonicalJson,
  parseEvent,
  type Event,
  type FamilyEmailChanged,
  type FamilyInvited,
  type JsonValue,
  type LabelCleared,
  type LabelSet,
  type PersonWithdrawn,
} from './types.js'
import { resolve, type Diagnostic, type ResolvedConstraint } from './resolver.js'

/** Written only by FamilyInvited/FamilyEmailChanged/PersonAdded/PersonUpdated; LabelSet/LabelCleared reject them. */
const kernelSetupOwnedLabelKeys = new Set([
  'display-name',
  'email',
  'locale',
  'member-of',
  'given-name',
  'family-name',
  'birthdate',
  'role',
])

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
  value_type: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object'
  strength: 'required' | 'preferred' | null
  note: string | null
  set_seq: number
  cleared_seq: number | null
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
  /**
   * Authorization-only precursor to the full `family_facing` control contract
   * (spec/modules/family-preferences.md §6): whether a family principal may
   * LabelSet/LabelCleared this key on entities it owns. Superseded by a
   * `family_facing` declaration once that module exists.
   */
  family_writable?: boolean
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
  const activeLabels = labels.filter((label) => label.cleared_seq === null)
  const entities = [...state.families.values(), ...state.persons.values()].sort(sortEntities)
  const resolved = resolve(activeLabels, entities)
  return {
    families: [...state.families.values()].sort(sortEntities),
    persons: [...state.persons.values()].sort(sortEntities),
    labels,
    withdrawn_person_ids: [...state.withdrawn].sort(),
    head_seq: state.head_seq,
    labels_by_entity: indexLabels(activeLabels, (label) => label.entity_id),
    labels_by_key: indexLabels(activeLabels, (label) => label.key),
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
      const {
        family_id: familyId,
        email,
        display_name: displayName,
        locale,
      } = (event as unknown as FamilyInvited).payload
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
      } = (event as unknown as FamilyEmailChanged).payload
      requireEntity(state.families, familyId, 'family')
      const oldEmail = canonicalEmail(oldEmailValue)
      const newEmail = canonicalEmail(newEmailValue)
      if (state.emails.get(oldEmail) !== familyId)
        throw new Error(`old email does not belong to family: ${familyId}`)
      if (state.emails.has(newEmail))
        throw new Error(`email already belongs to a family: ${newEmail}`)
      state.emails.delete(oldEmail)
      state.emails.set(newEmail, familyId)
      replaceLabels(state, familyId, 'email', event.seq)
      setLabel(state, event, familyId, 'email', newEmail, null, null)
      break
    }
    case 'PersonAdded':
      addPerson(state, event as Extract<Event, { type: 'PersonAdded' }>)
      break
    case 'PersonUpdated':
      updatePerson(state, event as Extract<Event, { type: 'PersonUpdated' }>)
      break
    case 'PersonWithdrawn': {
      const { person_id: personId } = (event as unknown as PersonWithdrawn).payload
      requireEntity(state.persons, personId, 'person')
      state.withdrawn.add(personId)
      state.persons.get(personId)!.retired_seq = event.seq
      break
    }
    case 'LabelSet': {
      const {
        entity_id: entityId,
        key,
        value,
        strength,
        note,
      } = (event as unknown as LabelSet).payload
      requireKnownEntity(state, entityId)
      setConfiguredLabel(state, event, config, entityId, key, value, strength, note)
      break
    }
    case 'LabelCleared': {
      const { entity_id: entityId, key, value } = (event as unknown as LabelCleared).payload
      requireKnownEntity(state, entityId)
      const clearKey = configuredLabelKey(config, key)
      if (value === null) {
        const prefix = `${entityId}|${clearKey}|`
        for (const mapKey of state.labels.keys())
          if (mapKey.startsWith(prefix)) clearLabel(state, mapKey, event.seq)
      } else {
        clearLabel(state, labelKey(entityId, clearKey, value), event.seq)
      }
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
    replaceLabels(state, event.payload.person_id, key, event.seq)
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
    value_type: jsonValueType(value),
    strength,
    note,
    set_seq: event.seq,
    cleared_seq: null,
  })
}

function clearLabel(state: MutableWorld, key: string, seq: number): void {
  const label = state.labels.get(key)
  if (label && label.cleared_seq === null) state.labels.set(key, { ...label, cleared_seq: seq })
}

function jsonValueType(value: JsonValue): Label['value_type'] {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value as 'boolean' | 'number' | 'string' | 'object'
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
  if (schema?.cardinality !== 'zero-or-more')
    replaceLabels(state, entityId, canonicalKey, event.seq)
  const error = schema?.validate?.(value)
  if (error) throw new Error(error)
  setLabel(state, event, entityId, canonicalKey, value, strength, note)
}

function configuredLabelKey(config: KernelConfig, key: string): string {
  const canonicalKey = config.aliases?.[key] ?? key
  if (kernelSetupOwnedLabelKeys.has(canonicalKey))
    throw new Error(
      `label key is setup-owned and cannot be written via LabelSet/LabelCleared: ${canonicalKey}`,
    )
  const schemas = config.label_schemas ?? []
  const resolverKeys = new Set(
    (config.resolver_descriptors ?? []).map((descriptor) => descriptor.key),
  )
  if (
    schemas.length > 0 &&
    !schemas.some((schema) => schema.key === canonicalKey) &&
    !resolverKeys.has(canonicalKey)
  )
    throw new Error(`unknown label key: ${key}`)
  return canonicalKey
}

function replaceLabels(state: MutableWorld, entityId: string, key: string, seq: number): void {
  const prefix = `${entityId}|${key}|`
  for (const keyValue of state.labels.keys())
    if (keyValue.startsWith(prefix)) clearLabel(state, keyValue, seq)
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
