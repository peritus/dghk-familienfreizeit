import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { describe, expect, test } from 'vitest'
import { defineOccasionProfile } from '../../src/config/define.js'
import { activeProfile } from '../../src/config/index.js'
import { closedResults } from '../../src/config/phases.js'
import { organiserAssignmentFixtureState } from '../../src/app/stories/organiser-fixtures.js'
import { derive, type World } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import { defineModule } from '../../src/modules/define.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'
import {
  closingExplanationPlan,
  planWithWorkshopsClosedResult,
} from '../../src/modules/workshop-assignment/app/print-closed-result.js'

const config = activeProfile.validation_view
const contributions = composeSolverContributions(activeProfile)
const results = closedResults(activeProfile.modules)

function planOf(world: World) {
  return solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
}

const workshopEvents = loadKdl(
  readFileSync(
    resolve(process.cwd(), 'test/fixtures/workshop-assignment/prototype-dataset.kdl'),
    'utf-8',
  ),
  config,
)
const workshopWorld = derive(workshopEvents, config)
const roomEvents = organiserAssignmentFixtureState.committed
const roomWorld = derive(roomEvents, config)

const append = (events: readonly Event[], type: string, payload: JsonValue = {}): Event[] => [
  ...events,
  {
    seq: events.length + 1,
    at: '2027-04-01T08:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type,
    payload,
  },
]

const revisions = { build_revision: 'test', compatibility_revision: 1 }

