import process from 'node:process'
import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { roomAssignmentRules } from '../../src/modules/room-assignment/index.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { solve } from '../../src/solver/solve.js'
import type { RoomAssignmentInput } from '../../src/modules/room-assignment/index.js'
import type { Rule, SolverInput } from '../../src/solver/types.js'
import { syntheticLog, syntheticScale } from '../bench/log.js'

/**
 * A cost gate that does not measure time.
 *
 * `pnpm run bench` reports wall clock, which is the right thing for a human
 * comparing two runs on one machine and the wrong thing for CI: a shared runner
 * makes an absolute millisecond budget either flaky or so loose it catches
 * nothing. What actually regressed every time in this area was never time, it
 * was how often the solver walks a collection — a filter moved inside a loop,
 * a scan reintroduced in an innermost rule. That is deterministic, identical on
 * every machine, and cannot flake.
 *
 * So this counts two things:
 *
 * - how many times a placement rule is evaluated, which is the number of
 *   (family, room) pairs the search examines;
 * - how many elements are read from the three collections that inner loops have
 *   historically rescanned.
 *
 * Budgets sit a little above the measured counts. They are tripwires, not
 * targets: a change that trips one is either a real regression or a deliberate
 * change to how the search works, and in the second case the number gets
 * updated in the same commit as the code.
 */
const profile = luebben2027Profile
const contributions = composeSolverContributions(profile)
const solverConfig = {
  build_revision: 'budgets',
  compatibility_revision: 1,
  event_date: profile.meta.starts_on,
  profile,
  seed: null,
}

/** Counts element reads, so a scan of the whole array costs its length. */
function countingArray<T>(items: readonly T[], onRead: () => void): readonly T[] {
  return new Proxy(items as T[], {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) onRead()
      return Reflect.get(target, property, receiver) as unknown
    },
  })
}

type Counts = {
  rule_evaluations: number
  label_reads: number
  constraint_reads: number
  family_reads: number
}

function measureWork(factor: number): Counts {
  const counts: Counts = {
    rule_evaluations: 0,
    label_reads: 0,
    constraint_reads: 0,
    family_reads: 0,
  }
  const world = derive(syntheticLog(syntheticScale(factor)), profile.validation_view)
  const base = buildSolverInput(world, contributions)
  const roomInput = base.module_inputs['room-assignment'] as RoomAssignmentInput

  const countingRules: readonly Rule[] = roomAssignmentRules().map(
    (rule) =>
      ({
        id: rule.id,
        evaluate: (candidate, target, context) => {
          counts.rule_evaluations += 1
          return rule.evaluate(
            candidate as Parameters<typeof rule.evaluate>[0],
            target as Parameters<typeof rule.evaluate>[1],
            context as Parameters<typeof rule.evaluate>[2],
          )
        },
        describe: (candidate, target, context) =>
          rule.describe(
            candidate as Parameters<typeof rule.describe>[0],
            target as Parameters<typeof rule.describe>[1],
            context as Parameters<typeof rule.describe>[2],
          ),
      }) as Rule,
  )

  const input: SolverInput = {
    ...base,
    rules: countingRules,
    labels: countingArray(base.labels, () => (counts.label_reads += 1)),
    module_inputs: {
      ...base.module_inputs,
      'room-assignment': {
        ...roomInput,
        rules: countingRules,
        constraints: countingArray(roomInput.constraints, () => (counts.constraint_reads += 1)),
        families: countingArray(roomInput.families, () => (counts.family_reads += 1)),
      },
    },
  }

  solve(input, { ...contributions, rules: countingRules }, solverConfig)
  return counts
}

/**
 * Recorded against `solver-cost-guards`, with the measured value in a comment
 * above each row. The two large counts get about 1.4x headroom; the two small
 * ones get more, because an extra legitimate single pass over a collection is a
 * large relative change there and not a regression. Both still sit far below
 * what a reintroduced per-candidate scan costs: `constraint_reads` was 27840 at
 * factor 1 before the input lookups were memoised, against a budget of 192, and
 * `rule_evaluations` was 25100 before candidate-room work was reduced, against
 * a budget of 11000.
 */
const budgets: Readonly<Record<number, Counts>> = {
  // measured: 7500 / 6260 / 64 / 180
  1: { rule_evaluations: 11_000, label_reads: 8_800, constraint_reads: 192, family_reads: 512 },
  // measured: 30000 / 12240 / 124 / 360
  2: { rule_evaluations: 44_000, label_reads: 17_200, constraint_reads: 384, family_reads: 1_024 },
}

for (const factor of [1, 2]) {
  test(`solver work stays within budget at scale factor ${factor}`, () => {
    const counts = measureWork(factor)
    process.stderr.write(`\nWORK factor ${factor}: ${JSON.stringify(counts)}\n`)
    const budget = budgets[factor]!
    expect(counts.rule_evaluations).toBeLessThanOrEqual(budget.rule_evaluations)
    expect(counts.label_reads).toBeLessThanOrEqual(budget.label_reads)
    expect(counts.constraint_reads).toBeLessThanOrEqual(budget.constraint_reads)
    expect(counts.family_reads).toBeLessThanOrEqual(budget.family_reads)
  })
}
