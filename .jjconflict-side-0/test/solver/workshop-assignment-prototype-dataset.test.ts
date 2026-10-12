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
import { buildWorkshopReportsProjection } from '../../src/modules/workshop-assignment/app/workshop-reports-view.js'
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
    public_landing: {
      heading: 'Test',
      intro: 'Test',
      actions: [
        {
          id: 'login',
          label: 'Anmelden',
          emphasis: 'primary',
          destination: { kind: 'route', to: '/login' },
        },
      ],
    },
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
    }),
  ],
})

const fixture = readFileSync(
  new URL('../fixtures/workshop-assignment/prototype-dataset.kdl', import.meta.url),
  'utf-8',
)

function solveFixture(): {
  plan: Plan
  input: SolverInput
  world: ReturnType<typeof derive>
} {
  const world = derive(loadKdl(fixture, profile.validation_view), profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const input = buildSolverInput(world, contributions)
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
  // All declared workshop-space capabilities survive folding. Schmieden still
  // needs the one capability that no space provides.
  expect(schedule.unscheduled).toEqual([
    { workshop_id: 'wks_schmieden', reason: 'hard.missing-capability' },
  ])

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
})

test('allocation counts a fixed attendee once when that person also signed up', () => {
  const { plan, world } = solveFixture()
  const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection
  const assigned = attendance.assignments[0]
  expect(assigned).toBeTruthy()

  const original = buildWorkshopAllocationProjection({
    world,
    plan,
    event_date: '2027-05-14',
    time_zone: 'Europe/Berlin',
    max_rank: 3,
  })
  const duplicate = {
    ...plan,
    sections: {
      ...plan.sections,
      'workshop-assignment': {
        ...attendance,
        signups: [
          ...attendance.signups,
          { person_id: assigned!.person_id, workshop_id: assigned!.workshop_id },
        ],
      },
    },
  }
  const withSignup = buildWorkshopAllocationProjection({
    world,
    plan: duplicate,
    event_date: '2027-05-14',
    time_zone: 'Europe/Berlin',
    max_rank: 3,
  })

  expect(
    withSignup.participation.people.find((person) => person.id === assigned!.person_id)
      ?.workshop_count,
  ).toBe(
    original.participation.people.find((person) => person.id === assigned!.person_id)
      ?.workshop_count,
  )
})

