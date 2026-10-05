import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { defineOccasionProfile } from '../../src/config/define.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'
import {
  officialWorkshops,
  type OfficialWorkshopsSummary,
} from '../../src/modules/official-workshops/index.js'
import {
  workshopScheduling,
  type WorkshopSchedulingSection,
} from '../../src/modules/workshop-scheduling/index.js'
import { workshopSpace } from '../../src/modules/workshop-space/index.js'
import {
  workshopRankings,
  workshopRankingsWorld,
} from '../../src/modules/workshop-rankings/index.js'
import {
  workshopAssignment,
  type WorkshopAssignmentSection,
} from '../../src/modules/workshop-assignment/index.js'
import {
  buildWorkshopAllocationProjection,
  buildWorkshopAllocationTraceStages,
} from '../../src/modules/workshop-rankings/app/workshop-allocation-view.js'
import type { Plan, SolverInput } from '../../src/solver/types.js'

// Same module selection and parameters as the real familienfreizeit-2027
// profile's workshop modules (src/config/profiles/luebben-2027/index.ts),
// so this exercises the resolver against production configuration, not
// arbitrary test values.
const profile = defineOccasionProfile({
  meta: {
    id: 'workshop-prototype-dataset',
    name: 'Workshop prototype dataset',
    description: 'Full-scale dataset ported from the workshops HTML prototype',
    starts_on: '2027-05-14',
    ends_on: '2027-05-16',
    timezone: 'Europe/Berlin',
    locale: 'de',
    fallback_locale: 'en',
  },
  traits: {},
  modules: [
    workshopSpace({}),
    officialWorkshops({
      audience_values: ['children', 'adults', 'all'],
      available_modes: ['assigned', 'sign-up', 'interest'],
      excluded_roles: ['infant'],
    }),
    workshopScheduling({ placement_policy: 'automatic-with-fixed-decisions' }),
    workshopRankings({ ranking_trait: 'prefers-workshop', max_rank: 3, allow_no_preference: true }),
    workshopAssignment({
      workshops_per_person: 2,
      rank_weights: [3, 2, 1],
      max_repair_passes: 5,
    }),
  ],
})

const fixture = readFileSync(
  new URL('../fixtures/workshop-assignment/prototype-dataset.kdl', import.meta.url),
  'utf-8',
)

function solveFixture(previousPlan: Plan | null = null): {
  plan: Plan
  input: SolverInput
  world: ReturnType<typeof derive>
} {
  const world = derive(loadKdl(fixture, profile.validation_view), profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const input = buildSolverInput(world, contributions, previousPlan)
  const plan = solve(input, contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-05-14',
    profile,
    seed: null,
  })
  return { plan, input, world }
}

const assignmentKey = (section: WorkshopAssignmentSection) =>
  section.assignments.map((item) => `${item.person_id}|${item.workshop_id}|${item.slot_id}`).sort()

