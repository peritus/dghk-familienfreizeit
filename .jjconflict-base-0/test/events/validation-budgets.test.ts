import { expect, test } from 'vitest'
import { derive, type KernelConfig } from '../../src/events/fold.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { syntheticLog, syntheticScale } from '../bench/log.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import { inventoryWorld } from '../../src/modules/room-inventory/index.js'

test('tuple indexes follow moves, blank labels, retirement and identity reuse', () => {
  const events = syntheticLog(syntheticScale(1))
  const bedEvent = events.find((event) => event.type === 'BedAdded')!
  const bed = bedEvent.payload as Record<string, JsonValue>
  const room = events.filter((event) => event.type === 'RoomAdded')[1]!.payload as Record<
    string,
    JsonValue
  >
  const append = (type: string, payload: JsonValue) =>
    events.push({ ...bedEvent, type, payload, seq: events.length + 1 } as Event)
  append('BedUpdated', { ...bed, room_id: room.room_id!, label: 'Moved|key' })
  append('BedAdded', { ...bed, bed_id: 'bed_reuse' }) // original scoped key is free
  append('BedRemoved', { bed_id: 'bed_reuse', reason: null })
  append('BedRemoved', { bed_id: bed.bed_id!, reason: null })
  append('BedAdded', { ...bed, bed_id: 'bed_reuse', room_id: room.room_id!, label: 'Moved|key' })
  append('BedAdded', { ...bed, label: 'Reused|key' })
  append('BedUpdated', { ...bed, label: 'Reused|key' }) // exclude current identity
  append('BedUpdated', { ...bed, room_id: room.room_id!, label: '' })
  const world = derive(events, luebben2027Profile.validation_view)
  expect(inventoryWorld(world).beds.find((item) => item.id === bed.bed_id)).toMatchObject({
    room_id: room.room_id,
    label: '',
  })
  append('BedAdded', {
    ...bed,
    bed_id: 'bed_duplicate',
    room_id: room.room_id!,
    label: 'Moved|key',
  })
  expect(() => derive(events, luebben2027Profile.validation_view)).toThrow(
    'bed label already exists',
  )
})

test('indexed validator answers match a scan and never request a whole kind', () => {
  const base = luebben2027Profile.validation_view
  let queries = 0
  const config: KernelConfig = {
    ...base,
    event_validate_dispatch: Object.fromEntries(
      Object.entries(base.event_validate_dispatch ?? {}).map(([type, validate]) => [
        type,
        (payload, world) =>
          validate(payload, {
            ...world,
            entities: (kind) => {
              if (kind === 'room' || kind === 'bed')
                throw new Error('validator requested a whole inventory kind')
              return world.entities(kind)
            },
            hasEntityWithLabels: (kind, labels, exceptId) => {
              queries += 1
              const actual = world.hasEntityWithLabels(kind, labels, exceptId)
              const expected = world
                .entities(kind)
                .some(
                  (entity) =>
                    entity.id !== exceptId &&
                    Object.entries(labels).every(
                      ([key, value]) =>
                        world.labels(entity.id).find((label) => label.key === key)?.value === value,
                    ),
                )
              expect(actual).toBe(expected)
              return actual
            },
          }),
      ]),
    ),
  }
  const events = syntheticLog(syntheticScale(2))
  expect(derive(events, config)).toEqual(derive(events, base))
  expect(queries).toBeGreaterThan(100)
  expect(queries).toBeLessThanOrEqual(220) // 200 measured; one lookup per room/bed invariant
})

test('place synchronization requests only the owning bed bucket', () => {
  const base = luebben2027Profile.validation_view
  let queries = 0
  const config: KernelConfig = {
    ...base,
    event_fold_dispatch: Object.fromEntries(
      Object.entries(base.event_fold_dispatch ?? {}).map(([type, fold]) => [
        type,
        (capability, event) =>
          fold(
            {
              ...capability,
              entities: (kind) => {
                if (kind === 'place') throw new Error('place synchronization scanned every place')
                return capability.entities(kind)
              },
              entitiesWithLabels: (kind, labels) => {
                queries += 1
                const actual = capability.entitiesWithLabels(kind, labels)
                const expected = capability
                  .entities(kind)
                  .filter((entity) =>
                    Object.entries(labels).every(
                      ([key, value]) =>
                        capability.labels(entity.id).find((label) => label.key === key)?.value ===
                        value,
                    ),
                  )
                expect(actual).toEqual(expected)
                return actual
              },
            },
            event,
          ),
      ]),
    ),
  }
  const events = syntheticLog(syntheticScale(2))
  expect(derive(events, config)).toEqual(derive(events, base))
  expect(queries).toBeGreaterThan(100)
})
