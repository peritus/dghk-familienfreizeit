import { canonicalJson, type Event } from './types.js'
import { derive, type Entity, type KernelConfig, type World, type Label } from './fold.js'

export type WorldChange = {
  kind: 'entity-created' | 'entity-retired' | 'label-set' | 'label-cleared'
  subject_id: string
  key?: string
  value?: string
}

/** Derives the organiser's prospective world without persisting the local draft list. */
export function deriveDraftWorld(
  committed: readonly Event[],
  drafts: readonly Event[],
  config: KernelConfig = {},
): World {
  return derive([...committed, ...drafts], config)
}

/** Removes restricted labels from a shared view while retaining ordinary derived state. */
export function projectSharedWorld(world: World): World {
  return project(
    world,
    world.labels.filter((label) => label.sensitivity === 'normal'),
    world.families,
    world.persons,
  )
}

/** Returns only a family's entities and labels; another family's restricted facts never cross this boundary. */
export function projectFamilyWorld(world: World, familyId: string): World {
  // Membership comes off the key index: scanning every label in the occasion to
  // find one family's members ran on each family request.
  const personIds = new Set(
    (world.labels_by_key['member-of'] ?? [])
      .filter((label) => label.value === familyId)
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
export function diff(before: World, after: World): readonly WorldChange[] {
  const changes: WorldChange[] = []
  const beforeEntities = new Map(allEntities(before).map((entity) => [entity.id, entity]))
  const afterEntities = new Map(allEntities(after).map((entity) => [entity.id, entity]))
  for (const id of afterEntities.keys())
    if (!beforeEntities.has(id)) changes.push({ kind: 'entity-created', subject_id: id })
  for (const id of beforeEntities.keys())
    if (!afterEntities.has(id)) changes.push({ kind: 'entity-retired', subject_id: id })
  const beforeLabels = new Map(before.labels.map((label) => [labelId(label), label]))
  const afterLabels = new Map(after.labels.map((label) => [labelId(label), label]))
  for (const [id, label] of afterLabels)
    if (!beforeLabels.has(id)) changes.push(labelChange('label-set', label))
  for (const [id, label] of beforeLabels)
    if (!afterLabels.has(id)) changes.push(labelChange('label-cleared', label))
  return changes.sort(
    (a, b) =>
      a.subject_id.localeCompare(b.subject_id) ||
      a.kind.localeCompare(b.kind) ||
      (a.key ?? '').localeCompare(b.key ?? '') ||
      (a.value ?? '').localeCompare(b.value ?? ''),
  )
}

function project(
  world: World,
  labels: readonly Label[],
  families: readonly Entity[],
  persons: readonly Entity[],
): World {
  const entities = [...families, ...persons]
  // Holder membership as a set, not a scan of the surviving entities per
  // resolved row: the shared projection is over the whole occasion, so the
  // paired loops cost entities times constraints.
  const visible = new Set(entities.map((entity) => entity.id))
  return {
    ...world,
    families: [...families],
    persons: [...persons],
    labels: [...labels],
    labels_by_entity: index(labels, (label) => label.entity_id),
    labels_by_key: index(labels, (label) => label.key),
    entity_kind_by_id: entityKindsById(entities),
    family_id_by_email: familyIdsByEmail(labels, entities),
    constraints: world.constraints.filter((constraint) => visible.has(constraint.holder_id)),
    requirements: world.requirements.filter((requirement) => visible.has(requirement.holder_id)),
    capabilities: world.capabilities.filter((capability) => visible.has(capability.entity_id)),
    entities_by_kind: index(entities, (entity) => entity.kind),
  }
}

function index<T>(
  items: readonly T[],
  key: (item: T) => string,
): Readonly<Record<string, readonly T[]>> {
  const result: Record<string, T[]> = {}
  for (const item of items) (result[key(item)] ??= []).push(item)
  return result
}

function entityKindsById(entities: readonly Entity[]): Readonly<Record<string, Entity['kind']>> {
  const result: Record<string, Entity['kind']> = {}
  for (const entity of entities) result[entity.id] = entity.kind
  return result
}

function familyIdsByEmail(
  labels: readonly Label[],
  entities: readonly Entity[],
): Readonly<Record<string, string>> {
  const familyIds = new Set(
    entities.filter((entity) => entity.kind === 'family').map((entity) => entity.id),
  )
  const result: Record<string, string> = {}
  for (const label of labels)
    if (label.key === 'email' && typeof label.value === 'string' && familyIds.has(label.entity_id))
      result[label.value] = label.entity_id
  return result
}

function allEntities(world: World): readonly Entity[] {
  return Object.values(world.entities_by_kind).flat()
}

function labelId(label: Label): string {
  return `${label.entity_id}|${label.key}|${canonicalJson(label.value)}`
}

function labelChange(kind: WorldChange['kind'], label: Label): WorldChange {
  return { kind, subject_id: label.entity_id, key: label.key, value: canonicalJson(label.value) }
}
