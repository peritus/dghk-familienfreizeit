import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { profileAttentionChecks } from '../../src/attention/profile.js'
import { composeSolverContributions, buildSolverInput, solve } from '../../src/solver/index.js'
import type { AttentionContext } from '../../src/attention/types.js'
import type { RoomAssignmentSection } from '../../src/modules/room-assignment/index.js'
import type { WorkshopRankingsSummary } from '../../src/modules/workshop-rankings/index.js'
import { syntheticLog, syntheticScale } from '../bench/log.js'

function countReads<T>(items: readonly T[], read: () => void): readonly T[] {
  return new Proxy(items, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) read()
      return Reflect.get(target, property, receiver) as unknown
    },
  })
}

test('attention checks walk trace, assignments, membership and rankings once', () => {
  const profile = luebben2027Profile
  const world = derive(syntheticLog(syntheticScale(2)), profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'budgets',
    compatibility_revision: 1,
    event_date: profile.meta.starts_on,
    profile,
    seed: null,
  })
  const section = plan.sections['room-assignment'] as RoomAssignmentSection
  const rankings = world.summaries['workshop-rankings'] as WorkshopRankingsSummary
  const members = world.labels_by_key['member-of'] ?? []
  const counts = { trace: 0, assignments: 0, members: 0, rankings: 0 }
  const context: AttentionContext = {
    domain: 'available',
    world: {
      ...world,
      labels_by_key: {
        ...world.labels_by_key,
        'member-of': countReads(members, () => counts.members++),
      },
      summaries: {
        ...world.summaries,
        'workshop-rankings': {
          ...rankings,
          rankings: countReads(rankings.rankings, () => counts.rankings++),
        },
      },
    },
    plan: {
      ...plan,
      trace: countReads(plan.trace, () => counts.trace++),
      sections: {
        ...plan.sections,
        'room-assignment': {
          ...section,
          assignments: countReads(section.assignments, () => counts.assignments++),
        },
      },
    },
    profile,
    build_revision: 'budgets',
    locale: profile.meta.locale,
    now: '2027-01-01T00:00:00Z',
    audience: 'organiser',
  }
  const checks = profileAttentionChecks(profile)
  for (const code of [
    'workshop-scheduling.unscheduled',
    'room-assignment.place-shortfall',
    'kernel.family-without-persons',
    'workshop-rankings.demand',
  ]) {
    const check = checks.find((check) => check.code === code)!
    expect(check.collect(context)).toEqual(check.collect({ ...context, world, plan }))
  }
  expect(counts.trace).toBe(plan.trace.length)
  expect(counts.assignments).toBe(section.assignments.length)
  expect(counts.members).toBe(members.length)
  expect(counts.rankings).toBe(rankings.rankings.length)
})
