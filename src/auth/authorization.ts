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

export function canAppendEvent(
  principal: Principal,
  event: Event,
  world: World,
  config: KernelConfig,
): boolean {
  if (principal.kind === 'organiser') return true
  if (
    event.type === 'FamilyInvited' ||
    event.type === 'FamilyEmailChanged' ||
    event.type === 'FamilyDisplayNameChanged'
  )
    return false
  if (event.type === 'LabelSet' || event.type === 'LabelCleared')
    if (!isFamilyWritable(config, (event as unknown as LabelSet | LabelCleared).payload.key))
      return false
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
  if (world.families.some((family) => family.id === entityId)) return entityId
  const memberOf = world.labels.find(
    (label) => label.entity_id === entityId && label.key === 'member-of',
  )
  return typeof memberOf?.value === 'string' ? memberOf.value : null
}