test('the resolver produces a constraint-valid, deterministic plan over the full prototype dataset', () => {
  const { plan, input, world } = solveFixture()
  const official = input.module_inputs['official-workshops'] as OfficialWorkshopsSummary
  const schedule = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection
  const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection

  // No fixed attendance decisions exist in this dataset (the prototype
  // never depicts that concept), so both stay empty.
  expect(attendance.fixed).toEqual([])
  expect(attendance.fixed_violations).toEqual([])
  expect(attendance.assignments.length).toBeGreaterThan(0)

  const workshopsById = new Map(official.workshops.map((workshop) => [workshop.id, workshop]))
  const placementsById = new Map(
    schedule.placements.map((placement) => [placement.workshop_id, placement]),
  )
  const rankingsByPerson = new Map(
    workshopRankingsWorld(world).rankings.map((ranking) => [ranking.person_id, ranking]),
  )
  const unscheduledIds = new Set(schedule.unscheduled.map(({ workshop_id: id }) => id))
  // 'wks_schmieden' needs 'Esse', which no room in the dataset provides —
  // it must come out unscheduled, exercising that this never crashes.
  expect(unscheduledIds.has('wks_schmieden')).toBe(true)

  const roleOf = (personId: string): unknown =>
    input.labels.find((label) => label.entity_id === personId && label.key === 'role')?.value

  // Never exceeds a workshop's own capacity.
  const countByWorkshop = new Map<string, number>()
  for (const assignment of attendance.assignments)
    countByWorkshop.set(
      assignment.workshop_id,
      (countByWorkshop.get(assignment.workshop_id) ?? 0) + 1,
    )
  for (const [workshopId, count] of countByWorkshop)
    expect(count).toBeLessThanOrEqual(workshopsById.get(workshopId)!.capacity)

  // Never places two assignments for the same person in the same slot.
  const slotsByPerson = new Map<string, Set<string>>()
  for (const assignment of attendance.assignments) {
    const slots = slotsByPerson.get(assignment.person_id) ?? new Set<string>()
    expect(slots.has(assignment.slot_id)).toBe(false)
    slots.add(assignment.slot_id)
    slotsByPerson.set(assignment.person_id, slots)
  }

  // Every assignment targets a workshop that actually exists, is not
  // cancelled, is in assigned mode, has a real schedule placement, and
  // matches the assignment's own recorded slot.
  for (const assignment of attendance.assignments) {
    const workshop = workshopsById.get(assignment.workshop_id)
    expect(workshop).toBeDefined()
    expect(workshop!.mode).toBe('assigned')
    expect(unscheduledIds.has(assignment.workshop_id)).toBe(false)
    expect(placementsById.get(assignment.workshop_id)?.slot_id).toBe(assignment.slot_id)

    // Respects the workshop's audience.
    const role = roleOf(assignment.person_id)
    if (workshop!.audience === 'children') expect(role).toBe('child')
    if (workshop!.audience === 'adults') expect(role).toBe('adult')
    expect(
      rankingsByPerson
        .get(assignment.person_id)
        ?.choices.some(
          (choice) => choice.workshop_id === assignment.workshop_id && choice.rank !== null,
        ),
    ).toBe(true)
  }

  // No person is placed into a different workshop during a slot where they
  // lead something (subsumes not attending their own workshop as well).
  const leaderSlots = new Map<string, Set<string>>()
  for (const workshop of official.workshops) {
    const placement = placementsById.get(workshop.id)
    if (!placement) continue
    for (const leaderId of workshop.leader_ids) {
      const slots = leaderSlots.get(leaderId) ?? new Set<string>()
      slots.add(placement.slot_id)
      leaderSlots.set(leaderId, slots)
    }
  }
  for (const assignment of attendance.assignments)
    expect(leaderSlots.get(assignment.person_id)?.has(assignment.slot_id)).not.toBe(true)

  // Every person who has any assignment does not also appear unassigned,
  // and vice versa — nobody is silently double-counted or dropped.
  const assignedPeople = new Set(attendance.assignments.map(({ person_id: id }) => id))
  const unassignedPeople = new Set(attendance.unassigned.map(({ person_id: id }) => id))
  expect([...unassignedPeople].every((id) => !assignedPeople.has(id))).toBe(true)

  // Determinism: re-deriving and re-solving the exact same events produces
  // the exact same set of (person, workshop, slot) placements.
  const again = solveFixture()
  const attendanceAgain = again.plan.sections['workshop-assignment'] as WorkshopAssignmentSection
  expect(assignmentKey(attendanceAgain)).toEqual(assignmentKey(attendance))

  // Retaining against the previous plan remains constraint-valid and choice-
  // bound. Repair may still reconsider ranked placements when occupancy has
  // changed, but it cannot introduce an unchosen workshop.
  const retained = solveFixture(plan)
  const attendanceRetained = retained.plan.sections[
    'workshop-assignment'
  ] as WorkshopAssignmentSection
  const retainedCountByWorkshop = new Map<string, number>()
  for (const assignment of attendanceRetained.assignments)
    retainedCountByWorkshop.set(
      assignment.workshop_id,
      (retainedCountByWorkshop.get(assignment.workshop_id) ?? 0) + 1,
    )
  for (const [workshopId, count] of retainedCountByWorkshop)
    expect(count).toBeLessThanOrEqual(workshopsById.get(workshopId)!.capacity)
  for (const assignment of attendanceRetained.assignments) {
    const workshop = workshopsById.get(assignment.workshop_id)!
    expect(leaderSlots.get(assignment.person_id)?.has(assignment.slot_id)).not.toBe(true)
    const role = roleOf(assignment.person_id)
    if (workshop.audience === 'children') expect(role).toBe('child')
    if (workshop.audience === 'adults') expect(role).toBe('adult')
    expect(
      rankingsByPerson
        .get(assignment.person_id)
        ?.choices.some(
          (choice) => choice.workshop_id === assignment.workshop_id && choice.rank !== null,
        ),
    ).toBe(true)
  }
})