test('projects the complete workshop list set from the organiser plan', () => {
  const { plan, world } = solveFixture()
  const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection
  const schedule = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection
  const lists = buildWorkshopReportsProjection({ world, plan, time_zone: 'Europe/Berlin' })

  expect(lists.slots.length).toBe(8)
  expect(lists.families.length).toBe(49)
  expect(lists.rooms.length).toBe(10)

  // Workshop lists cover exactly the placed workshops, in programme order.
  expect(lists.workshops.map((workshop) => workshop.id).sort()).toEqual(
    schedule.placements.map((placement) => placement.workshop_id).sort(),
  )
  expect(lists.workshops.some((workshop) => workshop.id === 'wks_schmieden')).toBe(false)
  const slotOrder = lists.workshops.map((workshop) =>
    lists.slots.findIndex((slot) => slot.id === workshop.slot_id),
  )
  expect(slotOrder).toEqual(slotOrder.slice().sort((left, right) => left - right))

  const ceramics = lists.workshops.find((workshop) => workshop.id === 'wks_keramik')
  expect(ceramics).toMatchObject({
    title: 'Keramik',
    space_name: 'Atelier',
    slot_label: 'Fr 09:00–11:00',
    slot_long_label: 'Freitag, 14. Mai 2027, 09:00–11:00 Uhr',
    leaders: [
      { name: 'Sam Morgan', external: false },
      { name: 'Anna Albers', external: false },
    ],
  })
  expect(ceramics?.roster.length).toBeGreaterThan(0)
  // Children's ages are bare numbers in the roster table, with the long form for cards.
  expect(ceramics?.roster[0]?.age_short).toMatch(/^\d+$/)
  expect(ceramics?.roster[0]?.age_label).toMatch(/^\d+ Jahre$/)
  // Open-ended age ranges read "ab N Jahren"; external leaders are flagged.
  expect(lists.workshops.some((workshop) => /^ab \d+ Jahren$/.test(workshop.age_label))).toBe(true)
  expect(
    lists.workshops.some((workshop) => workshop.leaders.some((leader) => leader.external)),
  ).toBe(true)

  // People and external leaders share the person list.
  const externals = lists.persons.filter((person) => person.kind === 'external')
  expect(lists.persons.length - externals.length).toBe(140)
  expect(externals.length).toBeGreaterThan(0)
  const leadingExternal = externals.find((person) => person.led_workshops.length > 0)
  const led = leadingExternal?.entries.find((entry) => entry.status === 'lead')
  expect(led).toMatchObject({ role_label: 'leitet' })
  expect(led?.participant_count).toEqual(expect.any(Number))

  const alex = lists.persons.find((person) => person.name === 'Alex Morgan')
  expect(alex?.entries).toHaveLength(8)
  expect(alex?.entries.some((entry) => entry.status === 'assigned')).toBe(true)
  expect(alex?.workshop_count).toBe(
    alex?.entries.filter((entry) => entry.status !== 'free' && entry.status !== 'open').length,
  )

  // The resolver's open cases reach the person and family lists.
  expect(attendance.unassigned.length).toBeGreaterThan(0)
  for (const item of attendance.unassigned) {
    const person = lists.persons.find((candidate) => candidate.id === item.person_id)
    expect(person?.open_reason).toBeTruthy()
    // Every empty slot of an open case is marked open, with the reason as its role.
    for (const entry of person!.entries.filter((candidate) => !candidate.workshop)) {
      expect(entry).toMatchObject({ status: 'open', role_label: person!.open_reason })
    }
  }
  const openPerson = lists.persons.find((person) => person.open_reason)!
  const openFamily = lists.families.find((family) => family.id === openPerson.family_id)!
  const openColumn = openFamily.members.findIndex((member) => member.id === openPerson.id)
  expect(openFamily.members[openColumn]?.open).toBe(true)
  const openCells = openFamily.slots.map((slot) => slot.cells[openColumn]!)
  expect(openCells.filter((cell) => !cell.workshop).every((cell) => cell.open)).toBe(true)

  const morgan = lists.families.find((family) => family.id === 'fam_f0')
  expect(morgan?.name).toBe('Morgan')
  expect(morgan?.members.map((member) => member.first_name)).toEqual(['Sam', 'Jamie', 'Alex'])
  expect(morgan?.slots[0]?.cells).toHaveLength(3)

  // Every room lists every slot, with the hosted workshops in place.
  const atelier = lists.rooms.find((room) => room.id === 'wsp_r9')
  expect(atelier?.entries).toHaveLength(8)
  expect(atelier?.entries.filter((entry) => entry.workshop).length).toBe(atelier?.workshop_count)
  expect(atelier?.entries).toContainEqual(
    expect.objectContaining({ workshop: 'Keramik', audience: 'Kinder, 5–14 Jahre' }),
  )
})

test('organiser report projections use readable fallbacks when entity names are missing', () => {
  const { plan, world } = solveFixture()
  const family = world.families[0]!
  const person = world.persons[0]!
  const labelsByEntity = {
    ...world.labels_by_entity,
    [family.id]: (world.labels_by_entity[family.id] ?? []).filter(
      (label) => label.key !== 'display-name',
    ),
    [person.id]: (world.labels_by_entity[person.id] ?? []).filter(
      (label) => !['given-name', 'family-name'].includes(label.key),
    ),
  }
  const namelessWorld = { ...world, labels_by_entity: labelsByEntity }
  const reports = buildWorkshopReportsProjection({
    world: namelessWorld,
    plan,
    time_zone: 'Europe/Berlin',
  })
  const allocation = buildWorkshopAllocationProjection({
    world: namelessWorld,
    plan,
    event_date: '2027-05-14',
    time_zone: 'Europe/Berlin',
    max_rank: 3,
  })

  expect(reports.families.find((item) => item.id === family.id)?.name).toBe('Familie ohne Namen')
  expect(reports.persons.find((item) => item.id === person.id)?.name).toBe('Name nicht verfügbar')
  expect(allocation.person_names.find((item) => item.id === person.id)?.name).toBe(
    'Name nicht verfügbar',
  )
})

