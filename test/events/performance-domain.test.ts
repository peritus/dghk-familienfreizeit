import { expect, test } from 'vitest'
import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { prepareEventBatch } from '../../src/events/prepare.js'
import type { EventDraft } from '../../src/events/types.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { solve } from '../../src/solver/solve.js'
import { profileAttention } from '../../src/attention/profile.js'
import {
  profiledDerive,
  profiledContributions,
  profiledAttention,
  profiledPrepare,
} from '../../src/performance/domain.js'
import { syntheticLog, syntheticScale, syntheticLogSize } from '../bench/log.js'

test('profiling adapters preserve world, solver plan and attention exactly', () => {
  const operations: string[] = []
  const measure = <T>(operation: string, run: () => T): T => {
    operations.push(operation)
    return run()
  }
  const events = syntheticLog(syntheticScale(1))
  const world = derive(events, profile.validation_view)
  expect(profiledDerive(events, profile.validation_view, measure)).toEqual(world)
  const contributions = composeSolverContributions(profile)
  const scoped = profiledContributions(contributions, measure)
  const config = {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: profile.meta.starts_on,
    profile,
    seed: null,
  }
  const input = buildSolverInput(world, contributions)
  expect(buildSolverInput(world, scoped)).toEqual(input)
  const plan = solve(input, contributions, config)
  expect(solve(input, scoped, config)).toEqual(plan)
  const context = {
    domain: 'available' as const,
    world,
    plan,
    profile,
    build_revision: 'test',
    locale: 'de',
    now: '2027-01-01T00:00:00Z',
    audience: 'organiser' as const,
  }
  expect(profiledAttention(profile, measure)(context)).toEqual(profileAttention(profile)(context))
  expect(operations).toContain('solver.stage:room-assignment.place')
  expect(operations.some((operation) => operation.startsWith('attention.check:'))).toBe(true)
})

test('profiled preparation preserves accepted batches and rejected results', () => {
  const operations: string[] = []
  const measure = <T>(operation: string, run: () => T): T => {
    operations.push(operation)
    return run()
  }
  const drafts: EventDraft[] = [
    {
      at: '2027-01-01T00:00:00Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'BuildingAdded',
      payload: { building_id: 'bld_profiled', name: 'Lab', sort_key: 1 },
    },
  ]
  const config = profile.validation_view
  expect(profiledPrepare([], drafts, config, measure)).toEqual(
    prepareEventBatch([], drafts, config),
  )
  const committed = prepareEventBatch([], drafts, config).events
  expect(() => profiledPrepare(committed, drafts, config, measure)).toThrow()
  const error = (run: () => unknown) => {
    try {
      run()
      throw new Error('expected rejection')
    } catch (failure) {
      return { constructor: (failure as Error).constructor, message: (failure as Error).message }
    }
  }
  expect(error(() => profiledPrepare(committed, drafts, config, measure))).toEqual(
    error(() => prepareEventBatch(committed, drafts, config)),
  )
  expect(operations).toContain('events.prepare')
  expect(operations).toContain('events.parse')
})

test('large history fixture preserves population while population fixture grows it', () => {
  const history = syntheticLogSize(20000, 'history')
  const population = syntheticLogSize(20000, 'population')
  expect(history.events).toHaveLength(20000)
  expect(population.events).toHaveLength(20000)
  expect(history.scale.families).toBe(30)
  expect(population.scale.families).toBeGreaterThan(history.scale.families)
  expect(derive(history.events, profile.validation_view).head_seq).toBe(20000)
})
