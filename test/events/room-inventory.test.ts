import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { decimal, defineOccasionProfile, property } from '../../src/config/define.js'
import { familienfreizeit2027Profile } from '../../src/config/profiles/familienfreizeit-2027.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import { inventoryWorld, roomInventory } from '../../src/modules/room-inventory/index.js'

const meta = {
  id: 'inventory-fixture',
  name: { de: 'Inventar', en: 'Inventory' },
  description: { de: 'Inventar', en: 'Inventory' },
  starts_on: '2027-01-01',
  ends_on: '2027-01-02',
  timezone: 'Europe/Berlin',
  locale: 'de',
  fallback_locale: 'en',
}

const profile = defineOccasionProfile({
  meta,
  traits: {
    'price-per-bed-eur': property({
      title: { de: 'Preis', en: 'Price' },
      scopes: ['room'],
      value: decimal({ scale: 2 }),
      organiser_only: true,
    }),
  },
  modules: [
    roomInventory({
      floors: ['ground', 'first'],
      room_types: ['standard', 'apartment'],
      bed_types: ['single', 'double'],
      copy: {
        floors: { ground: 'Erdgeschoss', first: 'Erste Etage' },
        room_types: { standard: 'Standard', apartment: 'Apartment' },
        bed_types: { single: 'Einzelbett', double: 'Doppelbett' },
      },
    }),
  ],
})

function event(type: string, payload: JsonValue, seq: number): Event {
  return {
    seq,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type,
    payload,
  }
}

const inventoryEvents: Event[] = [
  event('BuildingAdded', { building_id: 'bld_main', name: 'Main House', sort_key: 1 }, 1),
  event(
    'RoomAdded',
    {
      room_id: 'rm_1',
      building_id: 'bld_main',
      number: '1',
      floor: 'ground',
      room_type: 'standard',
      sort_key: 1,
    },
    2,
  ),
  event(
    'BedAdded',
    {
      bed_id: 'bed_1',
      room_id: 'rm_1',
      label: '1-A',
      bed_type: 'double',
      sleeps: 2,
      sort_key: 1,
    },
    3,
  ),
  event(
    'LabelSet',
    {
      entity_id: 'rm_1',
      key: 'price-per-bed-eur',
      value: 100,
      strength: null,
      note: null,
    },
    4,
  ),
]

