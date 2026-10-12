import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { prepareEventBatch } from '../../src/events/prepare.js'
import { buildSolverInput } from '../../src/solver/input.js'
import { composeSolverContributions } from '../../src/solver/composition.js'
import { solve } from '../../src/solver/solve.js'
import { profileAttention } from '../../src/attention/profile.js'
import { acknowledgementFingerprint } from '../../src/attention/selectors.js'
import { fillClosingPayloads } from '../../src/worker/closing.js'
import type { RoomAssignmentSection } from '../../src/modules/room-assignment/index.js'
import type { WorkshopAssignmentSection } from '../../src/modules/workshop-assignment/index.js'
import type { WorkshopSchedulingSection } from '../../src/modules/workshop-scheduling/index.js'
import type { Event, EventDraft } from '../../src/events/types.js'
import type { lifecycleLog, LifecycleAction } from './lifecycle.js'

export const lifecycleSolverConfig = {
  profile,
  build_revision: 'bench',
  compatibility_revision: 1,
  event_date: profile.meta.starts_on,
  seed: null,
}

export function allocationObservations(events: readonly Event[]) {
  const world = derive(events, profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const input = buildSolverInput(world, contributions)
  const plan = solve(input, contributions, lifecycleSolverConfig)
  const rooms = plan.sections['room-assignment'] as RoomAssignmentSection
  const workshops = plan.sections['workshop-assignment'] as WorkshopAssignmentSection
  const scheduling = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection
  const counts = new Map<string, number>()
  for (const row of workshops.assignments)
    counts.set(row.person_id, (counts.get(row.person_id) ?? 0) + 1)
  const eligible = (world.entities_by_kind.person ?? []).filter(
    (person) =>
      !(world.labels_by_entity[person.id] ?? []).some(
        (label) => label.key === 'role' && label.value === 'infant',
      ),
  )
  const roomCounts = new Map<string, number>()
  for (const row of rooms.assignments)
    if (row.place_id) roomCounts.set(row.family_id, (roomCounts.get(row.family_id) ?? 0) + 1)
  const roomInput = input.module_inputs['room-assignment'] as {
    families: readonly { family_id: string; bed_demand: number }[]
  }
  return {
    world,
    plan,
    observations: {
      unplaced_families: rooms.unplaced.length,
      shortfall_places: roomInput.families.reduce(
        (sum, family) =>
          sum + Math.max(0, family.bed_demand - (roomCounts.get(family.family_id) ?? 0)),
        0,
      ),
      unscheduled_workshops: scheduling.unscheduled.length,
      underassigned_people: eligible.filter((person) => (counts.get(person.id) ?? 0) < 2).length,
      assigned_workshop_places: workshops.assignments.length,
    },
  }
}

/** Real solver-produced closing payloads; reopen for the measured edit/append paths. */
export function completeLifecycle(fixture: ReturnType<typeof lifecycleLog>) {
  const original = allocationObservations(fixture.events)
  const events = fixture.events.slice()
  const closingActions: LifecycleAction[] = []
  let closingEvents = 0
  let closingBytes = 0
  const complete = [
    'unplaced_families',
    'shortfall_places',
    'unscheduled_workshops',
    'underassigned_people',
  ].every((key) => original.observations[key as keyof typeof original.observations] === 0)
  if (complete) {
    const draft = (type: string, payload: EventDraft['payload'] = {}): EventDraft => ({
      type,
      payload,
      actor: 'organiser@example.test',
      at: '2027-04-01T00:00:00Z',
      subject: null,
    })
    const append = (drafts: readonly EventDraft[]) => {
      const batch = prepareEventBatch(events, drafts, profile.validation_view).events
      closingActions.push({ phase: 'closing', first_seq: events.length + 1, count: batch.length })
      events.push(...batch)
      closingEvents += batch.length
      closingBytes += new TextEncoder().encode(JSON.stringify(batch)).byteLength
    }
    append(
      fillClosingPayloads(events, [draft('AccommodationClosed')], profile, {
        build_revision: 'bench',
        compatibility_revision: 1,
      }),
    )
    const { world, plan } = allocationObservations(events)
    const attention = profileAttention(profile)({
      domain: 'available',
      world,
      plan,
      profile,
      build_revision: 'bench',
      locale: profile.meta.locale,
      now: '2027-04-01T00:00:00Z',
      audience: 'organiser',
    })
    const acknowledgements = attention.items.some((item) => item.acknowledgement !== null)
      ? [
          draft('WorkshopWarningsAcknowledged', {
            fingerprint: acknowledgementFingerprint(attention),
          }),
        ]
      : []
    append(
      fillClosingPayloads(events, [...acknowledgements, draft('WorkshopsClosed')], profile, {
        build_revision: 'bench',
        compatibility_revision: 1,
      }),
    )
    append([draft('AccommodationReopened'), draft('WorkshopsReopened')])
  }
  return {
    ...fixture,
    events,
    actions: [...fixture.actions, ...closingActions],
    phaseCounts: { ...fixture.phaseCounts, closing: closingEvents },
    scale: {
      ...fixture.scale,
      log_bytes: new TextEncoder().encode(JSON.stringify(events)).byteLength,
      closing_events: closingEvents,
      actions: fixture.actions.length + closingActions.length,
    },
    observations: {
      ...original.observations,
      closing_events: closingEvents,
      closing_bytes: closingBytes,
      lifecycle_closed: complete ? 1 : 0,
    },
  }
}
