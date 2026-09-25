import { z } from 'zod'
import { defineModule } from '../define.js'
import type { Entity, KernelWorld, ModuleFoldCapability } from '../../events/fold.js'
import type { Diagnostic } from '../../events/resolver.js'
import type { JsonValue } from '../../events/types.js'

export type RoomInventoryParams = {
  floors: readonly string[]
  room_types: readonly string[]
  bed_types: readonly string[]
  price_trait: string | null
  copy: {
    floors: Readonly<Record<string, string>>
    room_types: Readonly<Record<string, string>>
    bed_types: Readonly<Record<string, string>>
  }
}

export type InventoryBuilding = {
  id: string
  name: string
  sort_key: number
  room_count: number
  place_count: number
  cost_eur: number
}

export type InventoryRoom = {
  id: string
  building_id: string
  number: string
  floor: string | null
  room_type: string
  place_count: number
  sort_key: number
  traits: Readonly<Record<string, JsonValue>>
}

export type InventoryBed = {
  id: string
  room_id: string
  label: string
  bed_type: string
  sleeps: 1 | 2
  sort_key: number
}

export type InventoryPlace = {
  id: string
  bed_id: string
  room_id: string
  index: number
}

export type InventorySummary = {
  buildings: readonly InventoryBuilding[]
  rooms: readonly InventoryRoom[]
  beds: readonly InventoryBed[]
  places: readonly InventoryPlace[]
  capacity: number
  cost_eur: number
}

const kebab = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const vocabulary = z
  .array(kebab)
  .min(1)
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length)
      context.addIssue({ code: 'custom', message: 'values must be unique' })
  })
const copy = z.object({
  floors: z.record(z.string(), z.string()).default({}),
  room_types: z.record(z.string(), z.string()).default({}),
  bed_types: z.record(z.string(), z.string()).default({}),
})

const defaultCopy = {
  floors: { ground: 'Ground floor' },
  room_types: { standard: 'Standard' },
  bed_types: { single: 'Single', double: 'Double' },
}

const paramsSchema = z
  .object({
    floors: vocabulary.default(['ground']),
    room_types: vocabulary.default(['standard']),
    bed_types: vocabulary.default(['single', 'double']),
    price_trait: kebab.nullable().default(null),
    copy: copy.default(defaultCopy),
  })
  .superRefine((value, context) => {
    for (const [category, values] of [
      ['floors', value.floors],
      ['room_types', value.room_types],
      ['bed_types', value.bed_types],
    ] as const) {
      for (const item of values)
        if (value.copy[category][item] === undefined)
          context.addIssue({
            code: 'custom',
            path: ['copy', category, item],
            message: `copy is required for ${category} value ${item}`,
          })
    }
  })

const buildingId = z.string().regex(/^bld_[a-zA-Z0-9_-]+$/)
const roomId = z.string().regex(/^rm_[a-zA-Z0-9_-]+$/)
const bedId = z.string().regex(/^bed_[a-zA-Z0-9_-]+$/)
const nonEmpty = z.string().trim().min(1)

const buildingPayload = z.object({
  building_id: buildingId,
  name: nonEmpty,
  sort_key: z.number().int(),
})
const roomPayload = z.object({
  room_id: roomId,
  building_id: buildingId,
  number: nonEmpty,
  floor: nonEmpty.nullable(),
  room_type: nonEmpty,
  sort_key: z.number().int(),
})
const bedPayload = z.object({
  bed_id: bedId,
  room_id: roomId,
  label: nonEmpty,
  bed_type: nonEmpty,
  sleeps: z.union([z.literal(1), z.literal(2)]),
  sort_key: z.number().int(),
})
const bedRemovedPayload = z.object({ bed_id: bedId, reason: z.string().nullable() })

const locationKey = 'located-in'

function labelValue(world: KernelWorld, entityId: string, key: string): JsonValue | undefined {
  return world.labels_by_entity[entityId]?.find((label) => label.key === key)?.value
}

function entity(world: KernelWorld, kind: string, id: string): Entity | undefined {
  return world.entities_by_kind[kind]?.find((candidate) => candidate.id === id)
}

function validateBuilding(
  world: KernelWorld,
  payload: JsonValue,
  updating: boolean,
): string | null {
  const value = payload as z.infer<typeof buildingPayload>
  const current = entity(world, 'building', value.building_id)
  if (updating ? !current : current)
    return `${updating ? 'unknown' : 'duplicate'} building: ${value.building_id}`
  return null
}

