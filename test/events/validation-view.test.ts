import { describe, expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import type { Event, JsonValue } from '../../src/events/types.js'

/**
 * Event validators no longer receive a full derived world; they read a narrow
 * view backed by the fold's own live indexes. Those indexes are maintained
 * incrementally, and `derive`'s published output is rebuilt from the
 * authoritative label store rather than from them — so index drift is invisible
 * in a returned `World` and can only be observed through a validator's verdict.
 *
 * Each case below drives a clear/restate/retire sequence and then asserts an
 * acceptance or rejection that is only correct if the indexes kept step.
 */
const config = luebben2027Profile.validation_view

function log(...entries: readonly (readonly [string, JsonValue])[]): Event[] {
  return entries.map(([type, payload], index) => ({
    seq: index + 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type,
    payload,
  }))
}

function foldError(events: readonly Event[]): string | null {
  try {
    derive(events, config)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

const building = ['BuildingAdded', { building_id: 'bld_a', name: 'Haus A', sort_key: 1 }] as const

function room(id: string, number: string, sortKey: number): readonly [string, JsonValue] {
  return [
    'RoomAdded',
    {
      room_id: id,
      building_id: 'bld_a',
      number,
      floor: 'ground',
      room_type: 'standard',
      sort_key: sortKey,
    },
  ]
}

function roomUpdate(id: string, number: string, sortKey: number): readonly [string, JsonValue] {
  const [, payload] = room(id, number, sortKey)
  return ['RoomUpdated', payload]
}

describe('narrowed validation view', () => {
  test('a restated label leaves no stale entry behind', () => {
    // rm_2 restates its own number, then rm_1 takes a number rm_2 no longer holds.
    expect(
      foldError(
        log(
          building,
          room('rm_1', '1', 1),
          room('rm_2', '2', 2),
          roomUpdate('rm_2', '3', 2),
          roomUpdate('rm_1', '2', 1),
        ),
      ),
    ).toBeNull()
  })

  test('a live label is still found after an unrelated restatement', () => {
    expect(
      foldError(
        log(building, room('rm_1', '1', 1), room('rm_2', '2', 2), roomUpdate('rm_2', '2', 2)),
      ),
    ).toBeNull()
    // rm_1 may not move onto a number rm_2 currently holds.
    expect(
      foldError(
        log(building, room('rm_1', '1', 1), room('rm_2', '2', 2), roomUpdate('rm_1', '2', 1)),
      ),
    ).toBe('room number already exists in building: 2')
  })

  test('retiring an entity drops it from the per-kind index', () => {
    expect(
      foldError(
        log(
          building,
          room('rm_1', '1', 1),
          ['RoomRemoved', { room_id: 'rm_1', reason: null }],
          ['BuildingRemoved', { building_id: 'bld_a', reason: null }],
        ),
      ),
    ).toBeNull()
    // The same removal is refused while the room is live.
    expect(
      foldError(
        log(building, room('rm_1', '1', 1), [
          'BuildingRemoved',
          { building_id: 'bld_a', reason: null },
        ]),
      ),
    ).toBe('building has rooms: bld_a')
  })

  test('retiring an entity drops its labels from the key index', () => {
    const bed = (id: string, label: string): readonly [string, JsonValue] => [
      'BedAdded',
      { bed_id: id, room_id: 'rm_1', label, bed_type: 'single', sleeps: 1, sort_key: 1 },
    ]
    // Re-using a retired bed's label in the same room must not read as a duplicate.
    expect(
      foldError(
        log(
          building,
          room('rm_1', '1', 1),
          bed('bed_1', 'A'),
          ['BedRemoved', { bed_id: 'bed_1', reason: null }],
          bed('bed_2', 'A'),
        ),
      ),
    ).toBeNull()
    expect(
      foldError(log(building, room('rm_1', '1', 1), bed('bed_1', 'A'), bed('bed_2', 'A'))),
    ).toBe('bed label already exists in room: A')
  })

  test('withdrawing a person frees the capacity their attendance held', () => {
    const workshop = (capacity: number, type: string): readonly [string, JsonValue] => [
      type,
      {
        workshop_id: 'wks_1',
        title: 'Töpfern',
        description: 'Tonarbeit',
        audience: 'all',
        age_min: 6,
        age_max: 99,
        capacity,
        participation_mode: 'assigned',
        leader_ids: [],
        needs: [],
        sort_key: 1,
      },
    ]
    const family = [
      'FamilyInvited',
      { family_id: 'fam_1', email: 'f1@example.test', display_name: 'Eins', locale: 'de' },
    ] as const
    const person = [
      'PersonAdded',
      {
        person_id: 'per_1',
        family_id: 'fam_1',
        given_name: 'Ada',
        family_name: 'Eins',
        birthdate: '1990-01-01',
        role: 'adult',
      },
    ] as const
    const fixAttendance = [
      'WorkshopAttendanceFixed',
      { person_id: 'per_1', workshop_ids: ['wks_1'] },
    ] as const

    // D30: capacity may not drop below live attendance.
    expect(
      foldError(
        log(
          family,
          person,
          workshop(4, 'WorkshopAdded'),
          fixAttendance,
          workshop(0, 'WorkshopUpdated'),
        ),
      ),
    ).toBe('capacity reduction would strand 1 current participant(s); rejected per D30')

    // Withdrawing the participant removes that attendance label, so the same
    // reduction becomes legal. A stale label-key index would still count them.
    expect(
      foldError(
        log(
          family,
          person,
          workshop(4, 'WorkshopAdded'),
          fixAttendance,
          ['PersonWithdrawn', { person_id: 'per_1', reason: null }],
          workshop(0, 'WorkshopUpdated'),
        ),
      ),
    ).toBeNull()
  })

  test('a slot overlap is still detected after an unrelated slot is retired', () => {
    const slot = (id: string, hour: number, type: string): readonly [string, JsonValue] => [
      type,
      {
        slot_id: id,
        starts_at: `2027-04-30T${String(hour).padStart(2, '0')}:00:00Z`,
        ends_at: `2027-04-30T${String(hour + 1).padStart(2, '0')}:00:00Z`,
        sort_key: hour,
      },
    ]
    // slot_1 is retired, so slot_2 may occupy its window.
    expect(
      foldError(
        log(
          slot('slot_1', 9, 'WorkshopSlotAdded'),
          ['WorkshopSlotRetired', { slot_id: 'slot_1', reason: null }],
          slot('slot_2', 9, 'WorkshopSlotAdded'),
        ),
      ),
    ).toBeNull()
    expect(
      foldError(
        log(slot('slot_1', 9, 'WorkshopSlotAdded'), slot('slot_2', 9, 'WorkshopSlotAdded')),
      ),
    ).toBe('slot overlaps or touches another live slot: slot_2')
  })
})
