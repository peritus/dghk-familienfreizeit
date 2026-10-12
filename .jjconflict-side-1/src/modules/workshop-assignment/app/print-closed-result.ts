import { canonical } from '../../../attention/engine.js'
import { workshopsClosedResultContribution } from '../closed-result.js'
import { derive } from '../../../events/fold.js'
import type { Event } from '../../../events/types.js'
import type { OccasionProfile } from '../../../config/define.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../../solver/index.js'
import type { Plan } from '../../../solver/types.js'
import type { JsonValue } from '../../../events/types.js'
import type { WorkshopSchedulingSection } from '../../workshop-scheduling/index.js'
import { workshopsClosedResult } from '../closed-result.js'
import type { WorkshopAssignmentSection } from '../index.js'

/**
 * The current plan with the workshop sections replaced by a closed result, so printed lists
 * match what families see (spec/architecture/phases.md §7). Descriptors, sign-ups, and interest
 * stay live; ranks and reasons come only from a verified closing-prefix replay.
 */
export function planWithWorkshopsClosedResult<
  P extends { sections: Readonly<Record<string, unknown>> },
>(plan: P, payload: JsonValue, historical: P | null = null): P {
  const result = workshopsClosedResult(payload)
  if (!result) return plan
  const scheduling = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection | undefined
  const attendance = historical?.sections['workshop-assignment'] as
    | WorkshopAssignmentSection
    | undefined
  const slots = new Map(
    result.placements.map((placement) => [placement.workshop_id, placement.slot_id]),
  )
  const current = new Map(
    (attendance?.assignments ?? []).map((entry) => [
      `${entry.person_id}\u0000${entry.workshop_id}`,
      entry,
    ]),
  )
  return {
    ...plan,
    sections: {
      ...plan.sections,
      'workshop-scheduling': { ...scheduling, placements: result.placements },
      'workshop-assignment': {
        ...(plan.sections['workshop-assignment'] as WorkshopAssignmentSection | undefined),
        assignments: result.attendance.map((entry) => {
          const known = current.get(`${entry.person_id}\u0000${entry.workshop_id}`)
          return {
            person_id: entry.person_id,
            workshop_id: entry.workshop_id,
            slot_id: slots.get(entry.workshop_id) ?? known?.slot_id ?? '',
            rank: known?.rank ?? null,
            reason: known?.reason ?? 'ranked',
            explanation_available: known !== undefined,
          }
        }),
        unassigned: result.unassigned.map((entry) => ({
          person_id: entry.person_id,
          workshop_id: null,
          reason:
            attendance?.unassigned.find(({ person_id: personId }) => personId === entry.person_id)
              ?.reason ?? 'closed-explanation-unavailable',
        })),
      },
    },
  }
}

/** Verify a closing-prefix replay before lending its explanations to historical print. */
export function closingExplanationPlan(
  events: readonly Event[],
  seq: number,
  payload: JsonValue,
  profile: OccasionProfile,
  revisions: { build_revision: string; compatibility_revision: number },
): Plan | null {
  try {
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      payload.build_revision !== revisions.build_revision ||
      payload.compatibility_revision !== revisions.compatibility_revision
    )
      return null
    const prefix = events.filter((e) => e.seq < seq),
      world = derive(prefix, profile.validation_view),
      contributions = composeSolverContributions(profile)
    const plan = solve(buildSolverInput(world, contributions), contributions, {
      ...revisions,
      event_date: profile.meta.starts_on,
      profile,
      seed: null,
    })
    const stored = workshopsClosedResult(payload)
    return stored &&
      canonical(workshopsClosedResultContribution.compute({ world, plan })) === canonical(stored)
      ? plan
      : null
  } catch {
    return null
  }
}
