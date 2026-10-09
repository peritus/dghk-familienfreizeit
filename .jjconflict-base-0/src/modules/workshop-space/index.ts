import { z } from 'zod'
import { defineModule } from '../define.js'
import type { Entity, World, ModuleFoldCapability, ValidationWorld } from '../../events/fold.js'
import type { JsonValue } from '../../events/types.js'

export type WorkshopSpace = {
  id: string
  name: string
  location_description: string
  capacity: number
  sort_key: number
}

export type WorkshopSpaceSummary = {
  live: readonly WorkshopSpace[]
  retired: readonly WorkshopSpace[]
}

const spaceId = z.string().regex(/^wsp_[a-zA-Z0-9_-]+$/)
const nonEmpty = z.string().trim().min(1)
const spacePayload = z.object({
  workshop_space_id: spaceId,
  name: nonEmpty,
  location_description: nonEmpty,
  capacity: z.number().int().min(0),
  sort_key: z.number().int(),
})
const reasonPayload = z.object({ workshop_space_id: spaceId, reason: z.string().nullable() })

function entity(world: ValidationWorld, id: string): Entity | undefined {
  return world.findEntity('workshop-space', id)
}

function validateSpace(
  world: ValidationWorld,
  payload: JsonValue,
  updating: boolean,
): string | null {
  const value = spacePayload.parse(payload)
  const current = entity(world, value.workshop_space_id)
  if (updating ? !current : current)
    return `${updating ? 'unknown' : 'duplicate'} workshop space: ${value.workshop_space_id}`
  return null
}

function setLabels(
  capability: ModuleFoldCapability,
  id: string,
  value: z.infer<typeof spacePayload>,
): void {
  capability.replaceLabels(id, [
    { key: 'space-name', value: value.name, strength: null, note: null },
    { key: 'space-location', value: value.location_description, strength: null, note: null },
    { key: 'space-capacity', value: value.capacity, strength: null, note: null },
  ])
}

function summary(world: World): WorkshopSpaceSummary {
  const value = (id: string, key: string): JsonValue | undefined =>
    world.labels_by_entity[id]?.find((label) => label.key === key)?.value
  const spaces = (world.entities_by_kind['workshop-space'] ?? [])
    .map((item) => ({
      id: item.id,
      name: String(value(item.id, 'space-name') ?? ''),
      location_description: String(value(item.id, 'space-location') ?? ''),
      capacity: Number(value(item.id, 'space-capacity') ?? 0),
      sort_key: item.sort_key,
    }))
    .sort((a, b) => a.sort_key - b.sort_key || a.id.localeCompare(b.id))
  return { live: spaces, retired: [] }
}

export const workshopSpace = defineModule({
  id: 'workshop-space',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'workshop-space', prefix: 'wsp_' }],
    label_keys: [
      { key: 'space-name', scopes: ['workshop-space'], cardinality: 'exactly-one' },
      { key: 'space-location', scopes: ['workshop-space'], cardinality: 'exactly-one' },
      { key: 'space-capacity', scopes: ['workshop-space'], cardinality: 'exactly-one' },
    ],
    events: [
      {
        type: 'WorkshopSpaceAdded',
        payload: spacePayload,
        validate: (payload, world) => validateSpace(world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = spacePayload.parse(event.payload)
          capability.createEntity(
            'workshop-space',
            value.workshop_space_id,
            event.seq,
            value.sort_key,
          )
          setLabels(capability, value.workshop_space_id, value)
        },
      },
      {
        type: 'WorkshopSpaceUpdated',
        payload: spacePayload,
        validate: (payload, world) => validateSpace(world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = spacePayload.parse(event.payload)
          capability.setSortKey('workshop-space', value.workshop_space_id, value.sort_key)
          setLabels(capability, value.workshop_space_id, value)
        },
      },
      {
        type: 'WorkshopSpaceRetired',
        payload: reasonPayload,
        validate: (payload, world) =>
          entity(world, reasonPayload.parse(payload).workshop_space_id)
            ? null
            : `unknown workshop space: ${reasonPayload.parse(payload).workshop_space_id}`,
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) =>
          capability.retireEntity(
            'workshop-space',
            reasonPayload.parse(event.payload).workshop_space_id,
          ),
      },
    ],
    world_summaries: [{ id: 'workshop-space', summarize: summary }],
    screens: [
      {
        id: 'organiser-workshop-spaces',
        route: '/organiser/workshops/spaces',
        label: 'Räume und Slots',
        audience: 'organiser',
      },
    ],
  }),
})

export function workshopSpaceWorld(world: World): WorkshopSpaceSummary {
  const value = world.summaries['workshop-space']
  if (!value) throw new Error('workshop-space is not selected in this profile')
  return value as WorkshopSpaceSummary
}
