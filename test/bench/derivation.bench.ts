import process from 'node:process'
import { performance } from 'node:perf_hooks'
import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive, type World } from '../../src/events/fold.js'
import { projectFamilyWorld, projectSharedWorld } from '../../src/events/world.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { prepareEventBatch } from '../../src/events/prepare.js'
import { orderStages, solve } from '../../src/solver/solve.js'
import type { Event } from '../../src/events/types.js'
import type { SolverInput } from '../../src/solver/types.js'
import { syntheticLog, syntheticScale } from './log.js'

const profile = luebben2027Profile
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
    'derive,buildSolverInput,solve,projectSharedWorld,projectFamilyWorld,' + 'prepareEventBatch'
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

/**
 * Times the preflight pass and each solver stage separately, mirroring how
 * `solve` orders stages and hands each one only the upstream outputs it
 * declares (`src/solver/solve.ts`). `solve`'s single total hides which stage
 * spends the time, which is the only thing worth knowing about it.
 */
function stageRows(input: SolverInput, events: number): readonly string[] {
  const rows: string[] = []
  const checks = (contributions.preflight_checks ?? [])
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
  rows.push(
    row(
      '  preflight',
      events,
      measure(() => void checks.flatMap((check) => check.run(input, solverConfig))),
    ),
  )
  const outputs: Record<string, unknown> = {}
  for (const stage of orderStages(contributions.stages ?? [])) {
    const upstream = Object.freeze(
      Object.fromEntries(stage.reads.filter((id) => id in outputs).map((id) => [id, outputs[id]])),
    )
    rows.push(
      row(
        `  ${stage.id}`,
        events,
        measure(() => void stage.run(input, upstream, solverConfig)),
      ),
    )
    outputs[stage.id] = stage.run(input, upstream, solverConfig).output
  }
  return rows
}

function row(stage: string, events: number, result: { median: number; runs: number }): string {
  const perEvent = (result.median * 1000) / events
  return [
    stage.padEnd(32),
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
      for (const line of stageRows(input, events.length)) lines.push(line)
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

    if (stages.has('prepareEventBatch') && firstFamily) {
      const draft: Event = {
        seq: events.length + 1,
        at: '2027-01-01T00:00:00Z',
        actor: 'organiser@example.test',
        subject: null,
        type: 'LabelSet',
        payload: {
          entity_id: firstFamily.id,
          key: 'family-note',
          value: 'typed',
          strength: null,
          note: null,
        },
      }
      lines.push(
        row(
          'prepareEventBatch',
          events.length,
          measure(
            () =>
              void prepareEventBatch(
                events,
                [
                  {
                    at: draft.at,
                    actor: draft.actor,
                    subject: null,
                    type: draft.type,
                    payload: draft.payload,
                  },
                ],
                profile.validation_view,
              ),
          ),
        ),
      )
    }

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