function validateRoom(
  params: RoomInventoryParams,
  world: KernelWorld,
  payload: JsonValue,
  updating: boolean,
): string | null {
  const value = payload as z.infer<typeof roomPayload>
  const current = entity(world, 'room', value.room_id)
  if (updating ? !current : current)
    return `${updating ? 'unknown' : 'duplicate'} room: ${value.room_id}`
  if (!entity(world, 'building', value.building_id)) return `unknown building: ${value.building_id}`
  if (value.floor !== null && !params.floors.includes(value.floor))
    return `invalid floor: ${value.floor}`
  if (!params.room_types.includes(value.room_type)) return `invalid room type: ${value.room_type}`
  const duplicate = (world.entities_by_kind.room ?? []).some((room) => {
    if (room.id === value.room_id) return false
    return (
      labelValue(world, room.id, locationKey) === value.building_id &&
      labelValue(world, room.id, 'number') === value.number
    )
  })
  return duplicate ? `room number already exists in building: ${value.number}` : null
}

function validateBed(
  params: RoomInventoryParams,
  world: KernelWorld,
  payload: JsonValue,
  updating: boolean,
): string | null {
  const value = payload as z.infer<typeof bedPayload>
  const current = entity(world, 'bed', value.bed_id)
  if (updating ? !current : current)
    return `${updating ? 'unknown' : 'duplicate'} bed: ${value.bed_id}`
  if (!entity(world, 'room', value.room_id)) return `unknown room: ${value.room_id}`
  if (!params.bed_types.includes(value.bed_type)) return `invalid bed type: ${value.bed_type}`
  const duplicate = (world.entities_by_kind.bed ?? []).some((bed) => {
    if (bed.id === value.bed_id) return false
    return (
      labelValue(world, bed.id, locationKey) === value.room_id &&
      labelValue(world, bed.id, 'label') === value.label
    )
  })
  return duplicate ? `bed label already exists in room: ${value.label}` : null
}

function validateRemovedBed(payload: JsonValue, world: KernelWorld): string | null {
  const value = payload as z.infer<typeof bedRemovedPayload>
  return entity(world, 'bed', value.bed_id) ? null : `unknown bed: ${value.bed_id}`
}

function placeId(bedIdValue: string, index: number): string {
  return `plc_${bedIdValue.slice('bed_'.length)}_${index}`
}

function syncPlaces(
  capability: ModuleFoldCapability,
  eventSeq: number,
  bedIdValue: string,
  sleeps: 0 | 1 | 2,
): void {
  const current = capability
    .entities('place')
    .filter((place) =>
      capability
        .labels(place.id)
        .some((label) => label.key === locationKey && label.value === bedIdValue),
    )
  const desired = new Set(
    Array.from({ length: sleeps }, (_, index) => placeId(bedIdValue, index + 1)),
  )
  for (const place of current)
    if (!desired.has(place.id)) capability.retireEntity('place', place.id)
  for (let index = 1; index <= sleeps; index += 1) {
    const id = placeId(bedIdValue, index)
    if (capability.findEntity('place', id)) continue
    capability.createEntity('place', id, eventSeq, index)
    capability.setLabel(id, locationKey, bedIdValue, null, null)
  }
}

function setupLabels(
  capability: ModuleFoldCapability,
  entityId: string,
  values: readonly { key: string; value: JsonValue }[],
): void {
  for (const { key, value } of values) {
    if (value === null) capability.clearLabel(entityId, key)
    else capability.replaceLabels(entityId, [{ key, value, strength: null, note: null }])
  }
}

