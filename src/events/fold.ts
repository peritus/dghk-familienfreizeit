import { canonicalEmail, canonicalJson, type Event, type JsonValue } from './types.js'

export type EntityKind = 'family' | 'person'
export type Entity = { id: string; kind: EntityKind; sort_key: number; created_seq: number; retired_seq: number | null }
export type Label = { entity_id: string; key: string; value: JsonValue; strength: 'required' | 'preferred' | null; note: string | null; set_seq: number }
export type KernelWorld = { families: Entity[]; persons: Entity[]; labels: Label[]; withdrawn_person_ids: string[]; head_seq: number }
export type KernelConfig = { entity_kinds?: readonly EntityKind[]; event_value_validators?: Readonly<Record<string, (value: unknown) => string | null>> }
type MutableWorld = { families: Map<string, Entity>; persons: Map<string, Entity>; labels: Map<string, Label>; emails: Map<string, string>; withdrawn: Set<string>; head_seq: number }

export function derive(events: readonly Event[], config: KernelConfig = {}): KernelWorld {
  validateEventStream(events, config)
  const state: MutableWorld = { families: new Map(), persons: new Map(), labels: new Map(), emails: new Map(), withdrawn: new Set(), head_seq: 0 }
  for (const event of events) applyEvent(state, event)
  return { families: [...state.families.values()].sort(sortEntities), persons: [...state.persons.values()].sort(sortEntities), labels: [...state.labels.values()].sort((a, b) => a.set_seq - b.set_seq || a.entity_id.localeCompare(b.entity_id) || a.key.localeCompare(b.key)), withdrawn_person_ids: [...state.withdrawn].sort(), head_seq: state.head_seq }
}
export function validateEventStream(events: readonly Event[], config: KernelConfig = {}): void {
  let expectedSeq = 1
  for (const event of events) {
    if (event.seq !== expectedSeq) throw new Error(`event sequence gap: expected ${expectedSeq}, got ${event.seq}`)
    const validator = config.event_value_validators?.[event.type]
    if (validator) { const error = validator(event.payload); if (error) throw new Error(error) }
    expectedSeq += 1
  }
  const state: MutableWorld = { families: new Map(), persons: new Map(), labels: new Map(), emails: new Map(), withdrawn: new Set(), head_seq: 0 }
  for (const event of events) applyEvent(state, event)
}
function applyEvent(state: MutableWorld, event: Event): void {
  if (event.seq !== state.head_seq + 1) throw new Error(`event sequence gap at ${event.seq}`)
  switch (event.type) {
    case 'FamilyInvited': {
      const { family_id, email, display_name, locale } = event.payload
      if (state.families.has(family_id)) throw new Error(`family already exists: ${family_id}`)
      const normalizedEmail = canonicalEmail(email)
      if (state.emails.has(normalizedEmail)) throw new Error(`email already belongs to a family: ${normalizedEmail}`)
      state.families.set(family_id, entity(family_id, 'family', event.seq)); state.emails.set(normalizedEmail, family_id)
      setLabel(state, event, family_id, 'display-name', display_name, null, null); setLabel(state, event, family_id, 'email', normalizedEmail, null, null); setLabel(state, event, family_id, 'locale', locale, null, null)
      break
    }
    case 'FamilyEmailChanged': {
      const { family_id, old_email, new_email } = event.payload
      requireEntity(state.families, family_id, 'family'); const oldEmail = canonicalEmail(old_email); const newEmail = canonicalEmail(new_email)
      if (state.emails.get(oldEmail) !== family_id) throw new Error(`old email does not belong to family: ${family_id}`)
      if (state.emails.has(newEmail)) throw new Error(`email already belongs to a family: ${newEmail}`)
      state.emails.delete(oldEmail); state.emails.set(newEmail, family_id); replaceLabels(state, family_id, 'email'); setLabel(state, event, family_id, 'email', newEmail, null, null); break
    }
    case 'PersonAdded': addPerson(state, event); break
    case 'PersonUpdated': updatePerson(state, event); break
    case 'PersonWithdrawn': requireEntity(state.persons, event.payload.person_id, 'person'); state.withdrawn.add(event.payload.person_id); state.persons.get(event.payload.person_id)!.retired_seq = event.seq; break
    case 'LabelSet': requireKnownEntity(state, event.payload.entity_id); setLabel(state, event, event.payload.entity_id, event.payload.key, event.payload.value, event.payload.strength, event.payload.note); break
    case 'LabelCleared':
      requireKnownEntity(state, event.payload.entity_id)
      if (event.payload.value === null) for (const key of state.labels.keys()) if (key.startsWith(`${event.payload.entity_id}|${event.payload.key}|`)) state.labels.delete(key)
      else state.labels.delete(labelKey(event.payload.entity_id, event.payload.key, event.payload.value))
      break
  }
  state.head_seq = event.seq
}
function addPerson(state: MutableWorld, event: Extract<Event, { type: 'PersonAdded' }>): void { const { person_id, family_id } = event.payload; requireEntity(state.families, family_id, 'family'); if (state.persons.has(person_id)) throw new Error(`person already exists: ${person_id}`); state.persons.set(person_id, entity(person_id, 'person', event.seq)); writePersonLabels(state, event) }
function updatePerson(state: MutableWorld, event: Extract<Event, { type: 'PersonUpdated' }>): void { requireEntity(state.persons, event.payload.person_id, 'person'); requireEntity(state.families, event.payload.family_id, 'family'); for (const key of ['member-of', 'given-name', 'family-name', 'birthdate', 'role']) replaceLabels(state, event.payload.person_id, key); writePersonLabels(state, event) }
function writePersonLabels(state: MutableWorld, event: Extract<Event, { type: 'PersonAdded' | 'PersonUpdated' }>): void { const { person_id, family_id, given_name, family_name, birthdate, role } = event.payload; setLabel(state, event, person_id, 'member-of', family_id, null, null); setLabel(state, event, person_id, 'given-name', given_name, null, null); setLabel(state, event, person_id, 'family-name', family_name, null, null); setLabel(state, event, person_id, 'birthdate', birthdate, null, null); setLabel(state, event, person_id, 'role', role, null, null) }
function setLabel(state: MutableWorld, event: Event, entityId: string, key: string, value: JsonValue, strength: 'required' | 'preferred' | null, note: string | null): void { state.labels.set(labelKey(entityId, key, value), { entity_id: entityId, key, value, strength, note, set_seq: event.seq }) }
function replaceLabels(state: MutableWorld, entityId: string, key: string): void { for (const keyValue of state.labels.keys()) if (keyValue.startsWith(`${entityId}|${key}|`)) state.labels.delete(keyValue) }
function labelKey(entityId: string, key: string, value: JsonValue): string { return `${entityId}|${key}|${canonicalJson(value)}` }
function requireKnownEntity(state: MutableWorld, id: string): void { if (!state.families.has(id) && !state.persons.has(id)) throw new Error(`unknown entity: ${id}`) }
function requireEntity(map: Map<string, Entity>, id: string, kind: EntityKind): void { if (!map.has(id)) throw new Error(`unknown ${kind}: ${id}`) }
function entity(id: string, kind: EntityKind, seq: number): Entity { return { id, kind, sort_key: seq, created_seq: seq, retired_seq: null } }
function sortEntities(a: Entity, b: Entity): number { return a.sort_key - b.sort_key || a.id.localeCompare(b.id) }
