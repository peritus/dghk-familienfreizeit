import { z } from 'zod'
import type { ClosedResultChange, ClosedResultContribution } from '../../config/phases.js'
import type { ValidationWorld } from '../../events/fold.js'
import type { JsonValue } from '../../events/types.js'
import type { RoomAssignmentSection } from './index.js'

const id = z.string().min(1)

/** The solver-output slice an accommodation closing records, without its revisions. */
const accommodationResult = z.object({
  placements: z.array(z.object({ family_id: id, room_id: id, place_ids: z.array(id) }).strict()),
  unplaced: z.array(z.object({ family_id: id }).strict()),
})

const storedAccommodationClosed = accommodationResult
  .extend({ build_revision: id, compatibility_revision: z.number().int().positive() })
  .strict()

export type AccommodationClosedPayload = z.infer<typeof storedAccommodationClosed>

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
 * `AccommodationClosed` is staged with an empty payload; the Worker fills the stored form on
 * apply (spec/architecture/phases.md §5). The log holds only the stored form.
 */
export const accommodationClosedPayload = z.preprocess(
  fromFixture,
  z.union([z.object({}).strict(), storedAccommodationClosed]),
)

export const accommodationReopenedPayload = z.object({}).strict()

/**
 * The result fields of a stored closing or of a computed candidate, or null for a closing still
 * pending its Worker fill.
 */
export function accommodationClosedResult(
  payload: JsonValue | null,
): z.infer<typeof accommodationResult> | null {
  const parsed = accommodationResult.safeParse(payload)
  return parsed.success ? parsed.data : null
}

export function validateAccommodationReopened(world: ValidationWorld): string | null {
  return world.areaClosed('accommodation') ? null : 'the accommodation area is not closed'
}

/** The accommodation area's closed-result contract. */
export const accommodationClosedResultContribution: ClosedResultContribution = {
  area: 'accommodation',
  close_event: 'AccommodationClosed',
  reopen_event: 'AccommodationReopened',
  compute: ({ world, plan }) => {
    const section = plan.sections['room-assignment'] as RoomAssignmentSection | undefined
    const places = new Map<string, { family_id: string; room_id: string; place_ids: string[] }>()
    for (const assignment of section?.assignments ?? []) {
      const key = `${assignment.family_id}\u0000${assignment.room_id}`
      const entry = places.get(key) ?? {
        family_id: assignment.family_id,
        room_id: assignment.room_id,
        place_ids: [],
      }
      if (assignment.place_id !== null) entry.place_ids.push(assignment.place_id)
      places.set(key, entry)
    }
    return {
      placements: [...places.values()]
        .map((entry) => ({ ...entry, place_ids: [...entry.place_ids].sort() }))
        .sort(
          (left, right) =>
            left.family_id.localeCompare(right.family_id) ||
            left.room_id.localeCompare(right.room_id),
        ),
      unplaced: [
        ...new Set([
          ...(section?.unplaced ?? []).map((entry) => entry.family_id),
          ...world.families
            .filter((f) => !(section?.assignments ?? []).some((a) => a.family_id === f.id))
            .map((f) => f.id),
        ]),
      ]
        .sort()
        .map((familyId) => ({ family_id: familyId })),
    }
  },
  compare: (before, after) => {
    const previous = accommodationClosedResult(before),
      next = accommodationClosedResult(after)
    const ids = [
      ...new Set([
        ...(previous?.placements ?? []).map((p) => p.family_id),
        ...(next?.placements ?? []).map((p) => p.family_id),
        ...(previous?.unplaced ?? []).map((p) => p.family_id),
        ...(next?.unplaced ?? []).map((p) => p.family_id),
      ]),
    ].sort()
    const changes: ClosedResultChange[] = []
    for (const family of ids) {
      const was = (previous?.placements ?? []).filter((p) => p.family_id === family),
        is = (next?.placements ?? []).filter((p) => p.family_id === family)
      const oldRooms = was.map((p) => p.room_id).sort(),
        newRooms = is.map((p) => p.room_id).sort()
      const oldPlaces = was.flatMap((p) => p.place_ids).sort(),
        newPlaces = is.flatMap((p) => p.place_ids).sort()
      const oldUnplaced = previous?.unplaced.some((p) => p.family_id === family) ?? false,
        newUnplaced = next?.unplaced.some((p) => p.family_id === family) ?? false
      for (const [aspect, oldValue, newValue] of [
        ['room', oldRooms, newRooms],
        ['places', oldPlaces, newPlaces],
        ['unplaced', oldUnplaced, newUnplaced],
      ] as const) {
        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue
        changes.push({
          kind:
            Array.isArray(oldValue) && oldValue.length === 0
              ? 'added'
              : Array.isArray(newValue) && newValue.length === 0
                ? 'removed'
                : before === null
                  ? 'added'
                  : 'moved',
          subject_id: family,
          family_id: family,
          aspect,
          before: aspect === 'room' ? oldRooms.join(', ') || null : null,
          after: aspect === 'room' ? newRooms.join(', ') || null : null,
          before_value: oldValue,
          after_value: newValue,
          affected_family_ids: [family],
        })
      }
    }
    return { changes, affected_family_ids: [...new Set(changes.map((c) => c.subject_id))].sort() }
  },
}
