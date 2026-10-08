import {
  canonicalEmail,
  canonicalJson,
  eventPayloadSchemas,
  parseEvent,
  type Event,
  type EventPayloadSchemas,
  type FamilyDisplayNameChanged,
  type FamilyEmailChanged,
  type FamilyInvited,
  type JsonValue,
  type LabelCleared,
  type LabelSet,
  type PersonWithdrawn,
} from './types.js'
import {
  fixedResolverKeys,
  resolve,
  type Diagnostic,
  type ResolvedConstraint,
  type ResolvedRequirement,
} from './resolver.js'
import type { ResolvedCapability } from './resolver.js'

/** Written only by family identity events and PersonAdded/PersonUpdated; LabelSet/LabelCleared reject them. */
const kernelSetupOwnedLabelKeys = new Set([
  'display-name',
  'email',
  'locale',
  'member-of',
  'given-name',
  'family-name',
  'age',
  'role',
])

/**
 * Kernel-reserved id prefixes (D27). Every entity id must start with its own
 * kind's declared prefix, kernel or module; this is what prevents two
 * different kinds from ever colliding on the same id, so no permanent
 * cross-kind id ledger is kept.
 */
const kernelEntityKindPrefixes: Readonly<Record<string, string>> = {
  family: 'fam_',
  person: 'per_',
}

export type EntityKind = 'family' | 'person' | (string & {})

export type Entity = {
  id: string
  kind: EntityKind
  sort_key: number
  created_seq: number
}

export type Label = {
  entity_id: string
  key: string
  value: JsonValue
  value_type: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object'
  strength: 'required' | 'preferred' | null
  note: string | null
  set_seq: number
  sensitivity: 'normal' | 'restricted'
}

/** How the kernel records a module event as a phase fact (spec/architecture/phases.md §3). */
export type PhaseEventRole =
  | { role: 'open'; phase: string }
  | { role: 'close'; area: string }
  | { role: 'reopen'; area: string }

/** One closing event of an area, with the payload it recorded. */
export type AreaClosing = { seq: number; at: string; payload: JsonValue }

export type AreaFacts = {
  /** Every closing of the area, oldest first. */
  closings: readonly AreaClosing[]
  /** The latest closing or reopening, or null while the area was never closed. */
  latest: { kind: 'closed' | 'reopened'; seq: number; at: string } | null
}

/** Per-phase and per-area facts folded from opening, closing, and reopening events. */
export type PhaseFacts = {
  opened: Readonly<Record<string, { seq: number; at: string }>>
  areas: Readonly<Record<string, AreaFacts>>
}

export type World = {
  families: Entity[]
  persons: Entity[]
  labels: Label[]
  head_seq: number
  labels_by_entity: Readonly<Record<string, readonly Label[]>>
  labels_by_key: Readonly<Record<string, readonly Label[]>>
  /** Exact entity-kind lookup for authorization and other identity-boundary checks. */
  entity_kind_by_id: Readonly<Record<string, EntityKind>>
  /** Exact family lookup for canonical email authentication. */
  family_id_by_email: Readonly<Record<string, string>>
  constraints: readonly ResolvedConstraint[]
  requirements: readonly ResolvedRequirement[]
  capabilities: readonly ResolvedCapability[]
  diagnostics: readonly Diagnostic[]
  summaries: Readonly<Record<string, unknown>>
  /** One sorted collection per entity kind, kernel and module-owned alike. Retired/withdrawn entities are absent (D27). */
  entities_by_kind: Readonly<Record<string, readonly Entity[]>>
  /** Opening, closing, and reopening facts; the phase view is derived from them outside `derive`. */
  phase_facts: PhaseFacts
}

/**
 * The only mutation surface a module's fold function receives (see
 * spec/modules/contract.md §3.1: "may create entity identity and emit
 * labels; may not emit derived results"). `guardModuleFold` wraps a raw fold
 * function so every call here is checked against that module's own declared
 * entity kinds and label keys before it reaches the real world state.
 */
export type LabelWrite = {
  key: string
  value: JsonValue
  strength: 'required' | 'preferred' | null
  note: string | null
}

