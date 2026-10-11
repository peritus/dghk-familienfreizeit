import process from 'node:process'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import {
  derive,
  foldEventLog,
  resolveFoldedWorld,
  completeDerivedWorld,
  type World,
} from '../../src/events/fold.js'
import { projectFamilyWorld, projectSharedWorld } from '../../src/events/world.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { prepareEventBatch } from '../../src/events/prepare.js'
import { authorizeEventBatch } from '../../src/auth/authorization.js'
import { orderStages, solve } from '../../src/solver/solve.js'
import { closedAttentionContext } from '../../src/attention/closed.js'
import { profileAttention, profileAttentionChecks } from '../../src/attention/profile.js'
import type { AttentionContext } from '../../src/attention/types.js'
import { derivePhaseStatus } from '../../src/derive/phases.js'
import {
  fillClosingPayloads,
  closingEventAreas,
  AreaNotReadyError,
  WorkshopReviewRequiredError,
} from '../../src/worker/closing.js'
import type { EventDraft } from '../../src/events/types.js'
import type { Plan, SolverInput } from '../../src/solver/types.js'
import { summarize, type TimingSummary } from '../../src/performance/results.js'
import { chromeTrace, traceRecorder } from '../../src/performance/trace.js'
import {
  profiledAttention,
  profiledContributions,
  profiledDerive,
} from '../../src/performance/domain.js'
import { startRun } from '../../scripts/performance-history.ts'
import { syntheticLog, syntheticScale, syntheticLogSize } from './log.js'

const profile = luebben2027Profile
const contributions = composeSolverContributions(profile)
const solverConfig = {
  build_revision: 'bench',
  compatibility_revision: 1,
  event_date: profile.meta.starts_on,
  profile,
  seed: null,
}
const selected = new Set(
  (
    process.env.DGHK_BENCH_STAGES ??
    'derive,buildSolverInput,solve,attention,prepareEventBatch,authorizeEventBatch,projectSharedWorld,projectFamilyWorld,edit,closing'
  ).split(','),
)
const numberList = (value: string) =>
  value
    .split(',')
    .map(Number)
    .filter((entry) => Number.isSafeInteger(entry) && entry > 0)
const scenarios = (process.env.DGHK_BENCH_SCENARIOS ?? 'history,population').split(',')
if (scenarios.some((value) => value !== 'history' && value !== 'population'))
  throw new Error('invalid bench scenario')
const cases = process.env.DGHK_BENCH_EVENTS
  ? numberList(process.env.DGHK_BENCH_EVENTS).flatMap((size) =>
      scenarios.map((scenario) => syntheticLogSize(size, scenario as 'history' | 'population')),
    )
  : numberList(process.env.DGHK_BENCH_FACTORS ?? '1,2,4').map((factor) => ({
      events: syntheticLog(syntheticScale(factor)),
      scale: syntheticScale(factor),
      factor,
      scenario: 'population',
    }))
if (!cases.length) throw new Error('no valid benchmark sizes')

function attentionContext(world: World, plan: Plan | null): AttentionContext {
  return {
    domain: 'available',
    world,
    plan,
    profile,
    build_revision: 'bench',
    locale: profile.meta.locale,
    now: '2027-01-01T00:00:00Z',
    audience: 'organiser',
  }
}

/** Timing loops have no trace sink; representative traced runs happen separately. */
function measure(operation: string, run: () => unknown): TimingSummary {
  run()
  const budget = Number(process.env.DGHK_BENCH_SAMPLE_MS ?? '2000')
  const maximum = Number(process.env.DGHK_BENCH_MAX_SAMPLES ?? '25')
  const minimum = Number(process.env.DGHK_BENCH_MIN_SAMPLES ?? '3')
  if (
    !Number.isFinite(budget) ||
    budget < 0 ||
    !Number.isSafeInteger(maximum) ||
    !Number.isSafeInteger(minimum) ||
    minimum < 1 ||
    maximum < minimum
  )
    throw new Error('invalid sample settings')
  const samples: number[] = []
  const deadline = performance.now() + budget
  do {
    const started = performance.now()
    run()
    samples.push(performance.now() - started)
  } while (samples.length < maximum && (samples.length < minimum || performance.now() < deadline))
  return summarize(operation, samples)
}

