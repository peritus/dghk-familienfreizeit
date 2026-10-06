import type {
  CapabilityDescriptor,
  Entity,
  KernelConfig,
  Label,
  LabelSchema,
  ResolverDescriptor,
} from './fold.js'
import type { JsonValue } from './types.js'

export type ResolvedConstraint = {
  key: string
  holder_id: string
  value: string
  strength: 'required' | 'preferred' | null
  set_seq: number
}

export type ResolvedRequirement = {
  trait_key: string
  holder_id: string
  capability_key: string | null
  kind: 'profile-requirement' | 'generic-needs' | 'relation' | 'structural'
  structural: string | null
  value: string | null
  strength: 'required' | 'preferred' | null
  weight: number | null
  penalty: number | null
  set_seq: number
}

export type ResolvedCapability = {
  entity_id: string
  key: string
  source: 'assigned' | 'derived'
  set_seq: number
}

export type Diagnostic = {
  id: string
  severity: 'error' | 'warning'
  subject_id: string
  message: string
}

/** Normalizes fixed resolver inputs; modules consume this result instead of event payloads. */
export function resolve(
  labels: readonly Label[],
  entities: readonly Entity[],
  config: KernelConfig = {},
) {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const labelsByEntity = new Map<string, Label[]>()
  for (const label of labels)
    (
      labelsByEntity.get(label.entity_id) ??
      labelsByEntity.set(label.entity_id, []).get(label.entity_id)!
    ).push(label)
  const constraints: ResolvedConstraint[] = []
  const requirements: ResolvedRequirement[] = []
  const capabilities: ResolvedCapability[] = []
  const diagnostics: Diagnostic[] = []
  const descriptors = new Map<string, ResolverDescriptor>(
    (config.resolver_descriptors ?? []).map((item) => [item.key, item]),
  )
  const schemas = new Map((config.label_schemas ?? []).map((item) => [item.key, item]))
  const derived = new Map<string, CapabilityDescriptor>(
    (config.capability_descriptors ?? []).map((item) => [item.key, item]),
  )
  /**
   * Per-entity `key -> first value` views, built once per entity on first use.
   * `valid_for` and every capability descriptor call one of these, and each call
   * used to scan that entity's labels again. First value wins, which is the
   * order `labels` is already sorted in.
   */
  const viewCache = new Map<string, { label(key: string): JsonValue | undefined }>()
  const viewFor = (entityId: string): { label(key: string): JsonValue | undefined } => {
    const cached = viewCache.get(entityId)
    if (cached) return cached
    const values = new Map<string, JsonValue>()
    for (const label of labelsByEntity.get(entityId) ?? [])
      if (!values.has(label.key)) values.set(label.key, label.value)
    const created = { label: (key: string): JsonValue | undefined => values.get(key) }
    viewCache.set(entityId, created)
    return created
  }
  /** Scoped schema and descriptor lookups, so a per-entity pass never walks the whole declaration set. */
  const cardinalitySchemasByKind = new Map<string, LabelSchema[]>()
  for (const schema of schemas.values()) {
    if (schema.cardinality === undefined) continue
    for (const scope of schema.scopes ?? []) bucketOf(cardinalitySchemasByKind, scope).push(schema)
  }
  const derivedByKind = new Map<string, CapabilityDescriptor[]>()
  for (const descriptor of derived.values())
    for (const scope of descriptor.scopes) bucketOf(derivedByKind, scope).push(descriptor)
  /** `entity id -> label key -> live count`, for the cardinality pass. */
  const countsByEntity = new Map<string, Map<string, number>>()
  for (const label of labels) {
    const counts = countsByEntity.get(label.entity_id) ?? new Map<string, number>()
    counts.set(label.key, (counts.get(label.key) ?? 0) + 1)
    countsByEntity.set(label.entity_id, counts)
  }
  for (const label of labels) {
    const entity = entityById.get(label.entity_id)
    const schema = schemas.get(label.key)
    const descriptor = descriptors.get(label.key)
    const fixed = ['needs', 'provides', 'excludes', 'groups-with', 'separates-from'].includes(
      label.key,
    )
    const kernel = [
      'display-name',
      'email',
      'locale',
      'member-of',
      'given-name',
      'family-name',
      'age',
      'role',
    ].includes(label.key)
    if (!schema && !descriptor && !fixed && !kernel) {
      diagnostics.push(
        diagnostic(
          'kernel.unknown-trait',
          'warning',
          label.entity_id,
          `unknown trait: ${label.key}`,
        ),
      )
      continue
    }
    if (schema?.scopes && entity && !schema.scopes.includes(entity.kind))
      diagnostics.push(
        diagnostic(
          'kernel.scope-violation',
          'error',
          label.entity_id,
          `label ${label.key} is not valid for ${entity.kind}`,
        ),
      )
    if (schema?.valid_for && entity && !schema.valid_for(viewFor(entity.id)))
      diagnostics.push(
        diagnostic(
          'kernel.valid-for',
          'warning',
          label.entity_id,
          `label ${label.key} is not valid for this entity`,
        ),
      )
    if (fixed || descriptor) {
      if (typeof label.value !== 'string' || label.value.length === 0)
        diagnostics.push(
          diagnostic(
            'kernel.invalid-resolver-value',
            'error',
            label.entity_id,
            'resolver value must be a non-empty string',
          ),
        )
      else {
        const operator = descriptor?.operator ?? label.key
        if (operator === 'capability' || label.key === 'provides')
          capabilities.push({
            entity_id: label.entity_id,
            key: label.value,
            source: 'assigned',
            set_seq: label.set_seq,
          })
        else
          constraints.push({
            key: label.key,
            holder_id: label.entity_id,
            value: label.value,
            strength: label.strength,
            set_seq: label.set_seq,
          })
        if (typeof label.value === 'string') {
          if (descriptor?.kind === 'requirement')
            requirements.push({
              trait_key: label.key,
              holder_id: label.entity_id,
              capability_key: descriptor.satisfied_by ?? label.value,
              kind: descriptor.structural ? 'structural' : 'profile-requirement',
              structural: descriptor.structural ?? null,
              value: label.value,
              strength: label.strength,
              weight: descriptor.weight ?? null,
              penalty: descriptor.penalty ?? null,
              set_seq: label.set_seq,
            })
          else if (label.key === 'needs')
            requirements.push({
              trait_key: label.key,
              holder_id: label.entity_id,
              capability_key: label.value,
              kind: 'generic-needs',
              structural: null,
              value: label.value,
              strength: label.strength,
              weight: null,
              penalty: null,
              set_seq: label.set_seq,
            })
          else if (operator === 'groups-with' || operator === 'separates-from')
            requirements.push({
              trait_key: label.key,
              holder_id: label.entity_id,
              capability_key: null,
              kind: 'relation',
              structural: null,
              value: label.value,
              strength: label.strength,
              weight: descriptor?.weight ?? null,
              penalty: descriptor?.penalty ?? null,
              set_seq: label.set_seq,
            })
        }
        if (referencesEntity(operator, label.key, label.value) && !entityById.has(label.value))
          diagnostics.push(
            diagnostic(
              'kernel.dangling-reference',
              'error',
              label.entity_id,
              `unknown entity: ${label.value}`,
            ),
          )
      }
    }
  }
  for (const entity of entities)
    for (const schema of cardinalitySchemasByKind.get(entity.kind) ?? []) {
      const count = countsByEntity.get(entity.id)?.get(schema.key) ?? 0
      const invalid =
        (schema.cardinality === 'exactly-one' && count !== 1) ||
        (schema.cardinality === 'zero-or-one' && count > 1)
      if (invalid)
        diagnostics.push(
          diagnostic(
            'kernel.cardinality',
            'error',
            entity.id,
            `label ${schema.key} requires ${schema.cardinality}, found ${count}`,
          ),
        )
    }
  for (const entity of entities)
    for (const descriptor of derivedByKind.get(entity.kind) ?? []) {
      if (!descriptor.derive?.(viewFor(entity.id))) continue
      capabilities.push({
        entity_id: entity.id,
        key: descriptor.key,
        source: 'derived',
        set_seq: entity.created_seq,
      })
    }
  // Required relations indexed by holder and target, so detecting a
  // contradiction is a lookup rather than a scan of every constraint.
  const requiredRelations = new Set<string>()
  for (const constraint of constraints)
    if (
      (constraint.key === 'groups-with' || constraint.key === 'separates-from') &&
      constraint.strength === 'required'
    )
      requiredRelations.add(relationKey(constraint.holder_id, constraint.key, constraint.value))
  for (const constraint of constraints) {
    if (
      (constraint.key !== 'groups-with' && constraint.key !== 'separates-from') ||
      constraint.strength !== 'required'
    )
      continue
    const opposite = constraint.key === 'groups-with' ? 'separates-from' : 'groups-with'
    if (requiredRelations.has(relationKey(constraint.holder_id, opposite, constraint.value)))
      diagnostics.push(
        diagnostic(
          'kernel.contradiction',
          'error',
          constraint.holder_id,
          `contradictory required relations to ${constraint.value}`,
        ),
      )
  }
  return {
    constraints: constraints.sort(
      (a, b) =>
        a.set_seq - b.set_seq ||
        a.holder_id.localeCompare(b.holder_id) ||
        a.key.localeCompare(b.key) ||
        a.value.localeCompare(b.value),
    ),
    requirements: requirements.sort(
      (a, b) =>
        a.set_seq - b.set_seq ||
        a.holder_id.localeCompare(b.holder_id) ||
        a.trait_key.localeCompare(b.trait_key) ||
        (a.value ?? '').localeCompare(b.value ?? ''),
    ),
    capabilities: capabilities.sort(
      (a, b) =>
        a.entity_id.localeCompare(b.entity_id) ||
        a.key.localeCompare(b.key) ||
        a.source.localeCompare(b.source) ||
        a.set_seq - b.set_seq,
    ),
    diagnostics: diagnostics.sort(
      (a, b) =>
        a.id.localeCompare(b.id) ||
        a.subject_id.localeCompare(b.subject_id) ||
        a.message.localeCompare(b.message),
    ),
  }
}

function bucketOf<T>(index: Map<string, T[]>, key: string): T[] {
  const existing = index.get(key)
  if (existing) return existing
  const created: T[] = []
  index.set(key, created)
  return created
}

function relationKey(holderId: string, key: string, value: string): string {
  return `${holderId}\u0000${key}\u0000${value}`
}

function referencesEntity(operator: string, key: string, value: string): boolean {
  return (
    ['groups-with', 'separates-from', 'excludes'].includes(operator) ||
    (key !== 'needs' && key !== 'provides' && value.includes('_'))
  )
}

function diagnostic(
  id: string,
  severity: Diagnostic['severity'],
  subjectId: string,
  message: string,
): Diagnostic {
  return { id, severity, subject_id: subjectId, message }
}