describe('closed results', () => {
  test('historical explanations require matching policy revisions and canonical stored result', () => {
    const payload = {
      ...results.get('workshops')!.compute({ world: workshopWorld, plan: planOf(workshopWorld) }),
      ...revisions,
    }
    const closed = append(workshopEvents, 'WorkshopsClosed', payload)
    expect(
      closingExplanationPlan(closed, closed.length, payload, activeProfile, revisions),
    ).not.toBeNull()
    expect(
      closingExplanationPlan(closed, closed.length, payload, activeProfile, {
        ...revisions,
        build_revision: 'other',
      }),
    ).toBeNull()
    expect(
      closingExplanationPlan(closed, closed.length, payload, activeProfile, {
        ...revisions,
        compatibility_revision: 2,
      }),
    ).toBeNull()
  })
  test('the active profile closes both areas through their owning modules', () => {
    expect(
      [...results.values()].map(({ area, close_event, reopen_event }) => [
        area,
        close_event,
        reopen_event,
      ]),
    ).toEqual([
      ['accommodation', 'AccommodationClosed', 'AccommodationReopened'],
      ['workshops', 'WorkshopsClosed', 'WorkshopsReopened'],
    ])
  })

  test('workshop payloads are the solver output slice in canonical id order', () => {
    const payload = results.get('workshops')!.compute({
      world: workshopWorld,
      plan: planOf(workshopWorld),
    }) as {
      placements: { workshop_id: string }[]
      attendance: { person_id: string; workshop_id: string }[]
      unassigned: { person_id: string }[]
    }
    expect(payload.placements.length).toBeGreaterThan(0)
    expect(payload.attendance.length).toBeGreaterThan(0)
    expect(Object.keys(payload).sort()).toEqual(['attendance', 'placements', 'unassigned'])
    const ids = payload.attendance.map(
      ({ person_id, workshop_id }) => `${person_id}/${workshop_id}`,
    )
    expect(ids).toEqual([...ids].sort())
    expect(payload.placements.map(({ workshop_id }) => workshop_id)).toEqual(
      payload.placements.map(({ workshop_id }) => workshop_id).sort(),
    )
  })

  test('accommodation payloads group places per family and room', () => {
    const payload = results.get('accommodation')!.compute({
      world: roomWorld,
      plan: planOf(roomWorld),
    }) as { placements: { family_id: string; room_id: string; place_ids: string[] }[] }
    expect(payload.placements.length).toBeGreaterThan(0)
    for (const placement of payload.placements)
      expect(placement.place_ids).toEqual([...placement.place_ids].sort())
  })

  test('closing records the stored payload and reopening needs a closed area', () => {
    const payload = {
      ...results.get('workshops')!.compute({ world: workshopWorld, plan: planOf(workshopWorld) }),
      ...revisions,
    }
    const closed = append(workshopEvents, 'WorkshopsClosed', payload)
    const world = derive(closed, config)
    expect(world.phase_facts.areas.workshops).toMatchObject({
      closings: [{ seq: closed.length, payload }],
      latest: { kind: 'closed', seq: closed.length },
    })
    const reopened = derive(append(closed, 'WorkshopsReopened'), config)
    expect(reopened.phase_facts.areas.workshops?.latest?.kind).toBe('reopened')
    expect(() => derive(append(workshopEvents, 'WorkshopsReopened'), config)).toThrow(/not closed/)
    expect(() => derive(append(roomEvents, 'AccommodationReopened'), config)).toThrow(/not closed/)
  })

  test('later capacity edits recompute attendance without changing the Festlegen snapshot', () => {
    const contribution = results.get('workshops')!
    const snapshot = {
      ...contribution.compute({ world: workshopWorld, plan: planOf(workshopWorld) }),
      ...revisions,
    } as {
      placements: { workshop_id: string; slot_id: string; space_id: string }[]
      attendance: { person_id: string; workshop_id: string }[]
      unassigned: { person_id: string }[]
      build_revision: string
      compatibility_revision: number
    }
    const closed = append(workshopEvents, 'WorkshopsClosed', snapshot)
    const changed = append(closed, 'LabelSet', {
      entity_id: snapshot.attendance[0]!.workshop_id,
      key: 'capacity',
      value: 0,
      strength: null,
      note: null,
    })
    const currentWorld = derive(changed, config)
    const current = {
      ...contribution.compute({ world: currentWorld, plan: planOf(currentWorld) }),
      ...revisions,
    }

    expect(currentWorld.phase_facts.areas.workshops).toMatchObject({
      closings: [{ payload: snapshot }],
      latest: { kind: 'closed', seq: closed.length },
    })
    expect(current.attendance).not.toEqual(snapshot.attendance)
    expect(contribution.compare(snapshot, current, currentWorld).changes.length).toBeGreaterThan(0)
  })

  test('a malformed stored payload is rejected; a pending empty one folds', () => {
    expect(() =>
      derive(append(workshopEvents, 'WorkshopsClosed', { placements: [] }), config),
    ).toThrow()
    expect(
      derive(append(workshopEvents, 'WorkshopsClosed'), config).phase_facts.areas.workshops?.latest
        ?.kind,
    ).toBe('closed')
  })

  test('closing and reopening are organiser-only', () => {
    for (const type of [
      'WorkshopsClosed',
      'WorkshopsReopened',
      'AccommodationClosed',
      'AccommodationReopened',
    ]) {
      const authorize = config.event_authorize_dispatch![type]!
      expect(authorize({ kind: 'organiser' }, {}, workshopWorld)).toBe(true)
      expect(authorize({ kind: 'family', family_id: 'fam_x' }, {}, workshopWorld)).toBe(false)
    }
  })

  test('comparison finds no difference for the same result and attributes moves to families', () => {
    const contribution = results.get('workshops')!
    const payload = {
      ...contribution.compute({ world: workshopWorld, plan: planOf(workshopWorld) }),
      ...revisions,
    } as {
      placements: { workshop_id: string; slot_id: string; space_id: string }[]
      attendance: { person_id: string; workshop_id: string }[]
    }
    expect(contribution.compare(payload, payload, workshopWorld)).toEqual({
      changes: [],
      affected_family_ids: [],
    })
    const [first] = payload.attendance
    const slotOf = (workshopId: string) =>
      payload.placements.find(({ workshop_id }) => workshop_id === workshopId)?.slot_id
    const alternative = payload.placements.find(
      ({ workshop_id, slot_id }) =>
        workshop_id !== first!.workshop_id && slot_id === slotOf(first!.workshop_id),
    )!
    const moved = {
      ...payload,
      attendance: payload.attendance.map((entry) =>
        entry === first ? { ...entry, workshop_id: alternative.workshop_id } : entry,
      ),
    }
    const difference = contribution.compare(payload, moved, workshopWorld)
    expect(difference.changes).toEqual([
      expect.objectContaining({
        kind: 'moved',
        subject_id: first!.person_id,
        before: first!.workshop_id,
        after: alternative.workshop_id,
      }),
    ])
    expect(difference.affected_family_ids).toHaveLength(1)
    expect(contribution.compare(null, payload, workshopWorld).changes.length).toBeGreaterThan(0)
    const candidate = contribution.compute({ world: workshopWorld, plan: planOf(workshopWorld) })
    expect(contribution.compare(payload, candidate, workshopWorld).changes).toEqual([])
  })

  test('room comparison reports moved, added and removed families', () => {
    const contribution = results.get('accommodation')!
    const before = {
      placements: [
        { family_id: 'fam_a', room_id: 'room_1', place_ids: [] },
        { family_id: 'fam_b', room_id: 'room_2', place_ids: [] },
      ],
      unplaced: [],
      ...revisions,
    }
    const after = {
      placements: [
        { family_id: 'fam_a', room_id: 'room_3', place_ids: [] },
        { family_id: 'fam_c', room_id: 'room_2', place_ids: [] },
      ],
      unplaced: [],
      ...revisions,
    }
    expect({
      ...contribution.compare(before, after, roomWorld),
      changes: contribution
        .compare(before, after, roomWorld)
        .changes.map(
          ({
            aspect: _aspect,
            before_value: _before,
            after_value: _after,
            affected_family_ids: _families,
            ...change
          }) => change,
        ),
    }).toEqual({
      changes: [
        {
          kind: 'moved',
          subject_id: 'fam_a',
          family_id: 'fam_a',
          before: 'room_1',
          after: 'room_3',
        },
        { kind: 'removed', subject_id: 'fam_b', family_id: 'fam_b', before: 'room_2', after: null },
        { kind: 'added', subject_id: 'fam_c', family_id: 'fam_c', before: null, after: 'room_2' },
      ],
      affected_family_ids: ['fam_a', 'fam_b', 'fam_c'],
    })
  })

  test('composition rejects two owners of one area and foreign closing events', () => {
    const owner = (id: string, events: readonly string[]) =>
      defineModule({
        id,
        params: z.object({}),
        contribute: () => ({
          events: events.map((type) => ({
            type,
            payload: z.object({}).strict(),
            authorize: () => true,
            fold: () => {},
          })),
          closed_results: [
            {
              ...results.get('workshops')!,
              close_event: `${id}Closed`,
              reopen_event: `${id}Reopened`,
            },
          ],
        }),
      })({})
    const meta = { ...activeProfile.meta, phase_dates: [] }
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {},
        modules: [
          owner('one', ['oneClosed', 'oneReopened']),
          owner('two', ['twoClosed', 'twoReopened']),
        ],
      }),
    ).toThrow(/closed by both one and two/)
    expect(() =>
      defineOccasionProfile({ meta, traits: {}, modules: [owner('one', ['oneClosed'])] }),
    ).toThrow(/names oneReopened, which one does not define/)
  })
})

