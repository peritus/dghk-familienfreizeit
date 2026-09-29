import { describe, expect, test } from 'vitest'
import { defineOccasionProfile } from '../../src/config/define.js'
import { derive } from '../../src/events/fold.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import {
  officialWorkshops,
  officialWorkshopsWorld,
} from '../../src/modules/official-workshops/index.js'
import {
  workshopScheduling,
  workshopSchedulingWorld,
} from '../../src/modules/workshop-scheduling/index.js'
import { workshopSpace, workshopSpaceWorld } from '../../src/modules/workshop-space/index.js'
import { workshopRankings } from '../../src/modules/workshop-rankings/index.js'
import { workshopAssignment } from '../../src/modules/workshop-assignment/index.js'

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
      top_n: 2,
      rank_weights: [3, 2, 1],
      minimum_workshops: 1,
      fairness_targets: {},
      fill_unassigned: true,
      max_repair_passes: 2,
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
      availability_windows: [
        { starts_at: '2027-04-30T08:00:00Z', ends_at: '2027-04-30T18:00:00Z' },
      ],
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
          birthdate: '2015-01-01',
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
        birthdate: '2015-01-01',
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

  test('records a fixed attendance decision as a workshop-attendance label', () => {
    const world = derive(
      [
        ...personEvents,
        event(
          'WorkshopAttendanceFixed',
          { person_id: 'per_a', workshop_ids: ['wks_ceramics'] },
          personEvents.length + 1,
        ),
      ],
      profile.validation_view,
    )
    expect(world.labels_by_entity['per_a']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'workshop-attendance', value: 'wks_ceramics' }),
      ]),
    )
  })

  test('full-restatement replaces the previous fixed set and an empty array clears it', () => {
    const withTwoFixed = [
      ...personEvents,
      secondWorkshop,
      event(
        'WorkshopAttendanceFixed',
        { person_id: 'per_a', workshop_ids: ['wks_ceramics', 'wks_painting'] },
        secondWorkshop.seq + 1,
      ),
    ]
    const worldWithBoth = derive(withTwoFixed, profile.validation_view)
    expect(
      worldWithBoth.labels_by_entity['per_a']?.filter(({ key }) => key === 'workshop-attendance'),
    ).toHaveLength(2)

    const nextSeq = withTwoFixed.length + 1
    const worldRestated = derive(
      [
        ...withTwoFixed,
        event(
          'WorkshopAttendanceFixed',
          { person_id: 'per_a', workshop_ids: ['wks_painting'] },
          nextSeq,
        ),
      ],
      profile.validation_view,
    )
    expect(
      worldRestated.labels_by_entity['per_a']?.filter(({ key }) => key === 'workshop-attendance'),
    ).toEqual([expect.objectContaining({ value: 'wks_painting' })])

    const worldCleared = derive(
      [
        ...withTwoFixed,
        event('WorkshopAttendanceFixed', { person_id: 'per_a', workshop_ids: [] }, nextSeq),
      ],
      profile.validation_view,
    )
    expect(
      worldCleared.labels_by_entity['per_a']?.filter(({ key }) => key === 'workshop-attendance'),
    ).toHaveLength(0)
  })

  test('rejects a fixed decision for an unknown person or workshop', () => {
    expect(() =>
      derive(
        [
          ...personEvents,
          event(
            'WorkshopAttendanceFixed',
            { person_id: 'per_unknown', workshop_ids: ['wks_ceramics'] },
            personEvents.length + 1,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/unknown person/)
    expect(() =>
      derive(
        [
          ...personEvents,
          event(
            'WorkshopAttendanceFixed',
            { person_id: 'per_a', workshop_ids: ['wks_missing'] },
            personEvents.length + 1,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/unknown workshop/)
  })

  test('rejects duplicate workshop ids in one fixed decision', () => {
    expect(() =>
      derive(
        [
          ...personEvents,
          event(
            'WorkshopAttendanceFixed',
            { person_id: 'per_a', workshop_ids: ['wks_ceramics', 'wks_ceramics'] },
            personEvents.length + 1,
          ),
        ],
        profile.validation_view,
      ),
    ).toThrow(/duplicate workshop/)
  })
})