test('workshop rosters read health notes from the profile food note', () => {
  const { plan, world } = solveFixture()
  const attendee = (plan.sections['workshop-assignment'] as WorkshopAssignmentSection)
    .assignments[0]!
  const labels = world.labels_by_entity[attendee.person_id] ?? []
  const annotated = {
    ...world,
    labels_by_entity: {
      ...world.labels_by_entity,
      [attendee.person_id]: [...labels, { ...labels[0]!, key: 'food-note', value: 'Nussallergie' }],
    },
  }
  const lists = buildWorkshopReportsProjection({
    world: annotated,
    plan,
    time_zone: 'Europe/Berlin',
  })
  const workshop = lists.workshops.find((item) => item.id === attendee.workshop_id)
  expect(workshop?.roster.find((entry) => entry.person_id === attendee.person_id)?.health).toBe(
    'Nussallergie',
  )
  expect(workshop?.health_count).toBe(1)
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
  expect(projection.participation.slots).toHaveLength(8)
  expect(projection.participation.slots[0]).toEqual({
    id: 'slot_s1',
    day_label: 'Fr',
    start_label: '09:00',
    end_label: '11:00',
  })
  expect(projection.participation.people).toHaveLength(projection.answers.length)
  expect(projection.participation.people.every((person) => person.cells.length === 8)).toBe(true)
  expect(
    projection.participation.people.flatMap((person) => person.cells.map((cell) => cell.kind)),
  ).not.toContain('open')
  expect(projection.participation.people.map((person) => person.id)).toEqual(
    projection.participation.people
      .slice()
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name, 'de') || left.id.localeCompare(right.id),
      )
      .map((person) => person.id),
  )
  expect(
    projection.participation.people.some((person) =>
      person.ranks.some((rank) => rank.rank === 1 && rank.received),
    ),
  ).toBe(true)
  expect(
    projection.participation.people.some((person) =>
      person.cells.some((cell) => cell.kind === 'leader'),
    ),
  ).toBe(true)
  const stages = buildWorkshopAllocationTraceStages(projection, 'all')
  expect(stages[0]).toEqual(
    expect.objectContaining({ label: 'Wünsche abgegeben', phase: 'answers' }),
  )
  expect(stages.some((stage) => stage.phase === 'round')).toBe(true)
  expect(stages.some((stage) => stage.detail_items.length > 0)).toBe(true)
  expect(stages.at(-1)).toEqual(expect.objectContaining({ label: 'Ergebnis' }))
  const firstRound = stages.find((stage) => stage.id === 'round-1')
  expect(firstRound?.detail_groups?.[0]?.id).toBe('fulfilled')
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

test('the trace has one event per choice and never repeats a person in a detail group', () => {
  const current = solveFixture()
  const projection = buildWorkshopAllocationProjection({
    world: current.world,
    plan: current.plan,
    event_date: '2027-05-14',
    time_zone: 'Europe/Berlin',
    max_rank: 3,
  })
  const choiceEvents = projection.trace_events.filter(
    (event) => event.rank !== null && ['round', 'fixed'].includes(event.phase),
  )
  const choiceKeys = choiceEvents.map(
    (event) => `${event.person_id}|${event.workshop_id}|${event.rank}`,
  )
  expect(new Set(choiceKeys).size).toBe(choiceKeys.length)

  const stages = buildWorkshopAllocationTraceStages(projection, 'all')
  expect(stages.map((stage) => stage.id)).toEqual([
    'answers',
    'round-1',
    'round-2',
    'round-3',
    'result',
  ])
  for (const item of stages.flatMap((stage) =>
    (stage.detail_groups ?? []).flatMap((group) => group.items),
  ))
    expect(new Set(item.people.map((person) => person.id)).size).toBe(item.people.length)

  const section = current.plan.sections['workshop-assignment'] as WorkshopAssignmentSection
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
    expect(
      snapshotKeys.has(
        `${assignment.person_id}|${assignment.workshop_id}|${assignment.slot_id}|${assignment.reason}`,
      ),
    ).toBe(true)
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
