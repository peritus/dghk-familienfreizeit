import type { ProfileModule, OccasionProfile } from '../config/define.js'
import { closedResults, declaredPhases, type FindingRef } from '../config/phases.js'
import type { Event, EventDraft, JsonValue } from '../events/types.js'
import { prepareEventBatch } from '../events/prepare.js'
import { buildSolverInput, composeSolverContributions, solve } from '../solver/index.js'

/** A closing the Worker refuses because the area's review phase is not ready. */
export class AreaNotReadyError extends Error {
  constructor(
    public readonly area: string,
    public readonly findings: readonly FindingRef[],
  ) {
    super(`area ${area} is not ready to close`)
  }
}

/** A closing whose client supplied a result; only the Worker produces it (D16). */
export class ClosingPayloadSuppliedError extends Error {
  constructor(public readonly type: string) {
    super(`${type} must be staged without a payload`)
  }
}

/** The closing event types of the selected modules, mapped to their area. */
export function closingEventAreas(modules: readonly ProfileModule[]): ReadonlyMap<string, string> {
  return new Map(
    [...closedResults(modules).values()].map((result) => [result.close_event, result.area]),
  )
}

const isEmptyPayload = (payload: JsonValue): boolean =>
  payload !== null &&
  typeof payload === 'object' &&
  !Array.isArray(payload) &&
  Object.keys(payload).length === 0

/**
 * Fills every staged closing in an organiser batch with the area's solver-output slice
 * (spec/architecture/phases.md §5). Each closing is computed from the world after the committed
 * log and the batch's preceding events — the head the organiser reviewed, since the caller has
 * already refused a stale head — and refused while the area's review phase is not ready.
 */
export function fillClosingPayloads(
  committed: readonly Event[],
  drafts: readonly EventDraft[],
  profile: OccasionProfile,
  revisions: { build_revision: string; compatibility_revision: number },
): EventDraft[] {
  const areas = closingEventAreas(profile.modules)
  const results = closedResults(profile.modules)
  const filled: EventDraft[] = []
  for (const draft of drafts) {
    const area = areas.get(draft.type)
    if (!area) {
      filled.push(draft)
      continue
    }
    if (!isEmptyPayload(draft.payload)) throw new ClosingPayloadSuppliedError(draft.type)
    const { world } = prepareEventBatch(committed, filled, profile.validation_view)
    const contributions = composeSolverContributions(profile)
    const plan = solve(buildSolverInput(world, contributions), contributions, {
      ...revisions,
      event_date: profile.meta.starts_on,
      profile,
      seed: null,
    })
    const findings = [...declaredPhases(profile.modules).values()]
      .filter((phase) => phase.area === area && phase.readiness)
      .flatMap((phase) => {
        const readiness = phase.readiness!({ world, plan })
        return readiness.ready ? [] : readiness.findings
      })
    if (findings.length > 0) throw new AreaNotReadyError(area, findings)
    const result = results.get(area as Parameters<typeof results.get>[0])!
    filled.push({ ...draft, payload: { ...result.compute({ world, plan }), ...revisions } })
  }
  return filled
}
