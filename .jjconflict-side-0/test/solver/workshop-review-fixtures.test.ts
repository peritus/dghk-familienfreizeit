import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import { canonical } from '../../src/attention/engine.js'
import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { projectFamilyWorld, projectSharedWorld } from '../../src/events/world.js'
import type { Event } from '../../src/events/types.js'
import type { WorkshopAssignmentSection } from '../../src/modules/workshop-assignment/index.js'
import type { WorkshopSchedulingSection } from '../../src/modules/workshop-scheduling/index.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'

const contributions = composeSolverContributions(profile)

function fixture(name: string): Event[] {
  const source = readFileSync(
    resolve(process.cwd(), `test/fixtures/workshop-assignment/${name}.kdl`),
    'utf-8',
  )
  return loadKdl(source, profile.validation_view)
}

function deriveAndSolve(events: readonly Event[]) {
  const world = derive([...events], profile.validation_view)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: profile.meta.starts_on,
    profile,
    seed: null,
  })
  return { world, plan }
}

test('fixed attendance wins capacity first and ranked contention is deterministic and traceable', () => {
  const events = fixture('ranked-fixed-contention')
  const initialEvents = events.slice(0, -2)
  const { plan } = deriveAndSolve(initialEvents)
  const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection

  expect(attendance.assignments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        person_id: 'per_fixed',
        workshop_id: 'wks_clay',
        reason: 'fixed',
      }),
      expect.objectContaining({
        person_id: 'per_rank_a',
        workshop_id: 'wks_clay',
        reason: 'ranked',
      }),
      expect.objectContaining({
        person_id: 'per_rank_b',
        workshop_id: 'wks_drawing',
        rank: 2,
        reason: 'ranked',
      }),
    ]),
  )
  expect(plan.trace).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        stage: 'workshop-assignment.attendance',
        step: 'ranked-rejected',
        subject: 'per_rank_b',
        text: 'per_rank_b rejected for wks_clay: hard.capacity',
      }),
    ]),
  )
  expect(deriveAndSolve(initialEvents).plan).toEqual(plan)
})

test('capacity reductions preserve explicit fixed attendance and sign-ups and project private facts away', () => {
  const events = fixture('ranked-fixed-contention')
  const initial = deriveAndSolve(events.slice(0, -2))
  const current = deriveAndSolve(events)
  const before = initial.plan.sections['workshop-assignment'] as WorkshopAssignmentSection
  const after = current.plan.sections['workshop-assignment'] as WorkshopAssignmentSection

  expect(after.fixed).toEqual(before.fixed)
  expect(after.assignments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        person_id: 'per_fixed',
        workshop_id: 'wks_clay',
        reason: 'fixed',
      }),
    ]),
  )
  expect(after.fixed_violations).toEqual([
    expect.objectContaining({
      person_id: 'per_fixed',
      workshop_id: 'wks_clay',
      reasons: ['hard.capacity'],
    }),
  ])
  expect(after.signups).toEqual(before.signups)
  expect(after.signups).toEqual([{ person_id: 'per_signup', workshop_id: 'wks_signup' }])
  expect(after.assignments).not.toEqual(before.assignments)
  expect(current.plan.trace).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        step: 'ranked-rejected',
        subject: 'per_rank_a',
        text: 'per_rank_a rejected for wks_clay: hard.capacity',
      }),
    ]),
  )

  for (const projected of [
    projectFamilyWorld(current.world, 'fam_fixed'),
    projectSharedWorld(current.world),
  ]) {
    expect(canonical(projected)).not.toContain('private-workshop-note')
    expect(canonical(projected)).not.toContain('fixed-workshop:per_fixed:wks_clay')
  }
})

test('retiring a workshop slot recomputes the placement onto the next live slot', () => {
  const events = fixture('slot-retirement')
  const before = deriveAndSolve(events.slice(0, -1)).plan
  const after = deriveAndSolve(events).plan
  const placement = (plan: typeof before) =>
    (plan.sections['workshop-scheduling'] as WorkshopSchedulingSection).placements[0]

  expect(placement(before)).toMatchObject({ workshop_id: 'wks_slot', slot_id: 'slot_first' })
  expect(placement(after)).toMatchObject({ workshop_id: 'wks_slot', slot_id: 'slot_second' })
})