function inventorySummary(world: KernelWorld, priceTrait: string | null = null): InventorySummary {
  const buildings = (world.entities_by_kind.building ?? []).map((item) => ({
    id: item.id,
    name: String(labelValue(world, item.id, 'name') ?? ''),
    sort_key: item.sort_key,
    room_count: 0,
    place_count: 0,
    cost_eur: 0,
  }))
  const buildingById = new Map(buildings.map((building) => [building.id, building]))
  const buildingOrder = new Map(buildings.map((building, index) => [building.id, index]))
  const rooms = (world.entities_by_kind.room ?? [])
    .map((item) => {
      const buildingId = String(labelValue(world, item.id, locationKey) ?? '')
      const beds = (world.entities_by_kind.bed ?? []).filter(
        (bed) => labelValue(world, bed.id, locationKey) === item.id,
      )
      const placeCount = beds.reduce(
        (total, bed) => total + Number(labelValue(world, bed.id, 'sleeps') ?? 0),
        0,
      )
      const traits: Record<string, JsonValue> = {}
      for (const label of world.labels_by_entity[item.id] ?? [])
        if (!['number', 'floor', 'room-type', locationKey].includes(label.key))
          traits[label.key] = label.value
      return {
        id: item.id,
        building_id: buildingId,
        number: String(labelValue(world, item.id, 'number') ?? ''),
        floor: (labelValue(world, item.id, 'floor') as string | null | undefined) ?? null,
        room_type: String(labelValue(world, item.id, 'room-type') ?? ''),
        place_count: placeCount,
        sort_key: item.sort_key,
        traits,
      }
    })
    .sort(
      (a, b) =>
        (buildingOrder.get(a.building_id) ?? Number.MAX_SAFE_INTEGER) -
          (buildingOrder.get(b.building_id) ?? Number.MAX_SAFE_INTEGER) ||
        a.sort_key - b.sort_key ||
        a.id.localeCompare(b.id),
    )
  const roomOrder = new Map(rooms.map((room, index) => [room.id, index]))
  const beds = (world.entities_by_kind.bed ?? [])
    .map((item) => ({
      id: item.id,
      room_id: String(labelValue(world, item.id, locationKey) ?? ''),
      label: String(labelValue(world, item.id, 'label') ?? ''),
      bed_type: String(labelValue(world, item.id, 'bed-type') ?? ''),
      sleeps: Number(labelValue(world, item.id, 'sleeps') ?? 0) as 1 | 2,
      sort_key: item.sort_key,
    }))
    .sort(
      (a, b) =>
        (roomOrder.get(a.room_id) ?? Number.MAX_SAFE_INTEGER) -
          (roomOrder.get(b.room_id) ?? Number.MAX_SAFE_INTEGER) ||
        a.sort_key - b.sort_key ||
        a.id.localeCompare(b.id),
    )
  const bedOrder = new Map(beds.map((bed, index) => [bed.id, index]))
  const places = (world.entities_by_kind.place ?? [])
    .map((item) => {
      const bedIdValue = String(labelValue(world, item.id, locationKey) ?? '')
      const bed = beds.find((candidate) => candidate.id === bedIdValue)
      const suffix = Number(item.id.slice(item.id.lastIndexOf('_') + 1))
      return { id: item.id, bed_id: bedIdValue, room_id: bed?.room_id ?? '', index: suffix }
    })
    .sort(
      (a, b) =>
        (bedOrder.get(a.bed_id) ?? Number.MAX_SAFE_INTEGER) -
          (bedOrder.get(b.bed_id) ?? Number.MAX_SAFE_INTEGER) ||
        a.index - b.index ||
        a.id.localeCompare(b.id),
    )
  for (const room of rooms) {
    const building = buildingById.get(room.building_id)
    if (!building) continue
    building.room_count += 1
    building.place_count += room.place_count
    const price = priceTrait === null ? undefined : room.traits[priceTrait]
    if (typeof price === 'number') building.cost_eur += price * room.place_count
  }
  return {
    buildings,
    rooms,
    beds,
    places,
    capacity: places.length,
    cost_eur: buildings.reduce((total, building) => total + building.cost_eur, 0),
  }
}

function inventoryDiagnostics(world: KernelWorld) {
  const summary = inventorySummary(world)
  const diagnostics: Diagnostic[] = summary.rooms
    .filter((room) => room.place_count === 0)
    .map((room) => ({
      id: 'room-inventory.room-without-places',
      severity: 'warning' as const,
      subject_id: room.id,
      message: `room ${room.number} has no live places`,
    }))
  if (world.persons.length > 0 && summary.capacity === 0)
    diagnostics.push({
      id: 'room-inventory.no-capacity',
      severity: 'error' as const,
      subject_id: 'room-inventory',
      message: 'people exist but no live room has places',
    })
  for (const diagnostic of world.diagnostics)
    if (
      diagnostic.id === 'kernel.dangling-reference' &&
      world.labels.some(
        (label) =>
          label.entity_id === diagnostic.subject_id &&
          typeof label.value === 'string' &&
          label.value.startsWith('plc_'),
      )
    )
      diagnostics.push({
        id: 'room-inventory.retired-place-constrained',
        severity: 'error' as const,
        subject_id: diagnostic.subject_id,
        message: diagnostic.message,
      })
  return diagnostics
}

