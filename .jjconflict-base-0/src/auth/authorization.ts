import type { KernelConfig, World } from '../events/fold.js'
import type {
  Event,
  FamilyDisplayNameChanged,
  LabelCleared,
  LabelSet,
  PersonAdded,
  PersonUpdated,
  PersonWithdrawn,
} from '../events/types.js'
import type { Principal } from './principal.js'

/** Kernel event types with their own entity-ownership check below; every other type is a module event dispatched to its own declared rule. */
const kernelEntityEventTypes = new Set([
  'PersonAdded',
  'PersonUpdated',
  'PersonWithdrawn',
  'FamilyDisplayNameChanged',
  'LabelSet',
  'LabelCleared',
])

/**
 * Authorizes a whole batch against one derived world.
 *
 * Taking a single `World` is the point of this function existing. The append
 * handler used to call `canAppendEvent` inside `events.some(...)` and pass
 * `derive(existing)` as the argument, so appending a batch folded the entire
 * event log once per event in it. A batch signature makes that shape
 * unrepresentable: there is one world, and the caller has to decide which.
 *
 * The world is the one before the batch, so every event in a batch is
 * authorized against the same state. That is what the per-event version did,
 * and changing it would be a policy decision rather than a cost one.
 */
export function authorizeEventBatch(
  principal: Principal,
  events: readonly Event[],
  world: World,
  config: KernelConfig,
  familyLabelOffered?: FamilyLabelOffered,
): boolean {
  return events.every((event) =>
    canAppendEvent(principal, event, world, config, familyLabelOffered),
  )
}

/**
 * Whether a family label write is currently offered by its governing feature
 * (spec/architecture/features.md §4). Availability only narrows: it is consulted after every
 * ordinary authorisation rule passes, and never for organisers.
 */
export type FamilyLabelOffered = (canonicalKey: string) => boolean

export function canAppendEvent(
  principal: Principal,
  event: Event,
  world: World,
  config: KernelConfig,
  familyLabelOffered?: FamilyLabelOffered,
): boolean {
  if (principal.kind === 'organiser') return true
  if (event.type === 'FamilyInvited' || event.type === 'FamilyEmailChanged') return false
  if (event.type === 'LabelSet' || event.type === 'LabelCleared') {
    const key = (event as unknown as LabelSet | LabelCleared).payload.key
    if (!isFamilyWritable(config, key)) return false
    if (
      familyLabelOffered &&
      !familyLabelOffered(
        config.label_schemas?.find((schema) => schema.key === (config.aliases?.[key] ?? key))
          ?.governed_control ??
          config.aliases?.[key] ??
          key,
      )
    )
      return false
  }
  if (!kernelEntityEventTypes.has(event.type)) {
    const authorize = config.event_authorize_dispatch?.[event.type]
    return authorize ? authorize(principal, event.payload, world) : false
  }
  const entityId =
    event.type === 'FamilyDisplayNameChanged'
      ? (event as unknown as FamilyDisplayNameChanged).payload.family_id
      : event.type === 'PersonAdded'
        ? (event as unknown as PersonAdded | PersonUpdated).payload.family_id
        : event.type === 'PersonUpdated'
          ? (event as unknown as PersonUpdated).payload.person_id
          : event.type === 'PersonWithdrawn'
            ? (event as unknown as PersonWithdrawn).payload.person_id
            : (event as unknown as LabelSet | LabelCleared).payload.entity_id
  return familyForEntity(world, entityId) === principal.family_id
}

function isFamilyWritable(config: KernelConfig, key: string): boolean {
  const canonicalKey = config.aliases?.[key] ?? key
  return (
    config.label_schemas?.some(
      (schema) => schema.key === canonicalKey && schema.family_writable === true,
    ) ?? false
  )
}

function familyForEntity(world: World, entityId: string): string | null {
  // Both lookups go through indexes. This is called once per event in an
  // authorized batch, and it used to scan every family and then every label.
  if (world.entity_kind_by_id[entityId] === 'family') return entityId
  const memberOf = (world.labels_by_entity[entityId] ?? []).find(
    (label) => label.key === 'member-of',
  )
  return typeof memberOf?.value === 'string' ? memberOf.value : null
}