export type ModuleFoldCapability = {
  /** Read-only live entity lookup for module invariants and lifecycle restatements. */
  findEntity(kind: string, id: string): Entity | undefined
  /** Read-only live entities of one module-owned kind. */
  entities(kind: string): readonly Entity[]
  /** Read-only live labels for one entity. */
  labels(entityId: string): readonly Label[]
  /** Restates the deterministic source ordering key without adding a domain label. */
  setSortKey(kind: string, id: string, sortKey: number): void
  /** `sortKey` defaults to `seq` (creation order) when omitted; pass the event's own source ordering key otherwise. */
  createEntity(kind: string, id: string, seq: number, sortKey?: number): Entity
  /** Hard-removes the entity and every label it holds (D27); rejects a kind the module did not declare. */
  retireEntity(kind: string, id: string): void
  /** Clears every live label under one module-owned key on an entity. */
  clearLabel(entityId: string, key: string): void
  setLabel(
    entityId: string,
    key: string,
    value: JsonValue,
    strength: 'required' | 'preferred' | null,
    note: string | null,
  ): void
  /** Atomically clears every live label under each write's key on `entityId`, then sets its new value — for full-restatement events. */
  replaceLabels(entityId: string, values: readonly LabelWrite[]): void
}

export type ModuleEventFold = (
  capability: ModuleFoldCapability,
  event: { type: string; payload: JsonValue; seq: number },
) => void

/** Rejects a capability call outside the kinds/keys the owning module itself declared. */
export function guardModuleFold(
  moduleId: string,
  allowedKinds: ReadonlySet<string>,
  allowedLabelKeys: ReadonlySet<string>,
  rawFold: ModuleEventFold,
): ModuleEventFold {
  const requireKind = (kind: string): void => {
    if (!allowedKinds.has(kind))
      throw new Error(`module ${moduleId} did not declare entity kind: ${kind}`)
  }
  const requireKey = (key: string): void => {
    if (!allowedLabelKeys.has(key))
      throw new Error(`module ${moduleId} did not declare label key: ${key}`)
  }
  return (capability, event) => {
    const guarded: ModuleFoldCapability = {
      findEntity(kind, id) {
        requireKind(kind)
        return capability.findEntity(kind, id)
      },
      entities(kind) {
        requireKind(kind)
        return capability.entities(kind)
      },
      labels(entityId) {
        return capability.labels(entityId)
      },
      setSortKey(kind, id, sortKey) {
        requireKind(kind)
        capability.setSortKey(kind, id, sortKey)
      },
      createEntity(kind, id, seq, sortKey) {
        requireKind(kind)
        return capability.createEntity(kind, id, seq, sortKey)
      },
      retireEntity(kind, id) {
        requireKind(kind)
        capability.retireEntity(kind, id)
      },
      clearLabel(entityId, key) {
        requireKey(key)
        capability.clearLabel(entityId, key)
      },
      setLabel(entityId, key, value, strength, note) {
        requireKey(key)
        capability.setLabel(entityId, key, value, strength, note)
      },
      replaceLabels(entityId, values) {
        for (const { key } of values) requireKey(key)
        capability.replaceLabels(entityId, values)
      },
    }
    rawFold(guarded, event)
  }
}

export type LabelSchema = {
  key: string
  aliases?: readonly string[]
  validate?: (value: JsonValue) => string | null
  scopes?: readonly string[]
  cardinality?: 'zero-or-one' | 'exactly-one' | 'zero-or-more'
  setup_only?: boolean
  sensitivity?: 'normal' | 'restricted'
  /**
   * Authorization-only precursor to the full `family_facing` control contract
   * (spec/modules/family-preferences.md §6): whether a family principal may
   * LabelSet/LabelCleared this key on entities it owns. Superseded by a
   * `family_facing` declaration once that module exists.
   */
  family_writable?: boolean
  valid_for?: (entity: {
    label(key: string): JsonValue | undefined
  }) => boolean | string | Readonly<Record<string, string>>
}