export const roomInventory = defineModule({
  id: 'room-inventory',
  params: paramsSchema,
  contribute: (params) => ({
    entity_kinds: [
      { id: 'building', prefix: 'bld_' },
      { id: 'room', prefix: 'rm_' },
      { id: 'bed', prefix: 'bed_' },
      { id: 'place', prefix: 'plc_', identity: 'derived' as const },
    ],
    label_keys: [
      { key: 'name', scopes: ['building'], cardinality: 'exactly-one', setup_only: true },
      {
        key: 'located-in',
        scopes: ['room', 'bed', 'place'],
        cardinality: 'exactly-one',
        setup_only: true,
      },
      { key: 'number', scopes: ['room'], cardinality: 'exactly-one', setup_only: true },
      {
        key: 'floor',
        scopes: ['room'],
        cardinality: 'zero-or-one',
        setup_only: true,
        validate: (value) =>
          typeof value === 'string' && params.floors.includes(value) ? null : 'invalid floor value',
      },
      {
        key: 'room-type',
        scopes: ['room'],
        cardinality: 'exactly-one',
        setup_only: true,
        validate: (value) =>
          typeof value === 'string' && params.room_types.includes(value)
            ? null
            : 'invalid room type value',
      },
      { key: 'label', scopes: ['bed'], cardinality: 'exactly-one', setup_only: true },
      {
        key: 'bed-type',
        scopes: ['bed'],
        cardinality: 'exactly-one',
        setup_only: true,
        validate: (value) =>
          typeof value === 'string' && params.bed_types.includes(value)
            ? null
            : 'invalid bed type value',
      },
      {
        key: 'sleeps',
        scopes: ['bed'],
        cardinality: 'exactly-one',
        setup_only: true,
        validate: (value) => (value === 1 || value === 2 ? null : 'sleeps must be 1 or 2'),
      },
    ],
    events: [
      {
        type: 'BuildingAdded',
        payload: buildingPayload,
        validate: (payload, world) => validateBuilding(world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = event.payload as z.infer<typeof buildingPayload>
          capability.createEntity('building', value.building_id, event.seq, value.sort_key)
          setupLabels(capability, value.building_id, [{ key: 'name', value: value.name }])
        },
      },
      {
        type: 'BuildingUpdated',
        payload: buildingPayload,
        validate: (payload, world) => validateBuilding(world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = event.payload as z.infer<typeof buildingPayload>
          capability.setSortKey('building', value.building_id, value.sort_key)
          setupLabels(capability, value.building_id, [{ key: 'name', value: value.name }])
        },
      },
      {
        type: 'RoomAdded',
        payload: roomPayload,
        validate: (payload, world) => validateRoom(params, world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = event.payload as z.infer<typeof roomPayload>
          capability.createEntity('room', value.room_id, event.seq, value.sort_key)
          setupLabels(capability, value.room_id, [
            { key: locationKey, value: value.building_id },
            { key: 'number', value: value.number },
            { key: 'floor', value: value.floor },
            { key: 'room-type', value: value.room_type },
          ])
        },
      },
      {
        type: 'RoomUpdated',
        payload: roomPayload,
        validate: (payload, world) => validateRoom(params, world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = event.payload as z.infer<typeof roomPayload>
          capability.setSortKey('room', value.room_id, value.sort_key)
          setupLabels(capability, value.room_id, [
            { key: locationKey, value: value.building_id },
            { key: 'number', value: value.number },
            { key: 'floor', value: value.floor },
            { key: 'room-type', value: value.room_type },
          ])
        },
      },
      {
        type: 'BedAdded',
        payload: bedPayload,
        validate: (payload, world) => validateBed(params, world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = event.payload as z.infer<typeof bedPayload>
          capability.createEntity('bed', value.bed_id, event.seq, value.sort_key)
          setupLabels(capability, value.bed_id, [
            { key: locationKey, value: value.room_id },
            { key: 'label', value: value.label },
            { key: 'bed-type', value: value.bed_type },
            { key: 'sleeps', value: value.sleeps },
          ])
          syncPlaces(capability, event.seq, value.bed_id, value.sleeps)
        },
      },
      {
        type: 'BedUpdated',
        payload: bedPayload,
        validate: (payload, world) => validateBed(params, world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = event.payload as z.infer<typeof bedPayload>
          capability.setSortKey('bed', value.bed_id, value.sort_key)
          setupLabels(capability, value.bed_id, [
            { key: locationKey, value: value.room_id },
            { key: 'label', value: value.label },
            { key: 'bed-type', value: value.bed_type },
            { key: 'sleeps', value: value.sleeps },
          ])
          syncPlaces(capability, event.seq, value.bed_id, value.sleeps)
        },
      },
      {
        type: 'BedRemoved',
        payload: bedRemovedPayload,
        validate: validateRemovedBed,
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = event.payload as z.infer<typeof bedRemovedPayload>
          syncPlaces(capability, event.seq, value.bed_id, 0)
          capability.retireEntity('bed', value.bed_id)
        },
      },
    ],
    trait_roles:
      params.price_trait === null
        ? []
        : [{ parameter: 'price_trait', kind: 'property' as const, scopes: ['room'] }],
    world_summaries: [
      { id: 'room-inventory', summarize: (world) => inventorySummary(world, params.price_trait) },
    ],
    world_checks: [inventoryDiagnostics],
    screens: [
      {
        id: 'organiser-inventory',
        route: '/organiser/inventory',
        label: 'Unterkunft',
        audience: 'organiser',
      },
    ],
  }),
})

export function inventoryWorld(world: KernelWorld): InventorySummary {
  const summary = world.summaries['room-inventory']
  if (!summary) throw new Error('room-inventory is not selected in this profile')
  return summary as InventorySummary
}
