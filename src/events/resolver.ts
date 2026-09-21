import type { CapabilityDescriptor, Entity, KernelConfig, Label, ResolverDescriptor } from './fold.js'

export type ResolvedConstraint = {
  key: string
  holder_id: string
  value: string
  strength: 'required' | 'preferred' | null
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
export function resolve(labels: readonly Label[], entities: readonly Entity[], config: KernelConfig = {}) {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const labelsByEntity = new Map<string, Label[]>()
  for (const label of labels)
    (labelsByEntity.get(label.entity_id) ?? labelsByEntity.set(label.entity_id, []).get(label.entity_id)!).push(label)
  const constraints: ResolvedConstraint[] = []
  const capabilities: ResolvedCapability[] = []
  const diagnostics: Diagnostic[] = []
  const descriptors = new Map<string, ResolverDescriptor>((config.resolver_descriptors ?? []).map((item) => [item.key, item]))
  const schemas = new Map((config.label_schemas ?? []).map((item) => [item.key, item]))
  const derived = new Map<string, CapabilityDescriptor>((config.capability_descriptors ?? []).map((item) => [item.key, item]))
  for (const label of labels) {
    const entity = entityById.get(label.entity_id)
    const schema = schemas.get(label.key)
    const descriptor = descriptors.get(label.key)
    const fixed = ['needs', 'provides', 'excludes', 'groups-with', 'separates-from'].includes(label.key)
    const kernel = ['display-name', 'email', 'locale', 'member-of', 'given-name', 'family-name', 'birthdate', 'role'].includes(label.key)
    if (!schema && !descriptor && !fixed && !kernel) {
      diagnostics.push(diagnostic('kernel.unknown-trait', 'warning', label.entity_id, `unknown trait: ${label.key}`))
      continue
    }
    if (schema?.scopes && entity && !schema.scopes.includes(entity.kind))
      diagnostics.push(diagnostic('kernel.scope-violation', 'error', label.entity_id, `label ${label.key} is not valid for ${entity.kind}`))
    if (schema?.valid_for && entity && !schema.valid_for(labelView(entity.id, labelsByEntity)))
      diagnostics.push(diagnostic('kernel.valid-for', 'warning', label.entity_id, `label ${label.key} is not valid for this entity`))
    if (fixed || descriptor) {
      if (typeof label.value !== 'string' || label.value.length === 0)
        diagnostics.push(diagnostic('kernel.invalid-resolver-value', 'error', label.entity_id, 'resolver value must be a non-empty string'))
      else {
        const operator = descriptor?.operator ?? label.key
        if (operator === 'capability' || label.key === 'provides') capabilities.push({ entity_id: label.entity_id, key: label.value, source: 'assigned', set_seq: label.set_seq })
        else constraints.push({ key: label.key, holder_id: label.entity_id, value: label.value, strength: label.strength, set_seq: label.set_seq })
        if (referencesEntity(operator, label.key, label.value) && (!entityById.has(label.value) || entityById.get(label.value)?.retired_seq !== null))
          diagnostics.push(diagnostic('kernel.dangling-reference', 'error', label.entity_id, `unknown entity: ${label.value}`))
      }
    }
  }
  for (const entity of entities) for (const descriptor of derived.values()) {
    if (!descriptor.scopes.includes(entity.kind) || !descriptor.derive?.(labelView(entity.id, labelsByEntity))) continue
    capabilities.push({ entity_id: entity.id, key: descriptor.key, source: 'derived', set_seq: entity.created_seq })
  }
  for (const constraint of constraints) {
    if ((constraint.key !== 'groups-with' && constraint.key !== 'separates-from') || constraint.strength !== 'required') continue
    const opposite = constraint.key === 'groups-with' ? 'separates-from' : 'groups-with'
    if (constraints.some((other) => other.holder_id === constraint.holder_id && other.key === opposite && other.value === constraint.value && other.strength === 'required')) diagnostics.push(diagnostic('kernel.contradiction', 'error', constraint.holder_id, `contradictory required relations to ${constraint.value}`))
  }
  return {
    constraints: constraints.sort((a, b) => a.set_seq - b.set_seq || a.holder_id.localeCompare(b.holder_id) || a.key.localeCompare(b.key) || a.value.localeCompare(b.value)),
    capabilities: capabilities.sort((a, b) => a.entity_id.localeCompare(b.entity_id) || a.key.localeCompare(b.key) || a.source.localeCompare(b.source) || a.set_seq - b.set_seq),
    diagnostics: diagnostics.sort((a, b) => a.id.localeCompare(b.id) || a.subject_id.localeCompare(b.subject_id) || a.message.localeCompare(b.message)),
  }
}

function labelView(entityId: string, labelsByEntity: ReadonlyMap<string, readonly Label[]>) {
  return { label: (key: string) => labelsByEntity.get(entityId)?.find((label) => label.key === key)?.value }
}
function referencesEntity(operator: string, key: string, value: string): boolean {
  return ['groups-with', 'separates-from', 'excludes'].includes(operator) || (key !== 'needs' && key !== 'provides' && value.includes('_'))
}
function diagnostic(id: string, severity: Diagnostic['severity'], subject_id: string, message: string): Diagnostic { return { id, severity, subject_id, message } }
