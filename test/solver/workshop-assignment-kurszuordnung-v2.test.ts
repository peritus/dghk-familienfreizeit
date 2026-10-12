import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { defineOccasionProfile } from '../../src/config/define.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import type { Event } from '../../src/events/types.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'
import { officialWorkshops } from '../../src/modules/official-workshops/index.js'
import {
  workshopScheduling,
  type WorkshopSchedulingSection,
} from '../../src/modules/workshop-scheduling/index.js'
import { workshopSpace } from '../../src/modules/workshop-space/index.js'
import { workshopRankings } from '../../src/modules/workshop-rankings/index.js'
import {
  workshopAssignment,
  type WorkshopAssignmentSection,
} from '../../src/modules/workshop-assignment/index.js'

// Outcome checks for the previous year's wish data (spec/prior-art/kurszuordnung-v2.md).
// The spreadsheet scored a hand-made course-to-slot plan; these checks run the
// same wishes through the real scheduling and attendance stages under that plan,
// the best plan found by exhaustive search, a capacity limit, and automatic
// first-feasible placement.

function profileFor(workshopsPerPerson: number) {
  return defineOccasionProfile({
    meta: {
      id: 'kurszuordnung-v2',
      name: 'Kurszuordnung V2',
      description: 'Previous-year course wishes from the Kurszuordnung spreadsheet',
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
      workshopRankings({
        ranking_trait: 'prefers-workshop',
        max_rank: 3,
        allow_no_preference: true,
      }),
      workshopAssignment({ workshops_per_person: workshopsPerPerson }),
    ],
  })
}

const fixture = readFileSync(
  new URL('../fixtures/workshop-assignment/kurszuordnung-v2.kdl', import.meta.url),
  'utf-8',
)

type Plan = Readonly<Record<string, readonly string[]>>

// Column L of the spreadsheet: the plan the organiser built by hand.
const spreadsheetPlan: Plan = {
  slot_1: ['a', 'c', 'j', 'l'],
  slot_2: ['b', 'f', 'h', 'k', 'm'],
  slot_3: ['d', 'e', 'g', 'i'],
}

// The only plan, up to renaming slots, that gives every child with at least two
// wishes two courses and, among those plans, the most first-and-second wishes.
const bestPlan: Plan = {
  slot_1: ['a', 'i', 'j', 'l'],
  slot_2: ['b', 'c', 'e', 'h', 'm'],
  slot_3: ['d', 'f', 'g', 'k'],
}

type Variant = {
  workshopsPerPerson?: number
  plan?: Plan
  capacity?: number
  extraSpaces?: number
  reversePersonIds?: boolean
}

function reversedPersonIds(text: string): string {
  return text.replace(
    /per_kind_(\d{2})/g,
    (_, n: string) => `per_kind_${String(67 - Number(n)).padStart(2, '0')}`,
  )
}

function variantEvents(base: Event[], variant: Variant): Event[] {
  const additions: Pick<Event, 'type' | 'payload'>[] = []
  for (let index = 0; index < (variant.extraSpaces ?? 0); index += 1) {
    const id = `wsp_extra_${index + 1}`
    additions.push({
      type: 'WorkshopSpaceAdded',
      payload: {
        workshop_space_id: id,
        name: id,
        location_description: id,
        capacity: 66,
        sort_key: 100 + index,
      },
    } as Pick<Event, 'type' | 'payload'>)
  }
  const courses = 'abcdefghijklm'.split('')
  if (variant.capacity !== undefined)
    for (const course of courses)
      additions.push({
        type: 'LabelSet',
        payload: {
          entity_id: `wks_kurs_${course}`,
          key: 'capacity',
          value: variant.capacity,
          strength: null,
          note: null,
        },
      } as Pick<Event, 'type' | 'payload'>)
  for (const [slotId, slotCourses] of Object.entries(variant.plan ?? {}))
    slotCourses.forEach((course, index) =>
      additions.push({
        type: 'LabelSet',
        payload: {
          entity_id: `wks_kurs_${course}`,
          key: 'fixed-placement',
          value: { slot_id: slotId, space_id: `wsp_raum_${index + 1}` },
          strength: null,
          note: null,
        },
      } as Pick<Event, 'type' | 'payload'>),
    )
  return [
    ...base,
    ...additions.map(
      (addition, index) =>
        ({
          ...addition,
          seq: base.length + index + 1,
          at: '2026-01-01T00:00:00.000Z',
          actor: 'fixture',
          subject: null,
        }) as Event,
    ),
  ]
}

function solveVariant(variant: Variant) {
  const profile = profileFor(variant.workshopsPerPerson ?? 2)
  const text = variant.reversePersonIds ? reversedPersonIds(fixture) : fixture
  const events = variantEvents(loadKdl(text, profile.validation_view), variant)
  const world = derive(events, profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-05-14',
    profile,
    seed: null,
  })
  return {
    schedule: plan.sections['workshop-scheduling'] as WorkshopSchedulingSection,
    attendance: plan.sections['workshop-assignment'] as WorkshopAssignmentSection,
  }
}

const children = Array.from(
  { length: 66 },
  (_, index) => `per_kind_${String(index + 1).padStart(2, '0')}`,
)

function coursesPerChild(attendance: WorkshopAssignmentSection): Map<string, string[]> {
  const result = new Map(children.map((child) => [child, [] as string[]]))
  for (const assignment of attendance.assignments)
    result.get(assignment.person_id)!.push(assignment.workshop_id)
  return result
}

function childrenByCourseCount(attendance: WorkshopAssignmentSection): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const courses of coursesPerChild(attendance).values())
    counts[courses.length] = (counts[courses.length] ?? 0) + 1
  return counts
}

