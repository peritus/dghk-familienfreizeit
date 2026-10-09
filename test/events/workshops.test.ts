import { describe, expect, test } from 'vitest'
import { defineOccasionProfile } from '../../src/config/define.js'
import { derive } from '../../src/events/fold.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import { prepareEventBatch } from '../../src/events/prepare.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'
import {
  fixedWorkshopAttendanceToken,
  officialWorkshops,
  officialWorkshopsWorld,
} from '../../src/modules/official-workshops/index.js'
import {
  workshopScheduling,
  workshopSchedulingWorld,
} from '../../src/modules/workshop-scheduling/index.js'
import { workshopSpace, workshopSpaceWorld } from '../../src/modules/workshop-space/index.js'
import {
  workshopRankings,
  workshopRankingsFromWorld,
  workshopRankingsWorld,
} from '../../src/modules/workshop-rankings/index.js'
import {
  workshopAssignment,
  workshopReviewReadiness,
  type WorkshopAssignmentSection,
} from '../../src/modules/workshop-assignment/index.js'
import type { WorkshopSchedulingSection } from '../../src/modules/workshop-scheduling/index.js'

const profile = defineOccasionProfile({
  meta: {
    id: 'workshop-fixture',
    name: 'Workshop fixture',
    description: 'Workshop fixture',
    starts_on: '2027-04-30',
    ends_on: '2027-05-02',
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
      workshops_per_person: 1,
    }),
  ],
})

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

const baseEvents: Event[] = [
  event(
    'WorkshopSpaceAdded',
    {
      workshop_space_id: 'wsp_hall',
      name: 'Halle',
      location_description: 'Erdgeschoss',
      capacity: 10,
      sort_key: 1,
    },
    1,
  ),
  event(
    'WorkshopSlotAdded',
    {
      slot_id: 'slot_morning',
      starts_at: '2027-04-30T09:00:00Z',
      ends_at: '2027-04-30T11:00:00Z',
      sort_key: 1,
    },
    2,
  ),
  event(
    'ExternalLeaderAdded',
    {
      external_leader_id: 'ext_anna',
      name: 'Anna Extern',
      phone: '+49 111',
      availability: ['slot_morning'],
      sort_key: 1,
    },
    3,
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
      leader_ids: ['ext_anna'],
      needs: [],
      sort_key: 1,
    },
    4,
  ),
]