export type ResolverDescriptor = {
  key: string
  operator: string
  scopes: readonly EntityKind[]
  kind?: 'requirement' | 'relation' | 'ordered-choice'
  satisfied_by?: string
  structural?: string
  weight?: number
  penalty?: number
}

export type CapabilityDescriptor = {
  key: string
  scopes: readonly EntityKind[]
  derive?: (entity: { label(key: string): JsonValue | undefined }) => boolean
}

export type WorldSummaryDefinition = { id: string; summarize: (world: World) => unknown }

export type WorldCheck = (world: World) => readonly Diagnostic[]

/** Structural subset of `auth.Principal` the kernel needs for event authorization, kept free of the auth module's I/O-adjacent types. */
export type ModuleEventPrincipal = { kind: 'organiser' } | { kind: 'family'; family_id: string }

/** A module's own authorization rule for one of its event types (modules/contract.md §3.1). */
export type ModuleEventAuthorize = (
  principal: ModuleEventPrincipal,
  payload: JsonValue,
  world: World,
) => boolean

/** Validates a module event against the live world immediately before it folds. */
/**
 * The read surface an event validator receives. Deliberately not `World`.
 *
 * A validator checks invariants against live identity and labels; it never
 * reads a resolved constraint, requirement, capability, diagnostic or module
 * summary. Handing it a full `World` meant building one — a complete label sort
 * plus a complete `resolve()` — before every validated event in the log, which
 * made `derive` quadratic in the log's own length. Accessors rather than records
 * keep every call O(1) or O(bucket) and make the quadratic unrepresentable: a
 * future validator cannot reach for resolver output without widening this type
 * on purpose.
 *
 * `entities` is unordered. Validators only ever ask whether some entity matches,
 * and sorting a kind's whole population on every event would reintroduce the
 * cost this type exists to remove.
 */
export type ValidationWorld = {
  findEntity(kind: string, id: string): Entity | undefined
  entities(kind: string): readonly Entity[]
  labels(entityId: string): readonly Label[]
  labelsByKey(key: string): readonly Label[]
  /** Whether an event-opened phase has been opened. */
  phaseOpened(phase: string): boolean
  /** Whether the area's latest closing or reopening event is a closing. */
  areaClosed(area: string): boolean
}

export type ModuleEventValidate = (payload: JsonValue, world: ValidationWorld) => string | null

export type KernelConfig = {
  entity_kinds?: readonly EntityKind[]
  /** Declared id prefix per entity kind, kernel and module alike; enforced at creation (D27). */
  entity_kind_prefixes?: Readonly<Record<string, string>>
  label_schemas?: readonly LabelSchema[]
  aliases?: Readonly<Record<string, string>>
  resolver_descriptors?: readonly ResolverDescriptor[]
  capability_descriptors?: readonly CapabilityDescriptor[]
  world_summaries?: readonly WorldSummaryDefinition[]
  world_checks?: readonly WorldCheck[]
  event_value_validators?: Readonly<Record<string, (value: unknown) => string | null>>
  /** Merged kernel + selected-module payload schemas; see `defineOccasionProfile`. */
  event_payload_schemas?: EventPayloadSchemas
  /** Single-owner event type -> (module) fold dispatch; see `defineOccasionProfile`. */
  event_fold_dispatch?: Readonly<Record<string, ModuleEventFold>>
  /** Single-owner event type -> (module) authorization dispatch; see `defineOccasionProfile` and `canAppendEvent`. */
  event_authorize_dispatch?: Readonly<Record<string, ModuleEventAuthorize>>
  /** Single-owner event type -> state-aware invariant validation. */
  event_validate_dispatch?: Readonly<Record<string, ModuleEventValidate>>
  /** Module event type -> the phase fact it records; see `defineOccasionProfile`. */
  phase_event_roles?: Readonly<Record<string, PhaseEventRole>>
}
type MutableWorld = {
  families: Map<string, Entity>
  persons: Map<string, Entity>
  labels: Map<string, Label>
  emails: Map<string, string>
  head_seq: number
  /** Module-owned entities, keyed by id. */
  module_entities: Map<string, Entity>
  /** Currently live entities, kernel and module alike, keyed by id. Retirement removes the entry (D27). */
  entities_by_id: Map<string, Entity>
  /**
   * Live state indexed the three ways the fold itself queries it. Each inner map
   * is keyed by the same composite key as `labels`, so one label can be dropped
   * from every index without scanning a bucket.
   *
   * These exist because the alternatives are all linear in the whole store:
   * restating a label, retiring an entity, and a module fold asking for one
   * entity's labels each used to walk every label the occasion has, which makes
   * folding a log quadratic in its own length.
   */
  entities_by_kind: Map<string, Map<string, Entity>>
  labels_by_entity: Map<string, Map<string, Label>>
  labels_by_key: Map<string, Map<string, Label>>
  phase_opened: Map<string, { seq: number; at: string }>
  area_closings: Map<string, AreaClosing[]>
  area_latest: Map<string, { kind: 'closed' | 'reopened'; seq: number; at: string }>
}