function assignmentsByRank(attendance: WorkshopAssignmentSection): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const assignment of attendance.assignments)
    counts[assignment.rank ?? 0] = (counts[assignment.rank ?? 0] ?? 0) + 1
  return counts
}

describe('previous-year Kurszuordnung wishes', () => {
  test('the fixture holds 66 children with 188 ordered wishes for 13 courses', () => {
    const wishes = [...fixture.matchAll(/key="prefers-workshop" value="wks_kurs_[a-m]:[1-3]"/g)]
    expect(new Set(children).size).toBe(66)
    expect(wishes).toHaveLength(188)
  })

  test('the spreadsheet plan gives 61 children two courses under the two-course target', () => {
    const { schedule, attendance } = solveVariant({ plan: spreadsheetPlan })
    expect(schedule.fixed_violations).toEqual([])
    expect(schedule.unscheduled).toEqual([])
    expect(attendance.unassigned).toEqual([])
    expect(childrenByCourseCount(attendance)).toEqual({ 1: 5, 2: 61 })
    expect(assignmentsByRank(attendance)).toEqual({ 1: 66, 2: 48, 3: 13 })
  })

  test('with three courses per child, attendance equals distinct wish slots, the corrected spreadsheet score', () => {
    const { attendance } = solveVariant({ plan: spreadsheetPlan, workshopsPerPerson: 3 })
    const slotOf = new Map(
      Object.entries(spreadsheetPlan).flatMap(([slot, courses]) =>
        courses.map((course) => [`wks_kurs_${course}`, slot] as const),
      ),
    )
    const wishesByChild = new Map(children.map((child) => [child, [] as string[]]))
    for (const match of fixture.matchAll(
      /entity_id="(per_kind_\d{2})" key="prefers-workshop" value="(wks_kurs_[a-m]):/g,
    ))
      wishesByChild.get(match[1]!)!.push(match[2]!)
    for (const [child, courses] of coursesPerChild(attendance))
      expect(courses.length, child).toBe(
        new Set(wishesByChild.get(child)!.map((course) => slotOf.get(course))).size,
      )
    expect(attendance.assignments).toHaveLength(148)
    expect(childrenByCourseCount(attendance)).toEqual({ 1: 5, 2: 40, 3: 21 })
  })

  test('the best plan gives every child with two or more wishes two courses', () => {
    const { schedule, attendance } = solveVariant({ plan: bestPlan })
    expect(schedule.fixed_violations).toEqual([])
    // per_kind_11 and per_kind_56 named a single course each.
    expect(childrenByCourseCount(attendance)).toEqual({ 1: 2, 2: 64 })
    expect(assignmentsByRank(attendance)).toEqual({ 1: 66, 2: 55, 3: 9 })
  })

  test('a capacity of 12 per course leaves 22 children short, depending on person-id order', () => {
    const forward = solveVariant({ plan: spreadsheetPlan, capacity: 12 })
    const reversed = solveVariant({ plan: spreadsheetPlan, capacity: 12, reversePersonIds: true })
    const short = [...coursesPerChild(forward.attendance)]
      .filter(([, courses]) => courses.length < 2)
      .map(([child]) => child)
    expect(short).toHaveLength(22)
    expect(short.filter((child) => child > 'per_kind_33')).toHaveLength(16)

    // Reversing ids renames per_kind_NN to per_kind_(67-NN); map back to compare
    // the same child under both orders.
    const original = (id: string) =>
      `per_kind_${String(67 - Number(id.slice(-2))).padStart(2, '0')}`
    const reversedCourses = new Map(
      [...coursesPerChild(reversed.attendance)].map(([child, courses]) => [
        original(child),
        courses.slice().sort().join(','),
      ]),
    )
    const changed = [...coursesPerChild(forward.attendance)].filter(
      ([child, courses]) => courses.slice().sort().join(',') !== reversedCourses.get(child),
    )
    expect(childrenByCourseCount(forward.attendance)).toEqual({ 1: 22, 2: 44 })
    // One single-wish child loses the only wish once the order is reversed.
    expect(childrenByCourseCount(reversed.attendance)).toEqual({ 0: 1, 1: 19, 2: 46 })
    expect(changed).toHaveLength(21)
  })

  // Baseline for spec/deferred-ideas/demand-aware-workshop-scheduling.md and
  // spec/issues/open/053-first-feasible-slot-packing.md: automatic placement does
  // not read wishes. Demand-aware scheduling is expected to change these numbers.
  test('automatic first-feasible placement fills the earliest slot first', () => {
    const fiveSpaces = solveVariant({})
    const bySlot = (schedule: WorkshopSchedulingSection) =>
      Object.fromEntries(
        ['slot_1', 'slot_2', 'slot_3'].map((slot) => [
          slot,
          schedule.placements
            .filter((placement) => placement.slot_id === slot)
            .map((placement) => placement.workshop_id.slice(-1))
            .sort()
            .join(''),
        ]),
      )
    expect(bySlot(fiveSpaces.schedule)).toEqual({ slot_1: 'abcde', slot_2: 'fghij', slot_3: 'klm' })
    expect(childrenByCourseCount(fiveSpaces.attendance)).toEqual({ 1: 7, 2: 59 })
    expect(assignmentsByRank(fiveSpaces.attendance)).toEqual({ 1: 66, 2: 39, 3: 20 })

    const thirteenSpaces = solveVariant({ extraSpaces: 8 })
    expect(bySlot(thirteenSpaces.schedule)).toEqual({
      slot_1: 'abcdefghijklm',
      slot_2: '',
      slot_3: '',
    })
    expect(childrenByCourseCount(thirteenSpaces.attendance)).toEqual({ 1: 66 })
  })
})
