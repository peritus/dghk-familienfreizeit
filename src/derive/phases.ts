import { attentionBlockers } from '../attention/selectors.js'
import type { AttentionResult } from '../attention/types.js'
import type { ProfileMeta, ProfileModule } from '../config/define.js'
import { declaredPhases, type AreaId, type PhaseReadinessResult } from '../config/phases.js'
import type { AreaClosing, World } from '../events/fold.js'
import type { Plan } from '../solver/types.js'

export type PhaseStatus = 'upcoming' | 'open' | 'late' | 'closed'

/** The derived status of one phase (spec/architecture/phases.md §3). */
export type PhaseView = {
  phase: string
  area: AreaId
  status: PhaseStatus
  target_at: string | null
  readiness: PhaseReadinessResult
  /** The area's latest closing, whether or not it has been reopened since. */
  closed: { seq: number; at: string } | null
}

export type PhaseViewInput = {
  modules: readonly ProfileModule[]
  meta: Pick<ProfileMeta, 'phase_dates'>
  world: World
  /** Request time from the Worker, or browser time in the organiser application. */
  now: string
  /** The current plan; readiness that depends on it is not ready while it is absent. */
  plan: Plan | null
  attention?: AttentionResult
}

/**
 * Derives every declared phase's status from the folded phase facts, the profile dates, and an
 * explicit `now`. It runs after `derive`, which stays clock-free (D15, D26).
 */
export function derivePhaseStatus(input: Omit<PhaseViewInput, 'plan' | 'attention'>): readonly PhaseView[] {
  const now = utcInstant(input.now)
  return [...declaredPhases(input.modules).values()].map((phase) => {
    const area = input.world.phase_facts.areas[phase.area]
    const opened =
      phase.opens.kind === 'always' || input.world.phase_facts.opened[phase.id] !== undefined
    const closed = phase.closed_by_area && area?.latest?.kind === 'closed'
    const targetAt = phase.target
      ? (input.meta.phase_dates?.find(({ phase: id }) => id === phase.id)?.target_at ?? null)
      : null
    const status: PhaseStatus = closed
      ? 'closed'
      : !opened
        ? 'upcoming'
        : targetAt !== null && now > utcInstant(targetAt)
          ? 'late'
          : 'open'
    const latestClosing = area?.closings.at(-1)
    return {
      phase: phase.id,
      area: phase.area,
      status,
      target_at: targetAt,
      readiness: { ready: true },
      closed: latestClosing ? { seq: latestClosing.seq, at: latestClosing.at } : null,
    }
  })
}

/** Status precedes attention; readiness selects its explicit operation policy. */
export function derivePhaseView(input: PhaseViewInput): readonly PhaseView[] {
 return derivePhaseStatus(input).map(view => {
  const definition = declaredPhases(input.modules).get(view.phase)!
  if (!definition.readiness) return view
  if (!input.attention) return { ...view, readiness: definition.readiness({world: input.world,plan: input.plan}) }
  const blockers = attentionBlockers(input.attention,view.area === 'accommodation' ? 'close-accommodation' : 'close-workshops')
  return { ...view, readiness: blockers.length ? { ready: false as const, findings: blockers.map(item=>({id:item.id,subject_id:item.subjects[0]?.id??null,message:item.wording.detail})) } : { ready: true as const } }
 })
}

/**
 * Normalises a UTC instant (`…Z`, with or without milliseconds) to one fixed-width form, so
 * instants compare as strings without a clock read in this pure module.
 */
export function utcInstant(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,3})?Z$/.exec(value)
  if (!match) throw new Error(`not a UTC instant: ${value}`)
  return `${match[1]}${(match[2] ?? '.').padEnd(4, '0')}Z`
}

/** Whether a phase activates its features: it is open or late (phases.md §2). */
export function phaseActivation(view: readonly PhaseView[]): (phase: string) => boolean {
  const active = new Set(
    view.filter(({ status }) => status === 'open' || status === 'late').map(({ phase }) => phase),
  )
  return (phase) => active.has(phase)
}

/** The derived state of one area: whether it is closed, and its recorded closings. */
export type AreaView = {
  area: AreaId
  closed: boolean
  closings: readonly AreaClosing[]
}

export function deriveAreaView(world: World, area: AreaId): AreaView {
  const facts = world.phase_facts.areas[area]
  return {
    area,
    closed: facts?.latest?.kind === 'closed',
    closings: facts?.closings ?? [],
  }
}