describe('room inventory', () => {
  test('folds buildings, rooms, beds, stable places, and typed cost summary', () => {
    const world = derive(inventoryEvents, profile.validation_view)
    const summary = inventoryWorld(world)
    expect(summary.capacity).toBe(2)
    expect(summary.cost_eur).toBe(200)
    expect(summary.places.map(({ id }) => id)).toEqual(['plc_1_1', 'plc_1_2'])
    expect(summary.rooms[0]).toMatchObject({
      id: 'rm_1',
      building_id: 'bld_main',
      place_count: 2,
      traits: { 'price-per-bed-eur': 100 },
    })
  })

  test('reducing sleeps hard-removes only the second place and preserves history by prefix replay', () => {
    const updated = [
      ...inventoryEvents,
      event(
        'BedUpdated',
        {
          bed_id: 'bed_1',
          room_id: 'rm_1',
          label: '1-A',
          bed_type: 'double',
          sleeps: 1,
          sort_key: 1,
        },
        5,
      ),
    ]
    expect(inventoryWorld(derive(updated, profile.validation_view)).places).toEqual([
      { id: 'plc_1_1', bed_id: 'bed_1', room_id: 'rm_1', index: 1 },
    ])
    expect(inventoryWorld(derive(inventoryEvents, profile.validation_view)).places).toHaveLength(2)
  })

  test('rejects invalid parents, duplicate room numbers, and writes to setup labels', () => {
    expect(() =>
      derive(
        [
          event(
            'RoomAdded',
            {
              room_id: 'rm_missing',
              building_id: 'bld_missing',
              number: '1',
              floor: 'ground',
              room_type: 'standard',
              sort_key: 1,
            },
            1,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/unknown building/)

    expect(() =>
      derive(
        [
          ...inventoryEvents,
          event(
            'RoomAdded',
            {
              room_id: 'rm_2',
              building_id: 'bld_main',
              number: '1',
              floor: 'first',
              room_type: 'standard',
              sort_key: 2,
            },
            5,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/room number already exists/)

    expect(() =>
      derive(
        [
          ...inventoryEvents,
          event(
            'LabelSet',
            { entity_id: 'rm_1', key: 'number', value: 'changed', strength: null, note: null },
            5,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/setup-owned/)

    expect(() =>
      derive(
        [
          ...inventoryEvents,
          event('LabelCleared', { entity_id: 'rm_1', key: 'number', value: null }, 5),
        ],
        profile.validation_view,
      ),
    ).toThrow(/setup-owned/)
  })

  test('loads module event types from KDL through the selected profile schemas', () => {
    const events = loadKdl(
      'BuildingAdded building_id=bld_kdl name="KDL House" sort_key=1\n' +
        'RoomAdded room_id=rm_kdl building_id=bld_kdl number="1" floor=ground room_type=standard sort_key=1\n' +
        'BedAdded bed_id=bed_kdl room_id=rm_kdl label="1-A" bed_type=single sleeps=1 sort_key=1',
      profile.validation_view,
    )
    expect(inventoryWorld(derive(events, profile.validation_view)).capacity).toBe(1)
  })

  test('reports empty rooms and no capacity as derived diagnostics', () => {
    const world = derive(
      [
        event('BuildingAdded', { building_id: 'bld_empty', name: 'Empty', sort_key: 1 }, 1),
        event(
          'RoomAdded',
          {
            room_id: 'rm_empty',
            building_id: 'bld_empty',
            number: '1',
            floor: 'ground',
            room_type: 'standard',
            sort_key: 1,
          },
          2,
        ),
        event(
          'FamilyInvited',
          {
            family_id: 'fam_empty',
            email: 'empty@example.test',
            display_name: 'Empty family',
            locale: 'de',
          },
          3,
        ),
        event(
          'PersonAdded',
          {
            person_id: 'per_empty',
            family_id: 'fam_empty',
            given_name: 'Empty',
            family_name: 'Person',
            birthdate: null,
            role: 'adult',
          },
          4,
        ),
      ],
      profile.validation_view,
    )
    expect(world.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'room-inventory.room-without-places', severity: 'warning' }),
        expect.objectContaining({ id: 'room-inventory.no-capacity', severity: 'error' }),
      ]),
    )
  })

  test('reports a constraint that names a place removed by lifecycle', () => {
    const world = derive(
      [
        ...inventoryEvents,
        event(
          'LabelSet',
          {
            entity_id: 'rm_1',
            key: 'separates-from',
            value: 'plc_1_2',
            strength: 'required',
            note: null,
          },
          5,
        ),
        event(
          'BedUpdated',
          {
            bed_id: 'bed_1',
            room_id: 'rm_1',
            label: '1-A',
            bed_type: 'double',
            sleeps: 1,
            sort_key: 1,
          },
          6,
        ),
      ],
      profile.validation_view,
    )
    expect(world.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'room-inventory.retired-place-constrained',
          severity: 'error',
        }),
      ]),
    )
  })

  test('replays the 38-room occasion fixture with 162 places and the documented cost', () => {
    const text = readFileSync(
      new URL('../fixtures/m5/familienfreizeit-2027.kdl', import.meta.url),
      'utf8',
    )
    const events = loadKdl(text, familienfreizeit2027Profile.validation_view)
    const summary = inventoryWorld(derive(events, familienfreizeit2027Profile.validation_view))
    expect(summary.rooms).toHaveLength(38)
    expect(summary.places).toHaveLength(162)
    expect(summary.cost_eur).toBe(15236)
    expect(summary.buildings.map(({ name }) => name)).toEqual([
      'Haupthaus',
      'Gartenhaus',
      'Blockhaus',
      'Bungalow',
      'Schlaffass',
    ])
  })
})
