import type { JsonValue } from '../../../events/types.js'
import type { WorkshopSchedulingSection } from '../../workshop-scheduling/index.js'
import { workshopsClosedResult } from '../closed-result.js'
import type { WorkshopAssignmentSection } from '../index.js'

/**
 * The current plan with the workshop sections replaced by a closed result, so printed lists
 * match what families see (spec/architecture/phases.md §7). Descriptors, sign-ups, and interest
 * stay live; ranks and reasons are kept where the current plan still agrees.
 */
export function planWithWorkshopsClosedResult<
  P extends { sections: Readonly<Record<string, unknown>> },
>(plan: P, payload: JsonValue): P {
  const result = workshopsClosedResult(payload)
  if (!result) return plan
  const scheduling = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection | undefined
  const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection | undefined
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
        ...attendance,
        assignments: result.attendance.map((entry) => {
          const known = current.get(`${entry.person_id}\u0000${entry.workshop_id}`)
          return {
            person_id: entry.person_id,
            workshop_id: entry.workshop_id,
            slot_id: slots.get(entry.workshop_id) ?? known?.slot_id ?? '',
            rank: known?.rank ?? null,
            reason: known?.reason ?? 'ranked',
          }
        }),
        unassigned: result.unassigned.map((entry) => ({
          person_id: entry.person_id,
          workshop_id: null,
          reason:
            attendance?.unassigned.find(({ person_id: personId }) => personId === entry.person_id)
              ?.reason ?? 'Im festgelegten Ergebnis ohne Workshop.',
        })),
      },
    },
  }
}