test('the workshop allocation projection exposes answers, demand, and trace from the solved world', () => {
  const { plan, world } = solveFixture()
  const projection = buildWorkshopAllocationProjection({
    world,
    plan,
    event_date: '2027-05-14',
    time_zone: 'Europe/Berlin',
    max_rank: 3,
  })

  expect(projection.has_workshops).toBe(true)
  expect(projection.has_answers).toBe(true)
  expect(projection.answers.length).toBeGreaterThan(0)
  expect(projection.demand.find((row) => row.title === 'Keramik')).toEqual(
    expect.objectContaining({ first_choices: 16, placement_label: 'platziert' }),
  )
  expect(projection.demand.find((row) => row.title === 'Schmieden')).toEqual(
    expect.objectContaining({ placement_label: 'ohne Termin' }),
  )
  expect(projection.trace_events.length).toBeGreaterThan(projection.answers.length)
  expect(projection.trace_people).toHaveLength(projection.answers.length)
  expect(projection.trace_people).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: expect.any(String),
        matching_workshop_count: expect.any(Number),
        wish_count: expect.any(Number),
        fulfilled_count: expect.any(Number),
      }),
    ]),
  )

  const stages = buildWorkshopAllocationTraceStages(projection, 'all')
  expect(stages[0]).toEqual(
    expect.objectContaining({ label: 'Wünsche abgegeben', phase: 'answers' }),
  )
  expect(stages.some((stage) => stage.phase === 'round')).toBe(true)
  expect(stages.some((stage) => stage.detail_items.length > 0)).toBe(true)
  expect(stages.at(-1)).toEqual(expect.objectContaining({ label: 'Ergebnis' }))
  const firstRound = stages.find((stage) => stage.id === 'round-1')
  const capacityDetails = firstRound?.detail_groups?.find((group) => group.id === 'capacity')
  expect(capacityDetails?.items[0]).toEqual(
    expect.objectContaining({
      bold_prefix: expect.any(String),
      strike_people: true,
      people: expect.arrayContaining([expect.objectContaining({ name: expect.any(String) })]),
    }),
  )
  const selectedId = projection.answers.find((answer) => answer.ranks.length > 0)?.id
  expect(selectedId).toBeDefined()
  const selectedStages = buildWorkshopAllocationTraceStages(projection, 'all', selectedId, true)
  expect(selectedStages[0]?.open).toBeGreaterThan(0)
  expect(
    selectedStages
      .flatMap((stage) => stage.detail_groups ?? [])
      .flatMap((detailGroup) => detailGroup.items)
      .every((item) => item.people.every((person) => person.id === selectedId)),
  ).toBe(true)
})

test('the retained trace has one event per choice and never repeats a person in a detail group', () => {
  const first = solveFixture()
  const retained = solveFixture(first.plan)
  const projection = buildWorkshopAllocationProjection({
    world: retained.world,
    plan: retained.plan,
    event_date: '2027-05-14',
    time_zone: 'Europe/Berlin',
    max_rank: 3,
  })
  const choiceEvents = projection.trace_events.filter(
    (event) => event.rank !== null && ['round', 'retention', 'fixed'].includes(event.phase),
  )
  const choiceKeys = choiceEvents.map(
    (event) => `${event.person_id}|${event.workshop_id}|${event.rank}`,
  )
  expect(new Set(choiceKeys).size).toBe(choiceKeys.length)

  const stages = buildWorkshopAllocationTraceStages(projection, 'all')
  expect(stages.map((stage) => stage.id)).toEqual([
    'answers',
    'retention',
    'round-1',
    'round-2',
    'round-3',
    'result',
  ])
  for (const item of stages.flatMap((stage) =>
    (stage.detail_groups ?? []).flatMap((group) => group.items),
  ))
    expect(new Set(item.people.map((person) => person.id)).size).toBe(item.people.length)

  const section = retained.plan.sections['workshop-assignment'] as WorkshopAssignmentSection
  const snapshotAssignments = [
    ...section.initial_assignments,
    ...section.rounds.flatMap((round) => round.assignments),
  ]
  const snapshotKeys = new Set(
    snapshotAssignments.map(
      (assignment) =>
        `${assignment.person_id}|${assignment.workshop_id}|${assignment.slot_id}|${assignment.reason}`,
    ),
  )
  for (const assignment of section.assignments) {
    if (assignment.reason === 'repaired') {
      expect(
        section.repairs.some(
          (repair) =>
            repair.person_id === assignment.person_id &&
            repair.workshop_id === assignment.workshop_id,
        ),
      ).toBe(true)
    } else {
      expect(
        snapshotKeys.has(
          `${assignment.person_id}|${assignment.workshop_id}|${assignment.slot_id}|${assignment.reason}`,
        ),
      ).toBe(true)
    }
  }
  for (const round of section.rounds) {
    const occupied = new Set<string>()
    for (const assignment of round.assignments) {
      const key = `${assignment.person_id}|${assignment.slot_id}`
      expect(occupied.has(key)).toBe(false)
      occupied.add(key)
    }
  }
})
