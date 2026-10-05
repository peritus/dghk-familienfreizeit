import { expect, test } from 'vitest'
import { buildSolverInput } from '../../src/solver/input.js'
import { composeSolverContributions, solve } from '../../src/solver/index.js'
import { derive } from '../../src/events/fold.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { defineOccasionProfile } from '../../src/config/define.js'
import { officialWorkshops } from '../../src/modules/official-workshops/index.js'
import { workshopScheduling } from '../../src/modules/workshop-scheduling/index.js'
import { workshopSpace } from '../../src/modules/workshop-space/index.js'
import { workshopRankings } from '../../src/modules/workshop-rankings/index.js'
import {
  workshopAssignment,
  type WorkshopAssignmentSection,
} from '../../src/modules/workshop-assignment/index.js'
import type { WorkshopAssignmentParams } from '../../src/modules/workshop-assignment/index.js'

function event(type: string, payload: JsonValue, seq: number): Event {
  return {
    seq,
    at: '2027-04-30T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type,
    payload,
  }
}

test('places one workshop and allocates a ranked person through the composed stages', () => {
  const events = [
    event(
      'FamilyInvited',
      { family_id: 'fam_a', email: 'a@example.test', display_name: 'A', locale: 'de' },
      1,
    ),
    event(
      'PersonAdded',
      {
        person_id: 'per_a',
        family_id: 'fam_a',
        given_name: 'A',
        family_name: 'A',
        age: 12,
        role: 'child',
      },
      2,
    ),
    event(
      'WorkshopSpaceAdded',
      {
        workshop_space_id: 'wsp_hall',
        name: 'Halle',
        location_description: 'Erdgeschoss',
        capacity: 10,
        availability_windows: [
          { starts_at: '2027-04-30T08:00:00Z', ends_at: '2027-04-30T18:00:00Z' },
        ],
        sort_key: 1,
      },
      3,
    ),
    event(
      'WorkshopSlotAdded',
      {
        slot_id: 'slot_morning',
        starts_at: '2027-04-30T09:00:00Z',
        ends_at: '2027-04-30T11:00:00Z',
        sort_key: 1,
      },
      4,
    ),
    event(
      'WorkshopAdded',
      {
        workshop_id: 'wks_ceramics',
        title: 'Keramik',
        description: 'Ton und Farbe',
        audience: 'children',
        age_min: 6,
        age_max: 14,
        capacity: 8,
        participation_mode: 'assigned',
        leader_ids: [],
        needs: [],
        sort_key: 1,
      },
      5,
    ),
    event(
      'LabelSet',
      {
        entity_id: 'per_a',
        key: 'prefers-workshop',
        value: { workshop_id: 'wks_ceramics', rank: 1 },
        strength: null,
        note: null,
      },
      6,
    ),
  ]
  const world = derive(events, luebben2027Profile.validation_view)
  const contributions = composeSolverContributions(luebben2027Profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-04-30',
    profile: luebben2027Profile,
    seed: null,
  })
  const placement = plan.sections['workshop-scheduling'] as {
    placements: readonly { workshop_id: string }[]
  }
  const attendance = plan.sections['workshop-assignment'] as {
    assignments: readonly { person_id: string; workshop_id: string }[]
  }
  expect(placement.placements).toEqual([
    { workshop_id: 'wks_ceramics', slot_id: 'slot_morning', space_id: 'wsp_hall' },
  ])
  expect(attendance.assignments).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_ceramics',
      slot_id: 'slot_morning',
      rank: 1,
      reason: 'ranked',
    },
  ])
})

function testProfile(assignmentParams: WorkshopAssignmentParams, maxRank = 3) {
  return defineOccasionProfile({
    meta: {
      id: 'workshop-fixture',
      name: 'Workshop fixture',
      description: 'Workshop fixture',
      starts_on: '2027-04-30',
      ends_on: '2027-05-02',
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
      workshopRankings({
        ranking_trait: 'prefers-workshop',
        max_rank: maxRank,
        allow_no_preference: true,
      }),
      workshopAssignment(assignmentParams),
    ],
  })
}

