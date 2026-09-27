import { describe, expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import { derive } from '../../src/events/fold.js'
import { deriveAssignmentReview } from '../../src/modules/room-assignment/app/review.js'
import { organiserFixtureEvents } from '../../src/app/stories/organiser-fixtures.js'

describe('assignment review projection', () => {
  test('derives user-facing board and report views without event-log metadata', () => {
    const world = derive(organiserFixtureEvents, activeProfile.validation_view)
    const review = deriveAssignmentReview(world)

    expect(review.board).not.toHaveProperty('sequence')
    expect(review.report).not.toHaveProperty('sequence')
    expect(review.report.total_families).toBe(world.families.length)
    expect(review.report.placed_families + review.report.unplaced_families).toBe(
      review.report.total_families,
    )

    const boardFamilies = review.board.buildings.flatMap(({ rooms }) =>
      rooms.flatMap(({ occupants }) => occupants.map(({ name }) => name)),
    )
    const reportFamilies = review.report.rooms.flatMap(({ occupants }) =>
      occupants === 'Leer' ? [] : occupants.split(', '),
    )
    expect([...boardFamilies].sort()).toEqual([...reportFamilies].sort())
  })

  test('keeps solver findings and unplaced reasons in the review projection', () => {
    const world = derive(organiserFixtureEvents, activeProfile.validation_view)
    const review = deriveAssignmentReview(world)

    expect(review.board.unplaced_reasons).toBeDefined()
    expect(review.report.findings).toEqual(expect.any(Array))
    expect(review.report.unplaced).toEqual(expect.any(Array))
  })
})
