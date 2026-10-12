import {
  completeDerivedWorld,
  foldEventLog,
  resolveFoldedWorld,
  type KernelConfig,
  assertAppendableWorld,
} from '../events/fold.js'
import type { Event, EventDraft } from '../events/types.js'
import { parseDraftBatch } from '../events/prepare.js'
import type { SolverContributions } from '../solver/types.js'
import type { OccasionProfile } from '../config/define.js'
import { composeAttention } from '../attention/engine.js'
import { coreProfileAttentionChecks } from '../attention/catalogue.js'
import type { AttentionCheck } from '../attention/types.js'

/** Effects live in this adapter; domain functions receive ordinary inputs. */
export type ComputationProfiler = <T>(operation: string, run: () => T) => T

export function profiledPrepare(
  committed: readonly Event[],
  drafts: readonly EventDraft[],
  config: KernelConfig,
  measure: ComputationProfiler,
) {
  return measure('events.prepare', () => {
    const events = measure('events.parse', () => parseDraftBatch(committed.length, drafts, config))
    const world = profiledDerive([...committed, ...events], config, measure)
    assertAppendableWorld(world)
    return { events, world }
  })
}

export function profiledDerive(
  events: readonly Event[],
  config: KernelConfig,
  measure: ComputationProfiler,
) {
  const scoped: KernelConfig = {
    ...config,
    world_summaries: config.world_summaries?.map((summary) => ({
      ...summary,
      summarize: (world) => measure(`world.summary:${summary.id}`, () => summary.summarize(world)),
    })),
    world_checks: config.world_checks?.map(
      (check, index) => (world) => measure(`world.check:${index}`, () => check(world)),
    ),
  }
  return measure('events.derive', () => {
    const state = measure('events.fold', () => foldEventLog(events, scoped))
    const world = measure('events.resolve', () => resolveFoldedWorld(state, scoped))
    return measure('events.complete', () => completeDerivedWorld(world, scoped))
  })
}

export function profiledContributions(
  contributions: SolverContributions,
  measure: ComputationProfiler,
): SolverContributions {
  return {
    ...contributions,
    solver_input: contributions.solver_input?.map((input) => ({
      ...input,
      build: (world) => measure(`solver.input:${input.id}`, () => input.build(world)),
    })),
    preflight_checks: contributions.preflight_checks?.map((check) => ({
      ...check,
      run: (input, config) => measure(`solver.check:${check.id}`, () => check.run(input, config)),
    })),
    stages: contributions.stages?.map((stage) => ({
      ...stage,
      run: (input, outputs, config) =>
        measure(`solver.stage:${stage.id}`, () => stage.run(input, outputs, config)),
    })),
  }
}

export function profiledAttention(profile: OccasionProfile, measure: ComputationProfiler) {
  const wrap = (check: AttentionCheck): AttentionCheck => ({
    ...check,
    collect: (context) => measure(`attention.check:${check.code}`, () => check.collect(context)),
  })
  const evaluator = composeAttention(
    coreProfileAttentionChecks.map(wrap),
    profile.modules.map((module) => ({
      ...module,
      contributions: {
        ...module.contributions,
        attention_checks: module.contributions.attention_checks?.map(wrap),
      },
    })),
  )
  return (context: Parameters<typeof evaluator>[0]) =>
    measure('attention.evaluate', () => evaluator(context))
}
