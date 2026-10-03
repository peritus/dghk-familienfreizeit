import process from 'node:process'
import { performance } from 'node:perf_hooks'
import { expect, test } from 'vitest'
import { familienfreizeit2027Profile } from '../../src/config/profiles/familienfreizeit-2027.js'
import { derive, type World } from '../../src/events/fold.js'
import { projectFamilyWorld, projectSharedWorld } from '../../src/events/world.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { solve } from '../../src/solver/solve.js'
import type { Event } from '../../src/events/types.js'
import { syntheticLog, syntheticScale } from './log.js'

const profile = familienfreizeit2027Profile
const contributions = composeSolverContributions(profile)
const solverConfig = {
  build_revision: 'bench',
  compatibility_revision: 1,
  event_date: profile.meta.starts_on,
  profile,
  seed: null,
}

const factors = (process.env.DGHK_BENCH_FACTORS ?? '1,2,4')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0)

/**
 * Which stages to time. `solve` is orders of magnitude more expensive than the
 * rest and grows faster, so measuring the fold at a large log size means being
 * able to leave it out: `DGHK_BENCH_STAGES=derive`.
 */
const stages = new Set(
  (
    process.env.DGHK_BENCH_STAGES ??
    'derive,buildSolverInput,solve,projectSharedWorld,projectFamilyWorld'
  )
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0),
)

/** Measures wall time, reporting the median of repeated runs after one warmup. */
function measure(run: () => void): { median: number; runs: number } {
  run()
  const budgetMs = 2000
  const samples: number[] = []
  const deadline = performance.now() + budgetMs
  do {
    const started = performance.now()
    run()
    samples.push(performance.now() - started)
  } while (performance.now() < deadline && samples.length < 25)
  samples.sort((left, right) => left - right)
  return { median: samples[Math.floor(samples.length / 2)] ?? 0, runs: samples.length }
}

function row(stage: string, events: number, result: { median: number; runs: number }): string {
  const perEvent = (result.median * 1000) / events
  return [
    stage.padEnd(22),
    String(events).padStart(7),
    `${result.median.toFixed(1).padStart(10)} ms`,
    `${perEvent.toFixed(2).padStart(8)} us/ev`,
    `n=${result.runs}`,
  ].join('  ')
}

test('derivation pipeline cost by log size', () => {
  const lines: string[] = []
  let previous: { events: number; median: number } | null = null

  for (const factor of factors) {
    const scale = syntheticScale(factor)
    const events: Event[] = syntheticLog(scale)
    lines.push(
      '',
      `factor ${factor}: ${events.length} events ` +
        `(${scale.rooms} rooms, ${scale.beds} beds, ${scale.workshops} workshops, ` +
        `${scale.families} families, ${scale.persons} persons, ${scale.rankings} rankings, ` +
        `${scale.requirements} needs)`,
    )

    const deriveResult = measure(() => void derive(events, profile.validation_view))
    lines.push(row('derive', events.length, deriveResult))

    const world: World = derive(events, profile.validation_view)

    if (stages.has('buildSolverInput'))
      lines.push(
        row(
          'buildSolverInput',
          events.length,
          measure(() => void buildSolverInput(world, contributions)),
        ),
      )

    if (stages.has('solve')) {
      const input = buildSolverInput(world, contributions)
      lines.push(
        row(
          'solve',
          events.length,
          measure(() => void solve(input, contributions, solverConfig)),
        ),
      )
    }

    if (stages.has('projectSharedWorld'))
      lines.push(
        row(
          'projectSharedWorld',
          events.length,
          measure(() => void projectSharedWorld(world)),
        ),
      )

    const firstFamily = world.families[0]
    if (stages.has('projectFamilyWorld') && firstFamily)
      lines.push(
        row(
          'projectFamilyWorld',
          events.length,
          measure(() => void projectFamilyWorld(world, firstFamily.id)),
        ),
      )

    if (previous) {
      const eventGrowth = events.length / previous.events
      const timeGrowth = deriveResult.median / previous.median
      // Linear derive tracks the event growth; quadratic derive tracks its square.
      lines.push(
        `  derive growth: events x${eventGrowth.toFixed(2)} ` +
          `-> time x${timeGrowth.toFixed(2)} ` +
          `(exponent ${(Math.log(timeGrowth) / Math.log(eventGrowth)).toFixed(2)})`,
      )
    }
    previous = { events: events.length, median: deriveResult.median }

    expect(world.head_seq).toBe(events.length)
  }

  // stderr, not console.log: the runner intercepts console output and a
  // benchmark whose numbers never reach the terminal is useless.
  process.stderr.write(`${lines.join('\n')}\n`)
})