function family(personId: string, familyId: string, seq: number): Event[] {
  return [
    event(
      'FamilyInvited',
      {
        family_id: familyId,
        email: `${familyId}@example.test`,
        display_name: familyId,
        locale: 'de',
      },
      seq,
    ),
    event(
      'PersonAdded',
      {
        person_id: personId,
        family_id: familyId,
        given_name: personId,
        family_name: familyId,
        age: 12,
        role: 'child',
      },
      seq + 1,
    ),
  ]
}

function workshop(
  workshopId: string,
  capacity: number,
  sortKey: number,
  seq: number,
  leaderIds: readonly string[] = [],
): Event {
  return event(
    'WorkshopAdded',
    {
      workshop_id: workshopId,
      title: workshopId,
      description: workshopId,
      audience: 'children',
      age_min: 0,
      age_max: 18,
      capacity,
      participation_mode: 'assigned',
      leader_ids: leaderIds,
      needs: [],
      sort_key: sortKey,
    },
    seq,
  )
}

function ranking(personId: string, workshopId: string, rank: number, seq: number): Event {
  return event(
    'LabelSet',
    {
      entity_id: personId,
      key: 'prefers-workshop',
      value: { workshop_id: workshopId, rank },
      strength: null,
      note: null,
    },
    seq,
  )
}

function fixedAttendance(personId: string, workshopIds: readonly string[], seq: number): Event {
  return event('WorkshopAttendanceFixed', { person_id: personId, workshop_ids: workshopIds }, seq)
}

function venue(spaceId: string, seq: number): Event {
  return event(
    'WorkshopSpaceAdded',
    {
      workshop_space_id: spaceId,
      name: spaceId,
      location_description: spaceId,
      capacity: 10,
      availability_windows: [
        { starts_at: '2027-04-30T08:00:00Z', ends_at: '2027-04-30T18:00:00Z' },
      ],
      sort_key: 1,
    },
    seq,
  )
}

function slot(seq: number): Event {
  return event(
    'WorkshopSlotAdded',
    {
      slot_id: 'slot_morning',
      starts_at: '2027-04-30T09:00:00Z',
      ends_at: '2027-04-30T11:00:00Z',
      sort_key: 1,
    },
    seq,
  )
}

function assignmentSection(
  events: Event[],
  params: WorkshopAssignmentParams,
  maxRank = 3,
): WorkshopAssignmentSection {
  const profile = testProfile(params, maxRank)
  const world = derive(events, profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-04-30',
    profile,
    seed: null,
  })
  return plan.sections['workshop-assignment'] as WorkshopAssignmentSection
}

const defaultParams: WorkshopAssignmentParams = {
  workshops_per_person: 1,
}

test('a fixed attendance decision takes precedence over a ranked choice for the same workshop', () => {
  const events = [
    venue('wsp_a', 1),
    slot(2),
    workshop('wks_1', 1, 1, 3),
    ...family('per_a', 'fam_a', 4),
    ...family('per_b', 'fam_b', 6),
    ranking('per_b', 'wks_1', 1, 8),
    fixedAttendance('per_a', ['wks_1'], 9),
  ]
  const section = assignmentSection(events, defaultParams)
  expect(section.assignments).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_1',
      slot_id: 'slot_morning',
      rank: null,
      reason: 'fixed',
    },
  ])
  expect(section.unassigned).toEqual([
    { person_id: 'per_b', workshop_id: null, reason: 'no eligible capacity' },
  ])
  expect(section.fixed).toEqual([{ person_id: 'per_a', workshop_id: 'wks_1' }])
  expect(section.fixed_violations).toEqual([])
})

