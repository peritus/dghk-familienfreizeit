import type { KernelConfig, KernelWorld } from '../events/fold.js'
import type { Event } from '../events/types.js'
import type { Principal } from './principal.js'

export function canAppendEvent(
  principal: Principal,
  event: Event,
  world: KernelWorld,
  config: KernelConfig,
): boolean {
  if (principal.kind === 'organiser') return true
  if (event.type === 'FamilyInvited' || event.type === 'FamilyEmailChanged') return false
  if (event.type === 'LabelSet' || event.type === 'LabelCleared')
    if (!isFamilyWritable(config, event.payload.key)) return false
  const entityId =
    event.type === 'PersonAdded' || event.type === 'PersonUpdated'
      ? event.payload.family_id
      : event.type === 'PersonWithdrawn'
        ? event.payload.person_id
        : event.payload.entity_id
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

function familyForEntity(world: KernelWorld, entityId: string): string | null {
  if (world.families.some((family) => family.id === entityId)) return entityId
  const memberOf = world.labels.find(
    (label) => label.entity_id === entityId && label.key === 'member-of',
  )
  return typeof memberOf?.value === 'string' ? memberOf.value : null
}