export function derive(events: readonly Event[], config: KernelConfig = {}): World {
  // `normalizeEvents` already folds the log to run each event's validator
  // against the state before it. Folding a second time here doubled the cost of
  // every derive for an identical result.
  const { state } = normalizeEvents(events, config)
  const world = worldFromState(state, config)
  const summaries = Object.fromEntries(
    (config.world_summaries ?? []).map((definition) => [
      definition.id,
      definition.summarize(world),
    ]),
  )
  const checks = (config.world_checks ?? []).flatMap((check) => check(world))
  return {
    ...world,
    summaries,
    diagnostics: [...world.diagnostics, ...checks].sort(
      (a, b) =>
        a.id.localeCompare(b.id) ||
        a.subject_id.localeCompare(b.subject_id) ||
        a.message.localeCompare(b.message),
    ),
  }
}

export function validateEventStream(events: readonly Event[], config: KernelConfig = {}): void {
  normalizeEvents(events, config)
}

/** Rejects only diagnostics that violate the append contract; other diagnostics remain visible. */
export function assertAppendableWorld(world: World): void {
  const dangling = world.diagnostics.find(
    (diagnostic) =>
      ['kernel.dangling-reference', 'kernel.cardinality'].includes(diagnostic.id) &&
      diagnostic.severity === 'error',
  )
  if (dangling)
    throw new Error(
      `append rejected: ${dangling.id} for ${dangling.subject_id}: ${dangling.message}`,
    )
}

function normalizeEvents(
  events: readonly Event[],
  config: KernelConfig,
): { events: readonly Event[]; state: MutableWorld } {
  const schemas = eventPayloadSchemas(config)
  const validatedEvents = events.map((event) => parseEvent(event, schemas))
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
  const state = createMutableWorld()
  // One view for the whole log: it reads through to `state`, so it stays current
  // as the fold advances without being rebuilt per event.
  const view = validationWorld(state)
  for (const event of validatedEvents) {
    const validator = config.event_validate_dispatch?.[event.type]
    if (validator) {
      const error = validator(event.payload, view)
      if (error) throw new Error(error)
    }
    applyEvent(state, event, config)
  }
  return { events: validatedEvents, state }
}

function validationWorld(state: MutableWorld): ValidationWorld {
  return {
    findEntity: (kind, id) => {
      const target = state.entities_by_id.get(id)
      return target?.kind === kind ? target : undefined
    },
    entities: (kind) => [...(state.entities_by_kind.get(kind)?.values() ?? [])],
    labels: (entityId) => entityLabels(state, entityId),
    labelsByKey: (key) => [...(state.labels_by_key.get(key)?.values() ?? [])],
    phaseOpened: (phase) => state.phase_opened.has(phase),
    areaClosed: (area) => state.area_latest.get(area)?.kind === 'closed',
  }
}

function createMutableWorld(): MutableWorld {
  return {
    families: new Map(),
    persons: new Map(),
    labels: new Map(),
    emails: new Map(),
    head_seq: 0,
    module_entities: new Map(),
    entities_by_id: new Map(),
    entities_by_kind: new Map(),
    labels_by_entity: new Map(),
    labels_by_key: new Map(),
    phase_opened: new Map(),
    area_closings: new Map(),
    area_latest: new Map(),
  }
}