describe('workshop domain events', () => {
  test('derives direct workshops, slots, spaces, and external leaders', () => {
    const world = derive(baseEvents, profile.validation_view)
    expect(officialWorkshopsWorld(world).workshops.map(({ id }) => id)).toEqual(['wks_ceramics'])
    expect(workshopSchedulingWorld(world).slots.map(({ id }) => id)).toEqual(['slot_morning'])
    expect(workshopSpaceWorld(world).live.map(({ id }) => id)).toEqual(['wsp_hall'])
    expect(officialWorkshopsWorld(world).external_leaders.map(({ id }) => id)).toEqual(['ext_anna'])
  })

  test('derives and clears a fixed workshop placement label', () => {
    const fixed = event(
      'LabelSet',
      {
        entity_id: 'wks_ceramics',
        key: 'fixed-placement',
        value: { slot_id: 'slot_morning', space_id: 'wsp_hall' },
        strength: null,
        note: 'Nähe zum Eingang',
      },
      5,
    )
    const world = derive([...baseEvents, fixed], profile.validation_view)
    expect(workshopSchedulingWorld(world).fixed_placements).toEqual([
      {
        workshop_id: 'wks_ceramics',
        slot_id: 'slot_morning',
        space_id: 'wsp_hall',
        note: 'Nähe zum Eingang',
      },
    ])

    const cleared = derive(
      [
        ...baseEvents,
        fixed,
        event(
          'LabelCleared',
          { entity_id: 'wks_ceramics', key: 'fixed-placement', value: null },
          6,
        ),
      ],
      profile.validation_view,
    )
    expect(workshopSchedulingWorld(cleared).fixed_placements).toEqual([])
  })

  test('rejects malformed fixed workshop placement labels', () => {
    expect(() =>
      derive(
        [
          ...baseEvents,
          event(
            'LabelSet',
            {
              entity_id: 'wks_ceramics',
              key: 'fixed-placement',
              value: { slot_id: 'slot_morning' },
              strength: null,
              note: null,
            },
            5,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/fixed-placement/)
  })

  test('cancellation keeps the workshop in labelled history and out of active planning', () => {
    const world = derive(
      [
        ...baseEvents,
        event('WorkshopCancelled', { workshop_id: 'wks_ceramics', reason: 'Leitung krank' }, 5),
      ],
      profile.validation_view,
    )
    expect(officialWorkshopsWorld(world).workshops).toHaveLength(0)
    expect(officialWorkshopsWorld(world).cancelled.map(({ id }) => id)).toEqual(['wks_ceramics'])
  })

  test('retirement removes the live workshop and preserves wishes, fixed decisions and prefix replay', () => {
    const committed = [
      ...baseEvents,
      event(
        'FamilyInvited',
        { family_id: 'fam_a', email: 'a@example.test', display_name: 'A', locale: 'de' },
        5,
      ),
      event(
        'PersonAdded',
        {
          person_id: 'per_a',
          family_id: 'fam_a',
          given_name: 'Ada',
          family_name: 'A',
          age: 12,
          role: 'child',
        },
        6,
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
        7,
      ),
      event(
        'LabelSet',
        {
          entity_id: 'per_a',
          key: 'needs',
          value: fixedWorkshopAttendanceToken('per_a', 'wks_ceramics'),
          strength: 'required',
          note: null,
        },
        8,
      ),
      event(
        'LabelSet',
        {
          entity_id: 'wks_ceramics',
          key: 'provides',
          value: fixedWorkshopAttendanceToken('per_a', 'wks_ceramics'),
          strength: null,
          note: null,
        },
        9,
      ),
      event(
        'LabelSet',
        {
          entity_id: 'per_a',
          key: 'signed-up-for',
          value: 'wks_ceramics',
          strength: null,
          note: null,
        },
        10,
      ),
      event(
        'LabelSet',
        {
          entity_id: 'per_a',
          key: 'interested-in',
          value: 'wks_ceramics',
          strength: null,
          note: null,
        },
        11,
      ),
    ]
    const before = derive(committed, profile.validation_view)
    const retirement = event(
      'WorkshopRetired',
      { workshop_id: 'wks_ceramics', reason: 'Entfernt' },
      12,
    )
    const { world: after, events: appended } = prepareEventBatch(
      committed,
      [retirement],
      profile.validation_view,
    )
    expect(officialWorkshopsWorld(after).workshops).toEqual([])
    expect(officialWorkshopsWorld(after).cancelled).toEqual([])
    expect(after.entities_by_kind.workshop ?? []).toEqual([])
    expect(after.labels_by_entity['wks_ceramics']).toBeUndefined()
    expect(after.labels_by_entity['per_a']).toEqual(before.labels_by_entity['per_a'])

    const contributions = composeSolverContributions(profile)
    const plan = solve(buildSolverInput(after, contributions), contributions, {
      build_revision: 'test',
      compatibility_revision: 1,
      event_date: profile.meta.starts_on,
      profile,
      seed: null,
    })
    expect((plan.sections['workshop-scheduling'] as WorkshopSchedulingSection).placements).toEqual(
      [],
    )
    const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection
    expect(attendance.assignments).toEqual([])
    expect(attendance.fixed_violations).toContainEqual({
      person_id: 'per_a',
      workshop_id: 'wks_ceramics',
      reasons: ['hard.cancellation'],
    })
    expect(attendance.unassigned.map(({ person_id }) => person_id)).toContain('per_a')
    expect(
      workshopReviewReadiness({ world: after, plan }).findings.some(
        ({ id }) => id === 'workshop-assignment.fixed-invalid',
      ),
    ).toBe(true)
    const prefix = [...committed, ...appended].slice(0, committed.length)
    expect(officialWorkshopsWorld(derive(prefix, profile.validation_view))).toEqual(
      officialWorkshopsWorld(before),
    )
  })

  test('retirement cannot append a dangling resolver constraint', () => {
    const committed = [
      ...baseEvents,
      event(
        'LabelSet',
        {
          entity_id: 'ext_anna',
          key: 'excludes',
          value: 'wks_ceramics',
          strength: 'required',
          note: null,
        },
        5,
      ),
    ]
    expect(() => prepareEventBatch(committed, [], profile.validation_view)).not.toThrow()
    expect(() =>
      prepareEventBatch(
        committed,
        [event('WorkshopRetired', { workshop_id: 'wks_ceramics', reason: null }, 6)],
        profile.validation_view,
      ),
    ).toThrow(/kernel.dangling-reference/)
    expect(
      officialWorkshopsWorld(derive(committed, profile.validation_view)).workshops,
    ).toHaveLength(1)
  })

  test('rejects overlapping or touching slots during replay', () => {
    expect(() =>
      derive(
        [
          ...baseEvents,
          event(
            'WorkshopSlotAdded',
            {
              slot_id: 'slot_late',
              starts_at: '2027-04-30T11:00:00Z',
              ends_at: '2027-04-30T12:00:00Z',
              sort_key: 2,
            },
            5,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/overlaps or touches/)
  })

  test('blocks a capacity reduction below live sign-ups', () => {
    const events = [
      event(
        'FamilyInvited',
        {
          family_id: 'fam_a',
          email: 'family@example.test',
          display_name: 'Familie A',
          locale: 'de',
        },
        1,
      ),
      event(
        'PersonAdded',
        {
          person_id: 'per_a',
          family_id: 'fam_a',
          given_name: 'Ada',
          family_name: 'A',
          age: 12,
          role: 'child',
        },
        2,
      ),
      ...baseEvents.map((item) => ({ ...item, seq: item.seq + 2 })),
      event(
        'LabelSet',
        {
          entity_id: 'per_a',
          key: 'signed-up-for',
          value: 'wks_ceramics',
          strength: null,
          note: null,
        },
        7,
      ),
      event(
        'WorkshopUpdated',
        {
          workshop_id: 'wks_ceramics',
          title: 'Keramik',
          description: 'Ton und Farbe',
          audience: 'children',
          age_min: 6,
          age_max: 14,
          capacity: 0,
          participation_mode: 'sign-up',
          leader_ids: ['ext_anna'],
          needs: [],
          sort_key: 1,
        },
        8,
      ),
    ]
    expect(() => derive(events, profile.validation_view)).toThrow(/D30/)
  })

  const personEvents: Event[] = [
    event(
      'FamilyInvited',
      { family_id: 'fam_a', email: 'family@example.test', display_name: 'Familie A', locale: 'de' },
      1,
    ),
    event(
      'PersonAdded',
      {
        person_id: 'per_a',
        family_id: 'fam_a',
        given_name: 'Ada',
        family_name: 'A',
        age: 12,
        role: 'child',
      },
      2,
    ),
    ...baseEvents.map((item) => ({ ...item, seq: item.seq + 2 })),
  ]
  const secondWorkshop = event(
    'WorkshopAdded',
    {
      workshop_id: 'wks_painting',
      title: 'Malen',
      description: 'Farbe und Leinwand',
      audience: 'children',
      age_min: 6,
      age_max: 14,
      capacity: 8,
      participation_mode: 'assigned',
      leader_ids: [],
      needs: [],
      sort_key: 2,
    },
    personEvents.length + 1,
  )

  test('records fixed attendance as paired generic need and capability labels', () => {
    const token = fixedWorkshopAttendanceToken('per_a', 'wks_ceramics')
    const world = derive(
      [
        ...personEvents,
        event(
          'LabelSet',
          { entity_id: 'per_a', key: 'needs', value: token, strength: 'required', note: null },
          personEvents.length + 1,
        ),
        event(
          'LabelSet',
          { entity_id: 'wks_ceramics', key: 'provides', value: token, strength: null, note: null },
          personEvents.length + 2,
        ),
      ],
      profile.validation_view,
    )
    expect(world.labels_by_entity['per_a']).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'needs', value: token })]),
    )
    expect(world.labels_by_entity['wks_ceramics']).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'provides', value: token })]),
    )
  })

  test('fixed workshop decisions are independent and clear through their paired labels', () => {
    const ceramics = fixedWorkshopAttendanceToken('per_a', 'wks_ceramics')
    const painting = fixedWorkshopAttendanceToken('per_a', 'wks_painting')
    const withTwoFixed = [
      ...personEvents,
      secondWorkshop,
      event(
        'LabelSet',
        { entity_id: 'per_a', key: 'needs', value: ceramics, strength: 'required', note: null },
        secondWorkshop.seq + 1,
      ),
      event(
        'LabelSet',
        { entity_id: 'wks_ceramics', key: 'provides', value: ceramics, strength: null, note: null },
        secondWorkshop.seq + 2,
      ),
      event(
        'LabelSet',
        { entity_id: 'per_a', key: 'needs', value: painting, strength: 'required', note: null },
        secondWorkshop.seq + 3,
      ),
      event(
        'LabelSet',
        { entity_id: 'wks_painting', key: 'provides', value: painting, strength: null, note: null },
        secondWorkshop.seq + 4,
      ),
    ]
    const nextSeq = secondWorkshop.seq + 5
    const worldCleared = derive(
      [
        ...withTwoFixed,
        event('LabelCleared', { entity_id: 'per_a', key: 'needs', value: ceramics }, nextSeq),
        event(
          'LabelCleared',
          { entity_id: 'wks_ceramics', key: 'provides', value: ceramics },
          nextSeq + 1,
        ),
      ],
      profile.validation_view,
    )
    expect(worldCleared.labels_by_entity['per_a']?.filter(({ key }) => key === 'needs')).toEqual([
      expect.objectContaining({ value: painting }),
    ])
    expect(
      worldCleared.labels_by_entity['wks_ceramics']?.filter(({ key }) => key === 'provides'),
    ).toHaveLength(0)
  })

  test('WorkshopAdded defaults leader_ids and needs to empty when omitted', () => {
    const world = derive(
      [
        event(
          'WorkshopAdded',
          {
            workshop_id: 'wks_minimal',
            title: 'Minimal',
            description: 'Minimal',
            audience: 'children',
            age_min: 0,
            age_max: 18,
            capacity: 5,
            participation_mode: 'assigned',
            sort_key: 1,
          },
          1,
        ),
      ],
      profile.validation_view,
    )
    const workshop = officialWorkshopsWorld(world).workshops[0]!
    expect(workshop.leader_ids).toEqual([])
    expect(workshop.needs).toEqual([])
  })

  test('a leader can be added to a workshop through an ordinary generic LabelSet', () => {
    const world = derive(
      [
        event(
          'WorkshopAdded',
          {
            workshop_id: 'wks_minimal',
            title: 'Minimal',
            description: 'Minimal',
            audience: 'children',
            age_min: 0,
            age_max: 18,
            capacity: 5,
            participation_mode: 'assigned',
            sort_key: 1,
          },
          1,
        ),
        event(
          'FamilyInvited',
          {
            family_id: 'fam_a',
            email: 'family@example.test',
            display_name: 'Familie A',
            locale: 'de',
          },
          2,
        ),
        event(
          'PersonAdded',
          {
            person_id: 'per_a',
            family_id: 'fam_a',
            given_name: 'Ada',
            family_name: 'A',
            age: 12,
            role: 'child',
          },
          3,
        ),
        event(
          'LabelSet',
          { entity_id: 'wks_minimal', key: 'leader', value: 'per_a', strength: null, note: null },
          4,
        ),
      ],
      profile.validation_view,
    )
    const workshop = officialWorkshopsWorld(world).workshops[0]!
    expect(workshop.leader_ids).toEqual(['per_a'])
  })

  test('ExternalLeaderAdded defaults availability to empty when omitted', () => {
    const world = derive(
      [
        event(
          'ExternalLeaderAdded',
          { external_leader_id: 'ext_minimal', name: 'Minimal', phone: null, sort_key: 1 },
          1,
        ),
      ],
      profile.validation_view,
    )
    expect(officialWorkshopsWorld(world).external_leaders[0]!.availability).toEqual([])
  })

  test('a compact "workshop_id:rank" string is an equivalent ranking value to the object form', () => {
    const rankingParams = {
      ranking_trait: 'prefers-workshop',
      max_rank: 3,
      allow_no_preference: true,
    }
    const rankingFor = (value: JsonValue) =>
      workshopRankingsFromWorld(
        derive(
          [
            ...personEvents,
            event(
              'LabelSet',
              { entity_id: 'per_a', key: 'prefers-workshop', value, strength: null, note: null },
              personEvents.length + 1,
            ),
          ],
          profile.validation_view,
        ),
        rankingParams,
      )
    expect(rankingFor('wks_ceramics:1')).toEqual(
      rankingFor({ workshop_id: 'wks_ceramics', rank: 1 }),
    )
  })

  test('exposes ranked choices as an event-derived organiser read model', () => {
    const world = derive(
      [
        ...personEvents,
        event(
          'LabelSet',
          {
            entity_id: 'per_a',
            key: 'prefers-workshop',
            value: { workshop_id: 'wks_ceramics', rank: 1 },
            strength: null,
            note: null,
          },
          personEvents.length + 1,
        ),
      ],
      profile.validation_view,
    )

    expect(workshopRankingsWorld(world).rankings).toEqual([
      { person_id: 'per_a', choices: [{ workshop_id: 'wks_ceramics', rank: 1 }] },
    ])
  })
})