function planHash(world: World, plan: Plan | null): string {
  const hash = createHash('sha256').update(JSON.stringify(world))
  if (plan) {
    hash.update(
      JSON.stringify({ meta: plan.meta, sections: plan.sections, preflight: plan.preflight }),
    )
    // Stream entries instead of allocating another complete solver-trace string.
    for (const entry of plan.trace) hash.update(JSON.stringify(entry))
  }
  return hash.digest('hex')
}

function stageTimings(
  input: SolverInput,
  add: (operation: string, run: () => unknown) => void,
  pending: (operation: string) => void,
) {
  const checks = (contributions.preflight_checks ?? [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
  add('solver.preflight', () => checks.flatMap((check) => check.run(input, solverConfig)))
  for (const check of checks) add(`solver.check:${check.id}`, () => check.run(input, solverConfig))
  const outputs: Record<string, unknown> = {}
  for (const stage of orderStages(contributions.stages ?? [])) {
    const upstream = Object.freeze(
      Object.fromEntries(stage.reads.filter((id) => id in outputs).map((id) => [id, outputs[id]])),
    )
    add(`solver.stage:${stage.id}`, () => stage.run(input, upstream, solverConfig))
    pending(`solver.output:${stage.id}`)
    outputs[stage.id] = stage.run(input, upstream, solverConfig).output
  }
}

test('heavy computations across reproducible event-log workloads', () => {
  for (const fixture of cases) {
    const { events, scale, scenario } = fixture
    const history = startRun(`luebben2027-synthetic-v1:${scenario}`, {
      events: events.length,
      ...scale,
    })
    const timings: TimingSummary[] = []
    const add = (operation: string, run: () => unknown) => {
      process.stderr.write(`Measuring ${scenario} ${events.length}: ${operation}\n`)
      history.checkpoint(timings, operation)
      const timing = measure(operation, run)
      timings.push(timing)
      history.checkpoint(timings)
      process.stderr.write(
        `${operation}: median ${timing.median_ms.toFixed(2)} ms, p95 ${timing.p95_ms.toFixed(2)} ms, n=${timing.samples}\n`,
      )
    }
    if (selected.has('derive')) {
      add('events.derive', () => derive(events, profile.validation_view))
      add('events.fold', () => foldEventLog(events, profile.validation_view))
      const folded = foldEventLog(events, profile.validation_view)
      add('events.resolve', () => resolveFoldedWorld(folded, profile.validation_view))
      const rawWorld = resolveFoldedWorld(folded, profile.validation_view)
      add('events.complete', () => completeDerivedWorld(rawWorld, profile.validation_view))
      for (const summary of profile.validation_view.world_summaries ?? [])
        add(`world.summary:${summary.id}`, () => summary.summarize(rawWorld))
      for (const [index, check] of (profile.validation_view.world_checks ?? []).entries())
        add(`world.check:${index}`, () => check(rawWorld))
    }
    history.checkpoint(timings, 'events.setup-world')
    const world = derive(events, profile.validation_view)
    expect(world.head_seq).toBe(events.length)
    expect(world.diagnostics.filter((finding) => finding.severity === 'error')).toEqual([])
    history.checkpoint(timings, 'solver.setup-input')
    const input = buildSolverInput(world, contributions)
    if (selected.has('buildSolverInput')) {
      add('solver.input', () => buildSolverInput(world, contributions))
      for (const part of contributions.solver_input ?? [])
        add(`solver.input:${part.id}`, () => part.build(world))
    }
    if (selected.has('solve')) {
      add('solver.solve', () => solve(input, contributions, solverConfig))
      stageTimings(input, add, (operation) => history.checkpoint(timings, operation))
    }
    history.checkpoint(timings, 'solver.setup-plan')
    let plan =
      selected.has('solve') || selected.has('attention')
        ? solve(input, contributions, solverConfig)
        : null
    if (selected.has('attention')) {
      const context = attentionContext(world, plan)
      add('attention.evaluate', () => profileAttention(profile)(context))
      for (const check of profileAttentionChecks(profile))
        add(`attention.check:${check.code}`, () => check.collect(context))
      if (plan) add('attention.closed', () => closedAttentionContext(world, plan!, profile))
      add('phase.status', () =>
        derivePhaseStatus({
          world,
          modules: profile.modules,
          meta: profile.meta,
          now: '2027-01-01T00:00:00Z',
        }),
      )
    }
    const family = world.families[0]!
    const draft: EventDraft = {
      at: '2027-01-01T00:00:00Z',
      actor: 'bench@example.test',
      subject: null,
      type: 'LabelSet',
      payload: {
        entity_id: family.id,
        key: 'family-note',
        value: 'typed',
        strength: null,
        note: null,
      },
    }
    if (selected.has('prepareEventBatch'))
      add('events.prepare', () => prepareEventBatch(events, [draft], profile.validation_view))
    if (selected.has('authorizeEventBatch'))
      add('events.authorize', () =>
        authorizeEventBatch(
          { kind: 'organiser', email: 'bench@example.test' },
          [{ ...draft, seq: events.length + 1 }],
          world,
          profile.validation_view,
        ),
      )
    if (selected.has('projectSharedWorld'))
      add('projection.shared', () => projectSharedWorld(world))
    if (selected.has('projectFamilyWorld'))
      add('projection.family', () => projectFamilyWorld(world, family.id))
    const runEdit = () => {
      const prospective = prepareEventBatch(events, [draft], profile.validation_view).world
      const currentPlan = solve(
        buildSolverInput(prospective, contributions),
        contributions,
        solverConfig,
      )
      return profileAttention(profile)(attentionContext(prospective, currentPlan))
    }
    if (selected.has('edit')) add('organiser.edit', runEdit)
    if (selected.has('closing')) {
      const closeType = [...closingEventAreas(profile.modules).keys()][0]!
      add('closing.fill', () => {
        try {
          return fillClosingPayloads(
            events,
            [{ ...draft, type: closeType, payload: {} }],
            profile,
            solverConfig,
          )
        } catch (error) {
          // The growing fixture includes unplaced families; closing correctly rejects it.
          if (error instanceof AreaNotReadyError || error instanceof WorkshopReviewRequiredError)
            return error.constructor.name
          throw error
        }
      })
    }
    history.checkpoint(timings, 'result.hash')
    const outputHash = planHash(world, plan)
    plan = null
    history.checkpoint(timings, 'trace.capture')
    const recorder = traceRecorder(() => performance.now())
    const timed = <T>(operation: string, run: () => T): T =>
      recorder.measure(operation, events.length, run)
    // A single representative trace. Trace contains only timing/count/outcome, never domain output.
    if (selected.has('solve') || selected.has('edit'))
      timed('organiser.edit', () => {
        const tracedWorld = profiledDerive(events, profile.validation_view, timed)
        const scoped = profiledContributions(contributions, timed)
        const tracedPlan = timed('solver.solve', () =>
          solve(
            timed('solver.input', () => buildSolverInput(tracedWorld, scoped)),
            scoped,
            solverConfig,
          ),
        )
        if (selected.has('attention'))
          profiledAttention(profile, timed)(attentionContext(tracedWorld, tracedPlan))
      })
    else profiledDerive(events, profile.validation_view, timed)
    history.finish(
      timings,
      outputHash,
      chromeTrace(recorder.slices, `${scenario} ${events.length}`),
    )
  }
})