function indexBucket<T>(index: Map<string, Map<string, T>>, key: string): Map<string, T> {
  const existing = index.get(key)
  if (existing) return existing
  const created = new Map<string, T>()
  index.set(key, created)
  return created
}

function dropFromBucket<T>(index: Map<string, Map<string, T>>, key: string, member: string): void {
  const target = index.get(key)
  if (!target) return
  target.delete(member)
  if (target.size === 0) index.delete(key)
}

/** The only write path into `labels`; keeps both label indexes in step. */
function putLabel(state: MutableWorld, mapKey: string, label: Label): void {
  state.labels.set(mapKey, label)
  indexBucket(state.labels_by_entity, label.entity_id).set(mapKey, label)
  indexBucket(state.labels_by_key, label.key).set(mapKey, label)
}

/** The only delete path out of `labels`; keeps both label indexes in step. */
function dropLabel(state: MutableWorld, mapKey: string): void {
  const label = state.labels.get(mapKey)
  if (!label) return
  state.labels.delete(mapKey)
  dropFromBucket(state.labels_by_entity, label.entity_id, mapKey)
  dropFromBucket(state.labels_by_key, label.key, mapKey)
}

/** Live labels of one entity, in insertion order (which is `set_seq` order). */
function entityLabels(state: MutableWorld, entityId: string): readonly Label[] {
  return [...(state.labels_by_entity.get(entityId)?.values() ?? [])]
}

function worldFromState(state: MutableWorld, config: KernelConfig): World {
  const labels = [...state.labels.values()].sort(
    (a, b) =>
      a.set_seq - b.set_seq || a.entity_id.localeCompare(b.entity_id) || a.key.localeCompare(b.key),
  )
  const entities = [
    ...state.families.values(),
    ...state.persons.values(),
    ...state.module_entities.values(),
  ].sort(sortEntities)
  const entityKindById = entityKindsById(entities)
  const resolved = resolve(labels, entities, config)
  return {
    families: [...state.families.values()].sort(sortEntities),
    persons: [...state.persons.values()].sort(sortEntities),
    labels,
    head_seq: state.head_seq,
    labels_by_entity: indexLabels(labels, (label) => label.entity_id),
    labels_by_key: indexLabels(labels, (label) => label.key),
    entity_kind_by_id: entityKindById,
    family_id_by_email: familyIdsByEmail(labels, entityKindById),
    constraints: resolved.constraints,
    requirements: resolved.requirements,
    capabilities: resolved.capabilities,
    diagnostics: resolved.diagnostics,
    summaries: {},
    entities_by_kind: entitiesByKind(entities),
    phase_facts: phaseFacts(state),
  }
}

function phaseFacts(state: MutableWorld): PhaseFacts {
  const areas = new Set([...state.area_closings.keys(), ...state.area_latest.keys()])
  return {
    opened: Object.fromEntries(state.phase_opened),
    areas: Object.fromEntries(
      [...areas].sort().map((area) => [
        area,
        {
          closings: [...(state.area_closings.get(area) ?? [])],
          latest: state.area_latest.get(area) ?? null,
        },
      ]),
    ),
  }
}

/** Records the phase fact of an opening, closing, or reopening event after its module fold. */
function recordPhaseEvent(state: MutableWorld, event: Event, config: KernelConfig): void {
  const role = config.phase_event_roles?.[event.type]
  if (!role) return
  const at = { seq: event.seq, at: event.at }
  if (role.role === 'open') {
    if (!state.phase_opened.has(role.phase)) state.phase_opened.set(role.phase, at)
    return
  }
  if (role.role === 'close') {
    indexList(state.area_closings, role.area).push({ ...at, payload: event.payload })
    state.area_latest.set(role.area, { kind: 'closed', ...at })
    return
  }
  state.area_latest.set(role.area, { kind: 'reopened', ...at })
}

