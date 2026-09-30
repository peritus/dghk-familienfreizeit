import { derive, type KernelConfig } from '../events/fold.js'
import type { Event } from '../events/types.js'
import { buildSolverInput } from './input.js'
import { solve } from './solve.js'
import type { Plan, PlanDiff, SolverConfig, SolverContributions } from './types.js'

export function deriveTransition(
  baseEvents: readonly Event[],
  prospectiveEvents: readonly Event[],
  contributions: SolverContributions,
  config: SolverConfig,
): { before: Plan; after: Plan; diff: PlanDiff } {
  const validationView = (config.profile as { validation_view: KernelConfig }).validation_view
  const beforeWorld = derive(baseEvents, validationView)
  const afterWorld = derive(prospectiveEvents, validationView)
  const before = solve(buildSolverInput(beforeWorld, contributions), contributions, config)
  const after = solve(buildSolverInput(afterWorld, contributions, before), contributions, config)
  return { before, after, diff: diffPlans(before, after) }
}

export function diffPlans(before: Plan, after: Plan): PlanDiff {
  const beforeAssignments = assignments(before)
  const afterAssignments = assignments(after)
  const subjects = [...new Set([...beforeAssignments.keys(), ...afterAssignments.keys()])].sort()
  const changes: PlanDiff['changes'][number][] = []
  for (const subject of subjects) {
    const previous = beforeAssignments.get(subject)
    const current = afterAssignments.get(subject)
    if ((previous?.room_id ?? null) !== (current?.room_id ?? null))
      changes.push({
        kind: 'room-changed',
        subject,
        before: previous?.room_id,
        after: current?.room_id,
        reason: current ? 'placement changed' : 'placement removed',
      })
    else if ((previous?.place_id ?? null) !== (current?.place_id ?? null))
      changes.push({
        kind: 'place-changed',
        subject,
        before: previous?.place_id ?? undefined,
        after: current?.place_id ?? undefined,
        reason: 'place changed within the room',
      })
  }
  return { changes: Object.freeze(changes) }
}

type Assignment = { room_id: string; place_id: string | null }

function assignments(plan: Plan): Map<string, Assignment> {
  const section = plan.sections['room-assignment'] as
    | { assignments?: readonly { person_id: string; room_id: string; place_id: string | null }[] }
    | undefined
  return new Map(
    (section?.assignments ?? []).map(
      ({ person_id: personId, room_id: roomId, place_id: placeId }) => [
        personId,
        { room_id: roomId, place_id: placeId },
      ],
    ),
  )
}
