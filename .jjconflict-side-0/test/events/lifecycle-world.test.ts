import { expect, test } from 'vitest'
import { lifecycleLog } from '../bench/lifecycle.js'
import { completeLifecycle, allocationObservations } from '../bench/lifecycle-world.js'
import { derive } from '../../src/events/fold.js'
import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { benchmarkCases } from '../bench/cases.js'

test.each([25, 50, 100])(
  'complete normal %i-family lifecycle stores real close results then reopens',
  (families) => {
    const fixture = completeLifecycle(lifecycleLog(families))
    expect(fixture.observations.lifecycle_closed).toBe(1)
    expect(fixture.observations.closing_bytes).toBeGreaterThan(1000)
    expect(fixture.events.filter((event) => event.type === 'AccommodationClosed')).toHaveLength(1)
    expect(fixture.events.filter((event) => event.type === 'WorkshopsClosed')).toHaveLength(1)
    const world = derive(fixture.events, profile.validation_view)
    expect(world.phase_facts.areas.accommodation?.latest?.kind === 'closed').toBe(false)
    expect(world.phase_facts.areas.workshops?.latest?.kind === 'closed').toBe(false)
    expect(allocationObservations(fixture.events).observations.underassigned_people).toBe(0)
    expect(fixture.scale.log_bytes).toBe(
      new TextEncoder().encode(JSON.stringify(fixture.events)).byteLength,
    )
  },
)

test('shared case selection rejects malformed settings and keeps lifecycle separate from exact-size stress', () => {
  expect(
    benchmarkCases({ DGHK_CAPACITY_FAMILIES: '25', DGHK_CAPACITY_SCENARIOS: 'normal' })[0]!.events,
  ).toEqual(lifecycleLog(25).events)
  expect(() => benchmarkCases({ DGHK_CAPACITY_FAMILIES: '25,no' })).toThrow()
  expect(() => benchmarkCases({ DGHK_CAPACITY_FAMILIES: '' })).toThrow()
  expect(() =>
    benchmarkCases({ DGHK_CAPACITY_FAMILIES: '25', DGHK_CAPACITY_SCENARIOS: 'history' }),
  ).toThrow()
  expect(
    benchmarkCases({ DGHK_BENCH_EVENTS: '20000', DGHK_BENCH_SCENARIOS: 'history' })[0]!.events,
  ).toHaveLength(20000)
})