function indexList<T>(index: Map<string, T[]>, key: string): T[] {
  const existing = index.get(key)
  if (existing) return existing
  const created: T[] = []
  index.set(key, created)
  return created
}

function entitiesByKind(entities: readonly Entity[]): Readonly<Record<string, readonly Entity[]>> {
  const index: Record<string, Entity[]> = {}
  for (const item of entities) (index[item.kind] ??= []).push(item)
  return index
}

function entityKindsById(entities: readonly Entity[]): Readonly<Record<string, EntityKind>> {
  const index: Record<string, EntityKind> = {}
  for (const entity of entities) index[entity.id] = entity.kind
  return index
}

function familyIdsByEmail(
  labels: readonly Label[],
  entityKindById: Readonly<Record<string, EntityKind>>,
): Readonly<Record<string, string>> {
  const index: Record<string, string> = {}
  for (const label of labels)
    if (
      label.key === 'email' &&
      typeof label.value === 'string' &&
      entityKindById[label.entity_id] === 'family'
    )
      index[label.value] = label.entity_id
  return index
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
      state.families.set(familyId, registerEntity(state, config, 'family', familyId, event.seq))
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
      replaceLabels(state, familyId, 'email')
      setLabel(state, event, familyId, 'email', newEmail, null, null)
      break
    }
    case 'FamilyDisplayNameChanged': {
      const {
        family_id: familyId,
        old_display_name: oldDisplayName,
        new_display_name: newDisplayName,
      } = (event as unknown as FamilyDisplayNameChanged).payload
      requireEntity(state.families, familyId, 'family')
      const currentDisplayName = entityLabels(state, familyId).find(
        (label) => label.key === 'display-name',
      )
      if (currentDisplayName?.value !== oldDisplayName)
        throw new Error(`old display name does not match family: ${familyId}`)
      if (oldDisplayName === newDisplayName)
        throw new Error(`display name did not change for family: ${familyId}`)
      replaceLabels(state, familyId, 'display-name')
      setLabel(state, event, familyId, 'display-name', newDisplayName, null, null)
      break
    }
    case 'PersonAdded':
      addPerson(state, config, event as Extract<Event, { type: 'PersonAdded' }>)
      break
    case 'PersonUpdated':
      updatePerson(state, event as Extract<Event, { type: 'PersonUpdated' }>)
      break
    case 'PersonWithdrawn': {
      const { person_id: personId } = (event as unknown as PersonWithdrawn).payload
      requireEntity(state.persons, personId, 'person')
      state.persons.delete(personId)
      unregisterEntity(state, personId)
      removeLabelsForEntity(state, personId)
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
      assertConfiguredLabelMutation(
        config,
        entityId,
        clearKey,
        false,
        state.entities_by_id.get(entityId),
      )
      if (value === null) replaceLabels(state, entityId, clearKey)
      else dropLabel(state, labelKey(entityId, clearKey, value))
      break
    }
    default: {
      const fold = config.event_fold_dispatch?.[event.type]
      if (!fold) throw new Error(`unknown event type: ${event.type}`)
      const capability: ModuleFoldCapability = {
        findEntity: (kind, id) => {
          const target = state.entities_by_id.get(id)
          return target?.kind === kind ? target : undefined
        },
        entities: (kind) =>
          [...(state.entities_by_kind.get(kind)?.values() ?? [])].sort(sortEntities),
        labels: (entityId) => entityLabels(state, entityId),
        setSortKey: (kind, id, sortKey) => {
          const target = state.entities_by_id.get(id)
          if (!target || target.kind !== kind) throw new Error(`unknown ${kind}: ${id}`)
          target.sort_key = sortKey
        },
        createEntity: (kind, id, seq, sortKey) => {
          const created = registerEntity(state, config, kind, id, seq, sortKey)
          state.module_entities.set(id, created)
          return created
        },
        retireEntity: (kind, id) => {
          const target = state.entities_by_id.get(id)
          if (!target || target.kind !== kind) throw new Error(`unknown ${kind}: ${id}`)
          state.module_entities.delete(id)
          unregisterEntity(state, id)
          removeLabelsForEntity(state, id)
        },
        clearLabel: (entityId, key) => {
          const target = state.entities_by_id.get(entityId)
          if (!target) throw new Error(`unknown entity: ${entityId}`)
          const canonicalKey = configuredLabelKey(config, key)
          const schema = config.label_schemas?.find((candidate) => candidate.key === canonicalKey)
          if (schema?.scopes && !schema.scopes.includes(target.kind))
            throw new Error(`label ${canonicalKey} is not valid for ${target.kind}`)
          replaceLabels(state, entityId, canonicalKey)
        },
        setLabel: (entityId, key, value, strength, note) =>
          setConfiguredLabel(state, event, config, entityId, key, value, strength, note, true),
        replaceLabels: (entityId, values) => {
          for (const { key } of values)
            replaceLabels(state, entityId, configuredLabelKey(config, key))
          for (const { key, value, strength, note } of values)
            setConfiguredLabel(state, event, config, entityId, key, value, strength, note, true)
        },
      }
      fold(capability, { type: event.type, payload: event.payload, seq: event.seq })
      recordPhaseEvent(state, event, config)
    }
  }
  state.head_seq = event.seq
}

