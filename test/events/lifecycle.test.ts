import { expect, test } from 'vitest'
import { lifecycleLog } from '../bench/lifecycle.js'
import { derive } from '../../src/events/fold.js'
import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { solve } from '../../src/solver/solve.js'
import type { RoomAssignmentSection } from '../../src/modules/room-assignment/index.js'
import type { WorkshopAssignmentSection } from '../../src/modules/workshop-assignment/index.js'

test.each(['normal', 'contention'] as const)(
  '%s lifecycle replays actual actions without padding',
  (scenario) => {
    const fixture = lifecycleLog(50, scenario)
    expect(lifecycleLog(50, scenario)).toEqual(fixture)
    expect(lifecycleLog(50, scenario, 123).events).not.toEqual(fixture.events)
    expect(Object.values(fixture.phaseCounts).reduce((sum, count) => sum + count, 0)).toBe(
      fixture.events.length,
    )
    expect(fixture.actions.reduce((sum, action) => sum + action.count, 0)).toBe(
      fixture.events.length,
    )
    expect(fixture.scale.log_bytes).toBe(
      new TextEncoder().encode(JSON.stringify(fixture.events)).byteLength,
    )
    const world = derive(fixture.events, profile.validation_view)
    expect(world.families).toHaveLength(50)
    expect(world.entities_by_kind.person).toHaveLength(fixture.scale.persons)
    expect(world.diagnostics.filter((finding) => finding.severity === 'error')).toEqual([])
    expect(
      new Set(
        fixture.events
          .filter((event) => event.type === 'LabelSet')
          .map((event) => (event.payload as { key: string }).key),
      ).size,
    ).toBeGreaterThan(10)
    expect(fixture.phaseCounts.corrections).toBeLessThan(fixture.events.length / 5)
  },
)

test('normal lifecycle has varied households and complete room and workshop allocations', () => {
  const fixture = lifecycleLog(50)
  const world = derive(fixture.events, profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    profile,
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: profile.meta.starts_on,
    seed: null,
  })
  expect((plan.sections['room-assignment'] as RoomAssignmentSection).unplaced).toEqual([])
  const workshop = plan.sections['workshop-assignment'] as WorkshopAssignmentSection
  const assigned = new Map<string, number>()
  for (const row of workshop.assignments)
    assigned.set(row.person_id, (assigned.get(row.person_id) ?? 0) + 1)
  expect([...assigned.values()].filter((count) => count === 2)).toHaveLength(
    fixture.scale.eligible_persons,
  )
})

test('lifecycle rejects invalid inputs and scales entities without multiplying the timetable', () => {
  expect(() => lifecycleLog(0)).toThrow()
  expect(() => lifecycleLog(20, 'normal', -1)).toThrow()
  const small = lifecycleLog(50)
  const larger = lifecycleLog(100)
  expect(larger.events.length).toBeGreaterThan(small.events.length)
  expect(larger.scale.workshops).toBe(small.scale.workshops)
  expect(larger.scale.slots).toBe(small.scale.slots)
  expect(larger.scale.persons).toBeGreaterThan(larger.scale.families * 3)
})
