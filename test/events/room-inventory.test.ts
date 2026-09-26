import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { decimal, defineOccasionProfile, enumOf, property } from '../../src/config/define.js'
import { familienfreizeit2027Profile } from '../../src/config/profiles/familienfreizeit-2027.js'
import { assertAppendableWorld, derive } from '../../src/events/fold.js'
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
    'room-rate-eur': property({
      title: { de: 'Preis', en: 'Price' },
      scopes: ['room'],
      value: decimal({ scale: 2 }),
      cardinality: 'exactly-one',
      organiser_only: true,
    }),
    'place-note': property({
      title: { de: 'Platznotiz', en: 'Place note' },
      scopes: ['place'],
      value: enumOf(['window']),
      organiser_only: true,
    }),
  },
  modules: [
    roomInventory({
      floors: ['ground', 'first'],
      room_types: ['standard', 'apartment'],
      bed_types: ['single', 'double', 'bunk'],
      price_trait: 'room-rate-eur',
      copy: {
        floors: { ground: 'Erdgeschoss', first: 'Erste Etage' },
        room_types: { standard: 'Standard', apartment: 'Apartment' },
        bed_types: { single: 'Einzelbett', double: 'Doppelbett', bunk: 'Etagenbett' },
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
      key: 'room-rate-eur',
      value: 100,
      strength: null,
      note: null,
    },
    4,
  ),
]

describe('room inventory', () => {
  test('reports and rejects a room that has no configured price label', () => {
    const world = derive(inventoryEvents.slice(0, 3), profile.validation_view)
    expect(world.diagnostics).toContainEqual(
      expect.objectContaining({
        id: 'kernel.cardinality',
        subject_id: 'rm_1',
        severity: 'error',
      }),
    )
    expect(() => assertAppendableWorld(world)).toThrow(/append rejected: kernel\.cardinality/)
  })

  test('requires copy for every configured vocabulary value', () => {
    expect(() =>
      roomInventory({
        floors: ['ground', 'first'],
        room_types: ['standard'],
        bed_types: ['single'],
        price_trait: null,
        copy: {
          floors: { ground: 'Ground' },
          room_types: { standard: 'Standard' },
          bed_types: { single: 'Single' },
        },
      }),
    ).toThrow(/copy.*first|first.*copy/)
  })

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
      traits: { 'room-rate-eur': 100 },
    })
  })

  test('a bunk bed accepts the bunk vocabulary value and sleeps two, like a double', () => {
    const updated = [
      ...inventoryEvents,
      event(
        'BedAdded',
        {
          bed_id: 'bed_2',
          room_id: 'rm_1',
          label: '1-B',
          bed_type: 'bunk',
          sleeps: 2,
          sort_key: 2,
        },
        5,
      ),
    ]
    const summary = inventoryWorld(derive(updated, profile.validation_view))
    expect(summary.beds.find(({ id }) => id === 'bed_2')).toMatchObject({
      bed_type: 'bunk',
      sleeps: 2,
    })
    expect(summary.places.filter(({ bed_id }) => bed_id === 'bed_2')).toHaveLength(2)
  })

  test('apartment beds carry a sleeping_room grouping; other room types reject it', () => {
    const apartmentEvents: Event[] = [
      event('BuildingAdded', { building_id: 'bld_apt', name: 'Apartment House', sort_key: 1 }, 1),
      event(
        'RoomAdded',
        {
          room_id: 'rm_apt',
          building_id: 'bld_apt',
          number: '2',
          floor: 'ground',
          room_type: 'apartment',
          sort_key: 1,
        },
        2,
      ),
      event(
        'BedAdded',
        {
          bed_id: 'bed_apt_1',
          room_id: 'rm_apt',
          label: '',
          bed_type: 'single',
          sleeps: 1,
          sort_key: 1,
          sleeping_room: 1,
        },
        3,
      ),
      event(
        'BedAdded',
        {
          bed_id: 'bed_apt_2',
          room_id: 'rm_apt',
          label: '',
          bed_type: 'single',
          sleeps: 1,
          sort_key: 2,
          sleeping_room: 2,
        },
        4,
      ),
    ]
    const summary = inventoryWorld(derive(apartmentEvents, profile.validation_view))
    expect(summary.beds.find(({ id }) => id === 'bed_apt_1')?.sleeping_room).toBe(1)
    expect(summary.beds.find(({ id }) => id === 'bed_apt_2')?.sleeping_room).toBe(2)

    const rejected = [
      ...inventoryEvents,
      event(
        'BedAdded',
        {
          bed_id: 'bed_bad',
          room_id: 'rm_1', // room_type 'standard', not 'apartment'
          label: '',
          bed_type: 'single',
          sleeps: 1,
          sort_key: 2,
          sleeping_room: 1,
        },
        5,
      ),
    ]
    expect(() => derive(rejected, profile.validation_view)).toThrow(
      /sleeping_room only applies to apartment/,
    )
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

  test('full room restatement clears an optional floor when it becomes null', () => {
    const updated = [
      ...inventoryEvents.slice(0, 2),
      event(
        'RoomUpdated',
        {
          room_id: 'rm_1',
          building_id: 'bld_main',
          number: '1',
          floor: null,
          room_type: 'standard',
          sort_key: 1,
        },
        3,
      ),
      ...inventoryEvents.slice(2).map((item) => ({ ...item, seq: item.seq + 1 })),
    ]
    const summary = inventoryWorld(derive(updated, profile.validation_view))
    expect(summary.rooms[0]?.floor).toBeNull()
  })

  test('bed updates preserve labels on surviving stable places', () => {
    const labelled = [
      ...inventoryEvents,
      event(
        'LabelSet',
        { entity_id: 'plc_1_1', key: 'place-note', value: 'window', strength: null, note: null },
        5,
      ),
    ]
    const updated = event(
      'BedUpdated',
      {
        bed_id: 'bed_1',
        room_id: 'rm_1',
        label: '1-A',
        bed_type: 'double',
        sleeps: 2,
        sort_key: 1,
      },
      6,
    )
    const world = derive([...labelled, updated], profile.validation_view)
    expect(world.entities_by_kind.place?.map(({ id }) => id)).toEqual(['plc_1_1', 'plc_1_2'])
    expect(world.labels_by_entity.plc_1_1).toContainEqual(
      expect.objectContaining({ key: 'place-note', value: 'window' }),
    )
  })

  test('removes beds, rooms, and buildings through validated maintenance events', () => {
    const removed = [
      ...inventoryEvents,
      event('BedRemoved', { bed_id: 'bed_1', reason: 'reconfigured' }, 5),
      event('RoomRemoved', { room_id: 'rm_1', reason: 'closed' }, 6),
      event('BuildingRemoved', { building_id: 'bld_main', reason: 'closed' }, 7),
    ]
    const world = derive(removed, profile.validation_view)
    expect(world.entities_by_kind.building ?? []).toEqual([])
    expect(world.entities_by_kind.room ?? []).toEqual([])
    expect(world.entities_by_kind.bed ?? []).toEqual([])
    expect(world.entities_by_kind.place ?? []).toEqual([])

    expect(() =>
      derive(
        [...inventoryEvents, event('RoomRemoved', { room_id: 'rm_1', reason: null }, 5)],
        profile.validation_view,
      ),
    ).toThrow(/room has beds/)
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