/**
 * Creates and registers a live entity. Cross-kind id collisions are prevented
 * structurally — the id must start with its own kind's declared prefix
 * (kernel-reserved for family/person, module-declared otherwise) — so no
 * permanent ledger of retired ids is needed (D27).
 */
function registerEntity(
  state: MutableWorld,
  config: KernelConfig,
  kind: EntityKind,
  id: string,
  seq: number,
  sortKey?: number,
): Entity {
  const prefix = kernelEntityKindPrefixes[kind] ?? config.entity_kind_prefixes?.[kind]
  if (!prefix || !id.startsWith(prefix))
    throw new Error(`id for kind ${kind} must start with its declared prefix: ${id}`)
  if (state.entities_by_id.has(id)) throw new Error(`entity already exists: ${id}`)
  const created = entity(id, kind, seq, sortKey)
  state.entities_by_id.set(id, created)
  indexBucket(state.entities_by_kind, kind).set(id, created)
  return created
}

/** The only removal path for a live entity; keeps the per-kind index in step. */
function unregisterEntity(state: MutableWorld, id: string): void {
  const target = state.entities_by_id.get(id)
  if (!target) return
  state.entities_by_id.delete(id)
  dropFromBucket(state.entities_by_kind, target.kind, id)
}

function addPerson(
  state: MutableWorld,
  config: KernelConfig,
  event: Extract<Event, { type: 'PersonAdded' }>,
): void {
  const { person_id: personId, family_id: familyId } = event.payload
  requireEntity(state.families, familyId, 'family')
  if (state.persons.has(personId)) throw new Error(`person already exists: ${personId}`)
  state.persons.set(personId, registerEntity(state, config, 'person', personId, event.seq))
  writePersonLabels(state, event)
}

function updatePerson(state: MutableWorld, event: Extract<Event, { type: 'PersonUpdated' }>): void {
  requireEntity(state.persons, event.payload.person_id, 'person')
  requireEntity(state.families, event.payload.family_id, 'family')
  const currentFamilyId = [...state.labels.values()].find(
    (label) => label.entity_id === event.payload.person_id && label.key === 'member-of',
  )?.value
  if (currentFamilyId !== event.payload.family_id)
    throw new Error(`person ${event.payload.person_id} cannot change family during an update`)
  for (const key of ['member-of', 'given-name', 'family-name', 'age', 'role'])
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
    age,
    role,
  } = event.payload
  setLabel(state, event, personId, 'member-of', familyId, null, null)
  setLabel(state, event, personId, 'given-name', givenName, null, null)
  setLabel(state, event, personId, 'family-name', familyName, null, null)
  setLabel(state, event, personId, 'age', age, null, null)
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
  sensitivity: Label['sensitivity'] = 'normal',
): void {
  putLabel(state, labelKey(entityId, key, value), {
    entity_id: entityId,
    key,
    value,
    value_type: jsonValueType(value),
    strength,
    note,
    set_seq: event.seq,
    sensitivity,
  })
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
  allowSetupOnly = false,
): void {
  const canonicalKey = configuredLabelKey(config, key)
  const schema = config.label_schemas?.find((candidate) => candidate.key === canonicalKey)
  const target = state.entities_by_id.get(entityId)
  if (
    canonicalKey === 'provides' &&
    typeof value === 'string' &&
    config.capability_descriptors?.some(
      (descriptor) => descriptor.key === value && descriptor.derive,
    )
  )
    throw new Error(`derived capability cannot be assigned: ${value}`)
  assertConfiguredLabelMutation(config, entityId, canonicalKey, allowSetupOnly, target)
  const cardinality =
    schema?.cardinality ?? (fixedResolverKeys.has(canonicalKey) ? 'zero-or-more' : undefined)
  if (cardinality !== 'zero-or-more') replaceLabels(state, entityId, canonicalKey)
  const error = schema?.validate?.(value)
  if (error) throw new Error(error)
  setLabel(
    state,
    event,
    entityId,
    canonicalKey,
    value,
    strength,
    note,
    schema?.sensitivity ?? 'normal',
  )
}

