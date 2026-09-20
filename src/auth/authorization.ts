import type { KernelWorld } from '../events/fold.js'
import type { Event } from '../events/types.js'
import type { Principal } from './principal.js'

export function canAppendEvent(principal: Principal, event: Event, world: KernelWorld): boolean {
  if (principal.kind === 'organiser') return true
  if (event.type === 'FamilyInvited' || event.type === 'FamilyEmailChanged') return false
  const entityId = event.type === 'PersonAdded' || event.type === 'PersonUpdated' ? event.payload.family_id : event.type === 'PersonWithdrawn' ? event.payload.person_id : event.payload.entity_id
  return familyForEntity(world, entityId) === principal.family_id
}

function familyForEntity(world: KernelWorld, entityId: string): string | null {
  if (world.families.some((family) => family.id === entityId)) return entityId
  const memberOf = world.labels.find((label) => label.entity_id === entityId && label.key === 'member-of')
  return typeof memberOf?.value === 'string' ? memberOf.value : null
}
