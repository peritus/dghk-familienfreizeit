import { z } from 'zod'
import type { ClosedResultChange, ClosedResultContribution } from '../../config/phases.js'
import type { ValidationWorld, World } from '../../events/fold.js'
import type { JsonValue } from '../../events/types.js'
import type { WorkshopSchedulingSection } from '../workshop-scheduling/index.js'
import type { WorkshopAssignmentSection } from './index.js'

const id = z.string().min(1)

/** The solver-output slice a workshop closing records, without its revisions. */
const workshopsResult = z.object({
  placements: z.array(z.object({ workshop_id: id, slot_id: id, space_id: id }).strict()),
  attendance: z.array(z.object({ person_id: id, workshop_id: id }).strict()),
  unassigned: z.array(z.object({ person_id: id }).strict()),
})

const storedWorkshopsClosed = workshopsResult
  .extend({ build_revision: id, compatibility_revision: z.number().int().positive() })
  .strict()

export type WorkshopsClosedPayload = z.infer<typeof storedWorkshopsClosed>

type WorkshopsResult = z.infer<typeof workshopsResult>

/**
 * Text fixtures carry the structured closing result as one `result_json` property, because KDL
 * properties are flat scalars (D17). Every other source passes the payload object directly.
 */
function fromFixture(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const value = raw as Record<string, unknown>
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === 'result_json' && typeof value.result_json === 'string'
    ? (JSON.parse(value.result_json) as unknown)
    : raw
}

/**
 * `WorkshopsClosed` is staged with an empty payload; the Worker fills the stored form on apply
 * (spec/architecture/phases.md §5). The log holds only the stored form.
 */
export const workshopsClosedPayload = z.preprocess(
  fromFixture,
  z.union([z.object({}).strict(), storedWorkshopsClosed]),
)

export const workshopsReopenedPayload = z.object({}).strict()

/**
 * The result fields of a stored closing or of a computed candidate, or null for a closing still
 * pending its Worker fill.
 */
export function workshopsClosedResult(payload: JsonValue | null): WorkshopsResult | null {
  const parsed = workshopsResult.safeParse(payload)
  return parsed.success ? parsed.data : null
}

export function validateWorkshopsReopened(world: ValidationWorld): string | null {
  return world.areaClosed('workshops') ? null : 'the workshop area is not closed'
}

const byKeys =
  <T extends Readonly<Record<string, unknown>>>(...keys: readonly (keyof T)[]) =>
  (left: T, right: T): number => {
    for (const key of keys) {
      const order = String(left[key]).localeCompare(String(right[key]))
      if (order !== 0) return order
    }
    return 0
  }

function familyOf(world: World, personId: string): string | null {
  const member = (world.labels_by_entity[personId] ?? []).find(({ key }) => key === 'member-of')
  return typeof member?.value === 'string' ? member.value : null
}

/** The workshop area's closed-result contract. */
export const workshopsClosedResultContribution: ClosedResultContribution = {
  area: 'workshops',
  close_event: 'WorkshopsClosed',
  reopen_event: 'WorkshopsReopened',
  compute: ({ plan }) => {
    const scheduling = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection | undefined
    const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection | undefined
    return {
      placements: (scheduling?.placements ?? [])
        .map((placement) => ({
          workshop_id: placement.workshop_id,
          slot_id: placement.slot_id,
          space_id: placement.space_id,
        }))
        .sort(byKeys('workshop_id', 'slot_id', 'space_id')),
      attendance: (attendance?.assignments ?? [])
        .map((assignment) => ({
          person_id: assignment.person_id,
          workshop_id: assignment.workshop_id,
        }))
        .sort(byKeys('person_id', 'workshop_id')),
      unassigned: [...new Set((attendance?.unassigned ?? []).map((entry) => entry.person_id))]
        .sort()
        .map((personId) => ({ person_id: personId })),
    }
  },
  compare: (before, after, world) => {
    const previous = workshopsClosedResult(before)
    const next = workshopsClosedResult(after)
    const changes: ClosedResultChange[] = []
    const slotKeyed = (result: WorkshopsResult | null) => {
      const slots = new Map(
        result?.placements.map((placement) => [placement.workshop_id, placement.slot_id]),
      )
      return new Map(
        (result?.attendance ?? []).map((entry) => [
          `${entry.person_id}\u0000${slots.get(entry.workshop_id) ?? entry.workshop_id}`,
          entry,
        ]),
      )
    }
    const beforeAttendance = slotKeyed(previous)
    const afterAttendance = slotKeyed(next)
    for (const key of [
      ...new Set([...beforeAttendance.keys(), ...afterAttendance.keys()]),
    ].sort()) {
      const was = beforeAttendance.get(key)
      const is = afterAttendance.get(key)
      if (was?.workshop_id === is?.workshop_id) continue
      const personId = (is ?? was)!.person_id
      changes.push({
        kind: was && is ? 'moved' : is ? 'added' : 'removed',
        subject_id: personId,
        family_id: familyOf(world, personId),
        before: was?.workshop_id ?? null,
        after: is?.workshop_id ?? null,
      })
    }
    const placementOf = (result: WorkshopsResult | null) =>
      new Map(
        result?.placements.map((placement) => [
          placement.workshop_id,
          `${placement.slot_id}/${placement.space_id}`,
        ]),
      )
    const beforePlacements = placementOf(previous)
    const afterPlacements = placementOf(next)
    for (const workshopId of [
      ...new Set([...beforePlacements.keys(), ...afterPlacements.keys()]),
    ].sort()) {
      const was = beforePlacements.get(workshopId) ?? null
      const is = afterPlacements.get(workshopId) ?? null
      if (was === is) continue
      changes.push({
        kind: was && is ? 'moved' : is ? 'added' : 'removed',
        subject_id: workshopId,
        family_id: null,
        before: was,
        after: is,
      })
    }
    return {
      changes,
      affected_family_ids: [
        ...new Set(changes.flatMap((change) => (change.family_id ? [change.family_id] : []))),
      ].sort(),
    }
  },
}
