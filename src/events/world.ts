import { canonicalJson, type Event } from './types.js'
import { derive, type Entity, type KernelConfig, type KernelWorld, type Label } from './fold.js'

export type WorldChange = {
  kind: 'entity-created' | 'entity-retired' | 'label-set' | 'label-cleared'
  subject_id: string
  key?: string
  value?: string
}

/** Derives the organiser's prospective world without persisting the local event list. */
export function derivePending(
  committed: readonly Event[],
  pending: readonly Event[],
  config: KernelConfig = {},
): KernelWorld {
  return derive([...committed, ...pending], config)
}

/** Removes restricted labels from a shared view while retaining ordinary derived state. */
export function projectSharedWorld(world: KernelWorld): KernelWorld {
  return project(world, world.labels.filter((label) => label.sensitivity === 'normal'), world.families, world.persons)
}

/** Returns only a family's entities and labels; another family's restricted facts never cross this boundary. */
export function projectFamilyWorld(world: KernelWorld, familyId: string): KernelWorld {
  const personIds = new Set(
    world.labels
      .filter((label) => label.key === 'member-of' && label.value === familyId && label.cleared_seq === null)
      .map((label) => label.entity_id),
  )
  const visibleIds = new Set([familyId, ...personIds])
  return project(
    world,
    world.labels.filter((label) => visibleIds.has(label.entity_id)),
    world.families.filter((entity) => entity.id === familyId),
    world.persons.filter((entity) => personIds.has(entity.id)),
  )
}

/** Produces a stable, domain-only change list from two derived worlds. */
export function diff(before: KernelWorld, after: KernelWorld): readonly WorldChange[] {
  const changes: WorldChange[] = []
  const beforeEntities = new Map(allEntities(before).map((entity) => [entity.id, entity]))
  for (const entity of allEntities(after)) {
    const prior = beforeEntities.get(entity.id)
    if (!prior) changes.push({ kind: 'entity-created', subject_id: entity.id })
    else if (prior.retired_seq === null && entity.retired_seq !== null)
      changes.push({ kind: 'entity-retired', subject_id: entity.id })
  }
  const beforeLabels = new Map(before.labels.map((label) => [labelId(label), label]))
  for (const label of after.labels) {
    const prior = beforeLabels.get(labelId(label))
    if (!prior) changes.push(labelChange('label-set', label))
    else if (prior.cleared_seq === null && label.cleared_seq !== null)
      changes.push(labelChange('label-cleared', label))
  }
  return changes.sort((a, b) => a.subject_id.localeCompare(b.subject_id) || a.kind.localeCompare(b.kind) || (a.key ?? '').localeCompare(b.key ?? '') || (a.value ?? '').localeCompare(b.value ?? ''))
}

function project(world: KernelWorld, labels: readonly Label[], families: readonly Entity[], persons: readonly Entity[]): KernelWorld {
  const active = labels.filter((label) => label.cleared_seq === null)
  const entities = [...families, ...persons]
  return {
    ...world,
    families: [...families],
    persons: [...persons],
    labels: [...labels],
    labels_by_entity: index(active, (label) => label.entity_id),
    labels_by_key: index(active, (label) => label.key),
    constraints: world.constraints.filter((constraint) => entities.some((entity) => entity.id === constraint.holder_id)),
    capabilities: world.capabilities.filter((capability) => entities.some((entity) => entity.id === capability.entity_id)),
    entities_by_kind: index(entities, (entity) => entity.kind),
  }
}

function index<T>(items: readonly T[], key: (item: T) => string): Readonly<Record<string, readonly T[]>> {
  const result: Record<string, T[]> = {}
  for (const item of items) (result[key(item)] ??= []).push(item)
  return result
}
function allEntities(world: KernelWorld): readonly Entity[] { return Object.values(world.entities_by_kind).flat() }
function labelId(label: Label): string { return `${label.entity_id}|${label.key}|${canonicalJson(label.value)}` }
function labelChange(kind: WorldChange['kind'], label: Label): WorldChange { return { kind, subject_id: label.entity_id, key: label.key, value: canonicalJson(label.value) } }