function assertConfiguredLabelMutation(
  config: KernelConfig,
  entityId: string,
  canonicalKey: string,
  allowSetupOnly: boolean,
  target: Entity | undefined,
): void {
  const schema = config.label_schemas?.find((candidate) => candidate.key === canonicalKey)
  if (schema?.setup_only && !allowSetupOnly)
    throw new Error(
      `label key is setup-owned and cannot be written via LabelSet/LabelCleared: ${canonicalKey}`,
    )
  if (schema?.scopes && target && !schema.scopes.includes(target.kind))
    throw new Error(`label ${canonicalKey} is not valid for ${target.kind}`)
  if (!target) throw new Error(`unknown entity: ${entityId}`)
}

function configuredLabelKey(config: KernelConfig, key: string): string {
  const canonicalKey = config.aliases?.[key] ?? key
  if (kernelSetupOwnedLabelKeys.has(canonicalKey))
    throw new Error(
      `label key is setup-owned and cannot be written via LabelSet/LabelCleared: ${canonicalKey}`,
    )
  const schemas = config.label_schemas ?? []
  const resolverKeys = new Set([
    ...(config.resolver_descriptors ?? []).map((descriptor) => descriptor.key),
    ...fixedResolverKeys,
  ])
  if (
    schemas.length > 0 &&
    !schemas.some((schema) => schema.key === canonicalKey) &&
    !resolverKeys.has(canonicalKey)
  )
    throw new Error(`unknown label key: ${key}`)
  return canonicalKey
}

/** Removes every live label under `key` for `entityId` (a restatement or an explicit clear-all). */
function replaceLabels(state: MutableWorld, entityId: string, key: string): void {
  const bucket = state.labels_by_entity.get(entityId)
  if (!bucket) return
  const doomed: string[] = []
  for (const [mapKey, label] of bucket) if (label.key === key) doomed.push(mapKey)
  for (const mapKey of doomed) dropLabel(state, mapKey)
}

/** Removes every live label belonging to `entityId`, regardless of key (entity retirement). */
function removeLabelsForEntity(state: MutableWorld, entityId: string): void {
  const bucket = state.labels_by_entity.get(entityId)
  if (!bucket) return
  for (const mapKey of [...bucket.keys()]) dropLabel(state, mapKey)
}

function labelKey(entityId: string, key: string, value: JsonValue): string {
  return `${entityId}|${key}|${canonicalJson(value)}`
}

function requireKnownEntity(state: MutableWorld, id: string): void {
  if (!state.entities_by_id.has(id)) throw new Error(`unknown entity: ${id}`)
}

function requireEntity(map: Map<string, Entity>, id: string, kind: EntityKind): void {
  if (!map.has(id)) throw new Error(`unknown ${kind}: ${id}`)
}

function entity(id: string, kind: EntityKind, seq: number, sortKey?: number): Entity {
  return { id, kind, sort_key: sortKey ?? seq, created_seq: seq }
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