describe('opening workshop choice', () => {
  test('records the opening as a phase fact once', () => {
    const world = derive(
      [...baseEvents, event('WorkshopChoiceOpened', {}, 5)],
      profile.validation_view,
    )
    expect(world.phase_facts.opened).toEqual({
      'workshop-rankings.choice': { seq: 5, at: '2027-04-30T00:00:00.000Z' },
    })
  })

  test('rejects a second opening', () => {
    expect(() =>
      derive(
        [...baseEvents, event('WorkshopChoiceOpened', {}, 5), event('WorkshopChoiceOpened', {}, 6)],
        profile.validation_view,
      ),
    ).toThrow(/already open/)
  })

  test('rejects opening without an active workshop', () => {
    expect(() => derive([event('WorkshopChoiceOpened', {}, 1)], profile.validation_view)).toThrow(
      /at least one active workshop/,
    )
    expect(() =>
      derive(
        [
          ...baseEvents,
          event('WorkshopCancelled', { workshop_id: 'wks_ceramics', reason: 'Leitung krank' }, 5),
          event('WorkshopChoiceOpened', {}, 6),
        ],
        profile.validation_view,
      ),
    ).toThrow(/at least one active workshop/)
  })

  test('rejects a payload and authorises only organisers', () => {
    expect(() =>
      derive(
        [...baseEvents, event('WorkshopChoiceOpened', { early: true }, 5)],
        profile.validation_view,
      ),
    ).toThrow()
    const authorize = profile.validation_view.event_authorize_dispatch!['WorkshopChoiceOpened']!
    const world = derive(baseEvents, profile.validation_view)
    expect(authorize({ kind: 'organiser', email: 'o@example.test' }, {}, world)).toBe(true)
    expect(
      authorize({ kind: 'family', email: 'f@example.test', family_id: 'fam_1' }, {}, world),
    ).toBe(false)
  })
})