describe('printing a closed workshop result', () => {
  test('replaces planned placements and attendance and keeps sign-ups live', () => {
    const plan = planOf(workshopWorld)
    const payload = {
      ...results.get('workshops')!.compute({ world: workshopWorld, plan }),
      ...revisions,
    } as {
      placements: { workshop_id: string; slot_id: string; space_id: string }[]
      attendance: { person_id: string; workshop_id: string }[]
      unassigned: { person_id: string }[]
    }
    const [dropped, ...kept] = payload.attendance
    const closed = { ...payload, attendance: kept, unassigned: [{ person_id: dropped!.person_id }] }
    const printed = planWithWorkshopsClosedResult(plan, closed)
    const attendance = printed.sections['workshop-assignment'] as {
      assignments: { person_id: string; workshop_id: string; slot_id: string }[]
      unassigned: { person_id: string; reason: string }[]
      signups: unknown[]
    }
    expect(
      attendance.assignments.map(({ person_id, workshop_id }) => ({ person_id, workshop_id })),
    ).toEqual(kept)
    expect(attendance.assignments.every(({ slot_id }) => slot_id !== '')).toBe(true)
    expect(attendance.unassigned.map(({ person_id }) => person_id)).toEqual([dropped!.person_id])
    expect(attendance.signups).toEqual(
      (plan.sections['workshop-assignment'] as { signups: unknown[] }).signups,
    )
    expect(planWithWorkshopsClosedResult(plan, {})).toBe(plan)
  })
})
