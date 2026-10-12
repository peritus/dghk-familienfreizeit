import type { World } from '../events/fold.js'
import type { JsonValue } from '../events/types.js'
import type { Plan } from '../solver/types.js'

/** The parts of an occasion whose solver result is closed as a whole (phases.md §1). */
export const areaIds = ['accommodation', 'workshops'] as const

export type AreaId = (typeof areaIds)[number]

/** One finding that keeps a phase's outcome from being produced now. */
export type FindingRef = {
  id: string
  subject_id: string | null
  message: string
}

export type PhaseReadinessResult =
  | { ready: true }
  | { ready: false; findings: readonly FindingRef[] }

/** Module-owned, pure readiness over the derived world and the current plan (phases.md §2). */
export type PhaseReadiness = (context: { world: World; plan: Plan | null }) => PhaseReadinessResult

/** A typed, module-owned lifecycle context (spec/architecture/phases.md §2). */
export type PhaseDefinition = {
  id: string
  area: AreaId
  opens: { kind: 'always' } | { kind: 'event'; event: string }
  /** Whether the profile may set a Zieltermin for the phase. */
  target: boolean
  /** Whether the area's closing ends the phase. */
  closed_by_area: boolean
  readiness?: PhaseReadiness
}

/** One advisory target date from the profile (phases.md §2, "Profile dates"). */
export type PhaseDate = {
  phase: string
  target_at: string
}

export type DeclaredPhase = PhaseDefinition & { owner: string }

type PhaseModule = {
  id: string
  contributions: {
    phases?: readonly PhaseDefinition[]
    events?: readonly { type: string }[]
  }
}

/** Every phase declared by the selected modules, keyed by id, in module order. */
export function declaredPhases(
  modules: readonly Pick<PhaseModule, 'id' | 'contributions'>[],
): ReadonlyMap<string, DeclaredPhase> {
  return new Map(
    modules.flatMap((module) =>
      (module.contributions.phases ?? []).map(
        (phase) => [phase.id, { ...phase, owner: module.id }] as const,
      ),
    ),
  )
}

/** Validates phase contributions and the profile's phase dates at profile build (phases.md §2). */
export function validatePhases(
  modules: readonly PhaseModule[],
  phaseDates: readonly PhaseDate[],
): void {
  const seen = new Set<string>()
  for (const module of modules)
    for (const phase of module.contributions.phases ?? []) {
      if (seen.has(phase.id)) throw new Error(`duplicate contribution: phase:${phase.id}`)
      seen.add(phase.id)
      const [owner, name, ...rest] = phase.id.split('.')
      if (owner !== module.id || !name || rest.length > 0 || !kebab(name))
        throw new Error(`phase ${phase.id} must be named ${module.id}.<kebab-case>`)
      if (!(areaIds as readonly string[]).includes(phase.area))
        throw new Error(`phase ${phase.id} names unknown area ${phase.area}`)
      const opens = phase.opens
      if (
        opens.kind === 'event' &&
        !(module.contributions.events ?? []).some(({ type }) => type === opens.event)
      )
        throw new Error(
          `phase ${phase.id} opens by ${opens.event}, which ${module.id} does not define`,
        )
    }
  const phases = declaredPhases(modules)
  const dated = new Set<string>()
  for (const date of phaseDates) {
    const phase = phases.get(date.phase)
    if (!phase) throw new Error(`phase date names undeclared phase ${date.phase}`)
    if (!phase.target) throw new Error(`phase ${date.phase} does not accept a target date`)
    if (dated.has(date.phase)) throw new Error(`phase ${date.phase} has two target dates`)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(date.target_at))
      throw new Error(`phase ${date.phase} target date is not a UTC instant: ${date.target_at}`)
    dated.add(date.phase)
  }
}

function kebab(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
}

/** One family-attributed change between two closed results, or a closed result and the plan. */
export type ClosedResultChange = {
  aspect?: 'room' | 'places' | 'unplaced' | 'attendance' | 'placement' | 'unassigned'
  before_value?: JsonValue
  after_value?: JsonValue
  affected_family_ids?: readonly string[]
  family_unknown?: boolean
  kind: 'added' | 'removed' | 'moved'
  /** The person or family whose arrangement changed. */
  subject_id: string
  family_id: string | null
  /** The workshop, room, or slot before and after the change. */
  before: string | null
  after: string | null
}

export type ClosedResultDifference = {
  changes: readonly ClosedResultChange[]
  affected_family_ids: readonly string[]
}

/**
 * An area-owning module's closed-result contract (spec/modules/contract.md §3.1): its closing
 * and reopening events, the stored payload schema, the pure accessor that computes the payload
 * from the current plan, and the canonical comparison used for differences.
 */
export type ClosedResultContribution = {
  area: AreaId
  close_event: string
  reopen_event: string
  /** Computes the solver-output slice, ids only and in canonical order, without revisions. */
  compute: (context: { world: World; plan: Plan }) => Readonly<Record<string, JsonValue>>
  /** Compares two payloads, attributing each change to its family through the world. */
  compare: (before: JsonValue | null, after: JsonValue, world: World) => ClosedResultDifference
}

type ClosedResultModule = {
  id: string
  contributions: {
    closed_results?: readonly ClosedResultContribution[]
    phases?: readonly PhaseDefinition[]
    events?: readonly { type: string }[]
  }
}

/** Every closed-result contribution of the selected modules, keyed by area. */
export function closedResults(
  modules: readonly Pick<ClosedResultModule, 'contributions'>[],
): ReadonlyMap<AreaId, ClosedResultContribution> {
  return new Map(
    modules.flatMap((module) =>
      (module.contributions.closed_results ?? []).map((result) => [result.area, result] as const),
    ),
  )
}

/**
 * Validates closed-result contributions: one owner per area and events of the owning module
 * (phases.md §2). An area that no selected module closes never closes.
 */
export function validateClosedResults(modules: readonly ClosedResultModule[]): void {
  const owners = new Map<string, string>()
  for (const module of modules)
    for (const result of module.contributions.closed_results ?? []) {
      const owner = owners.get(result.area)
      if (owner) throw new Error(`area ${result.area} is closed by both ${owner} and ${module.id}`)
      owners.set(result.area, module.id)
      for (const type of [result.close_event, result.reopen_event])
        if (!(module.contributions.events ?? []).some((event) => event.type === type))
          throw new Error(
            `closed result of ${result.area} names ${type}, which ${module.id} does not define`,
          )
    }
}
