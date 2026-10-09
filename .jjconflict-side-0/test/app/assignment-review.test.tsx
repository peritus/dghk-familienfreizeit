import { describe, expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import { derive } from '../../src/events/fold.js'
import { deriveDraftWorld } from '../../src/events/world.js'
import { materializeDraftEvents } from '../../src/app/organiser/state.js'
import { deriveAssignmentReview } from '../../src/modules/room-assignment/app/screens/assignment-board/review.js'
import {
  organiserAssignmentFixedFixtureState,
  organiserAssignmentFixtureEvents,
  organiserFixtureEvents,
} from '../../src/app/stories/organiser-fixtures.js'

describe('assignment review projection', () => {
  test('derives user-facing board and print views without event-log metadata', () => {
    const world = derive(organiserFixtureEvents, activeProfile.validation_view)
    const review = deriveAssignmentReview(world)

    expect(review.board).not.toHaveProperty('sequence')
    expect(review.print).not.toHaveProperty('sequence')
    expect(review.print.total_families).toBe(world.families.length)
    expect(review.print.generated_at).toBe('Im Browser erzeugt')
    expect(review.print.data_cut).toBe(`Ereignis ${world.head_seq}`)
    expect(review.print.sensitivity).toBe('Nur Organisationsteam')
    expect(review.print.placed_families + review.print.unplaced_families).toBe(
      review.print.total_families,
    )

    const boardFamilies = review.board.buildings.flatMap(({ rooms }) =>
      rooms.flatMap(({ occupants }) => occupants.map(({ name }) => name)),
    )
    const printFamilies = review.print.rooms.flatMap(({ occupants }) =>
      occupants === 'Leer' ? [] : occupants.split(', '),
    )
    expect([...boardFamilies].sort()).toEqual([...printFamilies].sort())
  })

  test('keeps solver findings and unplaced reasons in the review projection', () => {
    const world = derive(organiserFixtureEvents, activeProfile.validation_view)
    const review = deriveAssignmentReview(world)

    expect(review.board.unplaced_reasons).toBeDefined()
    expect(review.print.findings).toEqual(expect.any(Array))
    expect(review.print.unplaced).toEqual(expect.any(Array))
    expect(
      review.print.rooms.every(
        ({ status, capacity }) => status.label.length > 0 && capacity.length > 0,
      ),
    ).toBe(true)
  })

  test('supports the rich shared organiser fixture without leaking event metadata', () => {
    const world = derive(organiserAssignmentFixtureEvents, activeProfile.validation_view)
    const review = deriveAssignmentReview(world)

    expect(world.persons).toHaveLength(150)
    expect(review.board.buildings.map(({ name }) => name)).toEqual([
      'Haupthaus',
      'Gartenhaus',
      'Waldhaus',
      'Seeblick',
      'Birkenhof',
      'Gästehaus',
    ])
    expect(review.print.total_families).toBe(39)
    const rooms = review.board.buildings.flatMap(({ rooms: buildingRooms }) => buildingRooms)
    expect(rooms.some(({ occupied, capacity }) => occupied === capacity)).toBe(true)
    expect(rooms.some(({ occupied, capacity }) => occupied < capacity)).toBe(true)
    expect(rooms.some(({ occupied }) => occupied === 0)).toBe(true)
    expect(review.board.unplaced.map(({ name }) => name)).toContain('Seidel')
    expect(review.board.unplaced_reasons['fam_seidel']).toBe('Nicht genügend freie Schlafplätze.')
    expect(review.print.unplaced[0]?.reason).toBe('Nicht genügend freie Schlafplätze.')
    expect(review.board).not.toHaveProperty('sequence')
    expect(review.board).not.toHaveProperty('traces')
    expect(review.print).not.toHaveProperty('sequence')
  })

  test('projects fixed labels, including a fixed assignment with violations', () => {
    const state = organiserAssignmentFixedFixtureState
    const world = deriveDraftWorld(
      state.committed,
      materializeDraftEvents(state),
      activeProfile.validation_view,
    )
    const review = deriveAssignmentReview(world)
    const rooms = review.board.buildings.flatMap(({ rooms: buildingRooms }) => buildingRooms)
    const fixedFamily = rooms
      .flatMap(({ occupants }) => occupants)
      .find(({ id }) => id === 'fam_morgan')
    const invalidFamily = rooms
      .flatMap(({ occupants }) => occupants)
      .find(({ id }) => id === 'fam_seidel')

    expect(review.board.stats.fixed).toBe(2)
    expect(fixedFamily?.fixed).toBe(true)
    expect(fixedFamily?.fixed_room_name).toBe('Zimmer 12')
    expect(invalidFamily?.fixed_invalid).toBe(true)
    expect(review.print.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Ungültige feste Zuordnung' })]),
    )
  })
})