test('every configured choice round is processed and automatic assignments stop at the target', () => {
  const events = [
    venue('wsp_a', 1),
    venue('wsp_b', 2),
    venue('wsp_c', 3),
    slot(4),
    event(
      'WorkshopSlotAdded',
      {
        slot_id: 'slot_afternoon',
        starts_at: '2027-04-30T15:00:00Z',
        ends_at: '2027-04-30T17:00:00Z',
        sort_key: 2,
      },
      5,
    ),
    event(
      'WorkshopSlotAdded',
      {
        slot_id: 'slot_evening',
        starts_at: '2027-04-30T19:00:00Z',
        ends_at: '2027-04-30T21:00:00Z',
        sort_key: 3,
      },
      6,
    ),
    workshop('wks_1', 1, 1, 7),
    workshop('wks_2', 1, 2, 8),
    workshop('wks_3', 1, 3, 9),
    ...family('per_taken', 'fam_taken', 10),
    ...family('per_a', 'fam_a', 12),
    fixedAttendance('per_taken', ['wks_1'], 14),
    ranking('per_a', 'wks_1', 1, 15),
    ranking('per_a', 'wks_2', 2, 16),
    ranking('per_a', 'wks_3', 3, 17),
  ]
  const section = assignmentSection(events, { ...defaultParams, workshops_per_person: 1 })

  expect(section.rounds.map((round) => round.rank)).toEqual([1, 2, 3])
  expect(section.rounds[0]?.decisions).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_1',
      rank: 1,
      outcome: 'rejected',
      reason: 'hard.capacity',
      competing_workshop_id: null,
    },
  ])
  expect(section.rounds[1]?.decisions).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_2',
      rank: 2,
      outcome: 'assigned',
      reason: 'ranked',
      competing_workshop_id: null,
    },
  ])
  expect(section.rounds[2]?.decisions).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_3',
      rank: 3,
      outcome: 'not-needed',
      reason: 'policy.target-reached',
      competing_workshop_id: null,
    },
  ])
  expect(section.assignments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ person_id: 'per_a', workshop_id: 'wks_2', rank: 2 }),
    ]),
  )
})

test.each([2, 3, 5])('profile max_rank=%s produces that many allocation rounds', (maxRank) => {
  const events = [
    venue('wsp_a', 1),
    slot(2),
    workshop('wks_1', 1, 1, 3),
    ...family('per_a', 'fam_a', 4),
  ]
  const section = assignmentSection(events, defaultParams, maxRank)
  expect(section.rounds.map((round) => round.rank)).toEqual(
    Array.from({ length: maxRank }, (_, index) => index + 1),
  )
})

test('conflicting fixed decisions surface as fixed_violations instead of throwing', () => {
  const events = [
    venue('wsp_a', 1),
    slot(2),
    workshop('wks_1', 1, 1, 3),
    ...family('per_a', 'fam_a', 4),
    ...family('per_b', 'fam_b', 6),
    fixedAttendance('per_a', ['wks_1'], 8),
    fixedAttendance('per_b', ['wks_1'], 9),
  ]
  const section = assignmentSection(events, defaultParams)
  expect(section.assignments).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_1',
      slot_id: 'slot_morning',
      rank: null,
      reason: 'fixed',
    },
  ])
  expect(section.fixed).toEqual([
    { person_id: 'per_a', workshop_id: 'wks_1' },
    { person_id: 'per_b', workshop_id: 'wks_1' },
  ])
  expect(section.fixed_violations).toEqual([
    { person_id: 'per_b', workshop_id: 'wks_1', reasons: ['hard.capacity'] },
  ])
})

test('a stable re-derive recomputes the same current assignment without prior-plan state', () => {
  const events = [
    venue('wsp_a', 1),
    slot(2),
    workshop('wks_1', 1, 1, 3),
    ...family('per_a', 'fam_a', 4),
    ranking('per_a', 'wks_1', 1, 6),
  ]
  const profile = testProfile(defaultParams)
  const world = derive(events, profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const config = {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-04-30',
    profile,
    seed: null,
  }
  const plan1 = solve(buildSolverInput(world, contributions), contributions, config)
  const section1 = plan1.sections['workshop-assignment'] as WorkshopAssignmentSection
  expect(section1.assignments).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_1',
      slot_id: 'slot_morning',
      rank: 1,
      reason: 'ranked',
    },
  ])

  const plan2 = solve(buildSolverInput(world, contributions), contributions, config)
  const section2 = plan2.sections['workshop-assignment'] as WorkshopAssignmentSection
  expect(section2.assignments).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_1',
      slot_id: 'slot_morning',
      rank: 1,
      reason: 'ranked',
    },
  ])
})

