import type { ProfileModule } from '../../config/define.js'
import {
  closedResults,
  type AreaId,
  type ClosedResultContribution,
  type ClosedResultDifference,
  type FindingRef,
} from '../../config/phases.js'
import type { PhaseView } from '../../derive/phases.js'
import type { World } from '../../events/fold.js'
import type { JsonValue } from '../../events/types.js'
import type { Plan } from '../../solver/types.js'

/** Everything an organiser screen needs to review, close, or compare one area (phases.md §7). */
export type ClosedAreaState = {
  area: AreaId
  contribution: ClosedResultContribution
  closed: boolean
  /** A staged closing whose result the Worker has not filled in yet. */
  pending: boolean
  /** The latest recorded result and when it was recorded, or null before the first closing. */
  latest: { seq: number; at: string; payload: JsonValue } | null
  /** The result the current derivation would record. */
  candidate: Readonly<Record<string, JsonValue>> | null
  /** The candidate compared with the latest recorded result (or with nothing). */
  difference: ClosedResultDifference | null
  /** Findings of the area's review phases that block closing. */
  blocking: readonly FindingRef[]
}

const isRecorded = (payload: JsonValue): boolean =>
  payload !== null &&
  typeof payload === 'object' &&
  !Array.isArray(payload) &&
  Object.keys(payload).length > 0

export function closedAreaState(input: {
  modules: readonly ProfileModule[]
  world: World
  plan: Plan | null
  phases: readonly PhaseView[]
  area: AreaId
}): ClosedAreaState | null {
  const contribution = closedResults(input.modules).get(input.area)
  if (!contribution) return null
  const facts = input.world.phase_facts.areas[input.area]
  const closings = facts?.closings ?? []
  const recorded = closings.filter(({ payload }) => isRecorded(payload))
  const last = recorded.at(-1)
  const candidate = input.plan
    ? contribution.compute({ world: input.world, plan: input.plan })
    : null
  return {
    area: input.area,
    contribution,
    closed: facts?.latest?.kind === 'closed',
    pending: closings.length > 0 && !isRecorded(closings.at(-1)!.payload),
    latest: last ? { seq: last.seq, at: last.at, payload: last.payload } : null,
    candidate,
    difference: candidate
      ? contribution.compare(last?.payload ?? null, candidate, input.world)
      : null,
    blocking: input.phases
      .filter(({ area }) => area === input.area)
      .flatMap(({ readiness }) => (readiness.ready ? [] : readiness.findings)),
  }
}

/** A readable name for a person, family, workshop, or room id, falling back to the id. */
export function subjectName(world: World, id: string | null): string {
  if (!id) return '—'
  const labels = world.labels_by_entity[id] ?? []
  const value = (key: string) => {
    const found = labels.find((label) => label.key === key)?.value
    return typeof found === 'string' || typeof found === 'number' ? String(found) : null
  }
  const person = [value('given-name'), value('family-name')].filter(Boolean).join(' ')
  return value('display-name') ?? value('title') ?? (person || null) ?? value('number') ?? id
}
