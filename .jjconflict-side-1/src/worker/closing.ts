import { profileAttention } from '../attention/profile.js'
import { attentionBlockers, acknowledgementFingerprint } from '../attention/selectors.js'
import type { AttentionItem } from '../attention/types.js'
import type { ProfileModule, OccasionProfile } from '../config/define.js'
import { closedResults } from '../config/phases.js'
import type { Event, EventDraft, JsonValue } from '../events/types.js'
import { prepareEventBatch } from '../events/prepare.js'
import { buildSolverInput, composeSolverContributions, solve } from '../solver/index.js'

/** A closing the Worker refuses because the area's review phase is not ready. */
export class AreaNotReadyError extends Error {
  constructor(
    public readonly area: string,
    public readonly findings: readonly AttentionItem[],
  ) {
    super(`area ${area} is not ready to close`)
  }
}

export class WorkshopReviewRequiredError extends Error {
  constructor(public readonly findings: readonly AttentionItem[]) {
    super('workshop advisory acknowledgement required')
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
  for (const [index, draft] of drafts.entries()) {
    if (
      draft.type === 'WorkshopWarningsAcknowledged' &&
      drafts[index + 1]?.type !== 'WorkshopsClosed'
    )
      throw new WorkshopReviewRequiredError([])
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
    const attention=profileAttention(profile)({domain:'available',world,plan,profile,build_revision:revisions.build_revision,locale:profile.meta.locale,now:draft.at,audience:'organiser'})
    const blockers=attentionBlockers(attention,area==='accommodation'?'close-accommodation':'close-workshops')
    const findings=blockers
    if (findings.length > 0) throw new AreaNotReadyError(area, findings)
    if (area === 'workshops') {
      const advisories=attention.items.filter(item=>item.acknowledgement!==null)
      const previous = drafts[index - 1]
      const fingerprint =
        previous?.payload &&
        typeof previous.payload === 'object' &&
        !Array.isArray(previous.payload)
          ? (previous.payload as Record<string, JsonValue>)['fingerprint']
          : undefined
      if (
        advisories.length &&
        (previous?.type !== 'WorkshopWarningsAcknowledged' ||
          fingerprint !== acknowledgementFingerprint(attention))
      )
        throw new WorkshopReviewRequiredError(advisories)
    }
    const result = results.get(area as Parameters<typeof results.get>[0])!
    filled.push({ ...draft, payload: { ...result.compute({ world, plan }), ...revisions } })
  }
  return filled
}
