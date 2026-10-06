import { expect, test } from 'vitest'
import { buildSolverInput } from '../../src/solver/input.js'
import { evaluateRules, orderStages, solve } from '../../src/solver/solve.js'
import type { SolverInput, SolverStage } from '../../src/solver/types.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'

const config = {
  build_revision: 'test-build',
  compatibility_revision: 1,
  event_date: '2027-04-30',
  profile: {},
  seed: null,
}

const fixture = `
FamilyInvited family_id="fam_a" email="a@example.test" display_name="A" locale="de"
PersonAdded person_id="per_a" family_id="fam_a" given_name="A" family_name="A" age=#null role="adult"
FamilyInvited family_id="fam_b" email="b@example.test" display_name="B" locale="de"
PersonAdded person_id="per_b" family_id="fam_b" given_name="B" family_name="B" age=#null role="adult"
LabelSet entity_id="fam_a" key=excludes value="rm_a" strength=required note=#null
LabelSet entity_id="fam_b" key=excludes value="rm_b" strength=required note=#null
`.trim()

function input(): SolverInput {
  return buildSolverInput(derive(loadKdl(fixture)))
}

test('builds sorted immutable solver input and module inputs from KDL', () => {
  const built = buildSolverInput(derive(loadKdl(fixture)), {
    solver_input: [
      { id: 'z', build: (world) => world.families.length },
      { id: 'a', build: (world) => world.persons.length },
    ],
  })
  expect(built.families.map(({ id }) => id)).toEqual(['fam_a', 'fam_b'])
  expect(built.persons.map(({ id }) => id)).toEqual(['per_a', 'per_b'])
  expect(Object.isFrozen(built.families)).toBe(true)
  expect(Object.isFrozen(built.requirements)).toBe(true)
  expect(Object.isFrozen(built.rules)).toBe(true)
  expect(built.module_inputs).toEqual({ a: 2, z: 2 })
  expect(built.constraints.map(({ value }) => value)).toEqual(['rm_a', 'rm_b'])
})

test('evaluates contributed rules through the shared solver evaluator', () => {
  const evaluations = evaluateRules(
    [
      {
        id: 'hard.second',
        evaluate: () => 'infeasible' as const,
        describe: () => 'second reason',
      },
      {
        id: 'hard.first',
        evaluate: () => 4,
        describe: () => null,
      },
    ],
    'family',
    'room',
    {},
  )
  expect(evaluations).toEqual([
    { id: 'hard.first', score: 4, text: null },
    { id: 'hard.second', score: 'infeasible', text: 'second reason' },
  ])
})

test('orders dependencies, ignores missing optional references, and rejects cycles', () => {
  const make = (
    id: string,
    after: string[] = [],
    reads: string[] = [],
    before: string[] = [],
  ): SolverStage => ({
    id,
    after,
    before,
    reads,
    run: () => ({ output: id, trace: [], diagnostics: [] }),
  })
  expect(
    orderStages([
      make('b', ['a']),
      make('a', [], [], ['c']),
      make('c', ['missing']),
      make('d', [], ['b', 'missing']),
    ]).map(({ id }) => id),
  ).toEqual(['a', 'b', 'c', 'd'])
  expect(() => orderStages([make('a', ['b']), make('b', ['a'])])).toThrow(/cycle/)
})

test('runs preflight checks and stages in deterministic order', () => {
  const stage: SolverStage = {
    id: 'fixture.stage',
    after: [],
    before: [],
    reads: ['missing'],
    run: () => ({
      output: { ok: true },
      trace: [{ stage: 'fixture.stage', step: 'run', subject: 'x', text: 'done' }],
      diagnostics: [
        { check: 'fixture.stage', severity: 'warning', subjects: ['b', 'a'], text: 'diagnostic' },
      ],
    }),
  }
  const plan = solve(
    input(),
    {
      preflight_checks: [
        {
          id: 'fixture.check',
          severity: 'error',
          run: () => [{ check: 'fixture.check', severity: 'error', subjects: ['z'], text: 'bad' }],
        },
        {
          id: 'fixture.check-2',
          severity: 'warning',
          run: () => [],
        },
      ],
      stages: [
        stage,
        {
          id: 'other.producer',
          after: [],
          before: [],
          reads: [],
          run: () => ({ output: 'produced', trace: [], diagnostics: [] }),
        },
        {
          id: 'other.consumer',
          after: ['other.producer'],
          before: [],
          reads: ['other.producer', 'missing'],
          run: (_input, outputs) => ({
            output: outputs,
            trace: [],
            diagnostics: [],
          }),
        },
      ],
    },
    config,
  )
  expect(plan.sections).toEqual({
    fixture: { ok: true },
    other: { 'other.producer': 'produced' },
  })
  expect(plan.sections.other).toEqual({ 'other.producer': 'produced' })
  expect(plan.preflight.map(({ check }) => check)).toEqual(['fixture.check', 'fixture.stage'])
  expect(plan.trace[0]?.text).toBe('done')
})