test('strict rounds do not displace an earlier assignment for later coverage', () => {
  const events = [
    venue('wsp_a', 1),
    venue('wsp_b', 2),
    slot(3),
    workshop('wks_1', 1, 1, 4),
    workshop('wks_2', 1, 2, 5),
    ...family('per_a', 'fam_a', 6),
    ...family('per_b', 'fam_b', 8),
    ranking('per_a', 'wks_1', 1, 10),
    ranking('per_a', 'wks_2', 2, 11),
    ranking('per_b', 'wks_1', 1, 12),
  ]
  const section = assignmentSection(events, defaultParams)
  expect(section.assignments).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_1',
      slot_id: 'slot_morning',
      rank: 1,
      reason: 'ranked',
    },
  ])
  expect(section.unassigned).toEqual([
    { person_id: 'per_b', workshop_id: null, reason: 'no eligible capacity' },
  ])
})

test('automatic allocation never assigns a workshop outside the current ranking', () => {
  const events = [
    venue('wsp_a', 1),
    slot(2),
    workshop('wks_1', 1, 1, 3),
    ...family('per_a', 'fam_a', 4),
  ]
  const section = assignmentSection(events, defaultParams)
  expect(section.assignments).toEqual([])
  expect(section.unassigned).toEqual([
    { person_id: 'per_a', workshop_id: null, reason: 'no current workshop choice' },
  ])
})

test('a workshop leader cannot also attend a different workshop in their own leading slot', () => {
  const events = [
    venue('wsp_a', 1),
    venue('wsp_b', 2),
    slot(3),
    ...family('per_leader', 'fam_leader', 4),
    workshop('wks_led', 5, 1, 6, ['per_leader']),
    workshop('wks_other', 5, 2, 7),
    ranking('per_leader', 'wks_other', 1, 8),
  ]
  const section = assignmentSection(events, defaultParams)
  expect(section.assignments).toEqual([])
  expect(section.unassigned).toEqual([
    { person_id: 'per_leader', workshop_id: null, reason: 'no eligible capacity' },
  ])
})

function assignmentPlan(
  events: Event[],
  params: WorkshopAssignmentParams,
): { section: WorkshopAssignmentSection; trace: readonly { step: string; subject?: string }[] } {
  const profile = testProfile(params)
  const world = derive(events, profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-04-30',
    profile,
    seed: null,
  })
  return {
    section: plan.sections['workshop-assignment'] as WorkshopAssignmentSection,
    trace: plan.trace.filter((entry) => entry.stage === 'workshop-assignment.attendance'),
  }
}

test('a rejected ranked choice is traced with its reason, not just the winning choice', () => {
  const events = [
    venue('wsp_a', 1),
    venue('wsp_b', 2),
    slot(3),
    workshop('wks_1', 1, 1, 4),
    workshop('wks_2', 1, 2, 5),
    ...family('per_taken', 'fam_taken', 6),
    ...family('per_a', 'fam_a', 8),
    fixedAttendance('per_taken', ['wks_1'], 10),
    ranking('per_a', 'wks_1', 1, 11),
    ranking('per_a', 'wks_2', 2, 12),
  ]
  const { section, trace } = assignmentPlan(events, defaultParams)
  expect(section.assignments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ person_id: 'per_a', workshop_id: 'wks_2', reason: 'ranked' }),
    ]),
  )
  expect(trace).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        step: 'ranked-rejected',
        subject: 'per_a',
        text: 'per_a rejected for wks_1: hard.capacity',
      }),
      expect.objectContaining({ step: 'ranked', subject: 'per_a', text: 'per_a → wks_2' }),
    ]),
  )
})
