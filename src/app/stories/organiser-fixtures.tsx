import { useCallback, useMemo, useState, type Dispatch, type ReactNode } from 'react'
import { activeProfile } from '../../config/index.js'
import type { Event, EventDraft, JsonValue } from '../../events/types.js'
import { OrganiserContext, type OrganiserContextValue } from '../organiser/context.js'
import {
  deriveOrganiserWorld,
  initialOrganiserState,
  organiserReducer,
  type OrganiserAction,
  type OrganiserState,
} from '../organiser/state.js'

const actor = 'organiser@example.test'

export const organiserFixtureDrafts: readonly EventDraft[] = [
  {
    at: '2027-01-01T00:00:00Z',
    actor,
    subject: null,
    type: 'FamilyInvited',
    payload: {
      family_id: 'fam_sonnenberg',
      email: 'sonnenberg@example.test',
      display_name: 'Familie Sonnenberg',
      locale: 'de',
    },
  },
  {
    at: '2027-01-01T00:01:00Z',
    actor,
    subject: 'fam_sonnenberg',
    type: 'PersonAdded',
    payload: {
      person_id: 'per_lena',
      family_id: 'fam_sonnenberg',
      given_name: 'Lena',
      family_name: 'Sonnenberg',
      birthdate: '2014-06-12',
      role: 'child',
    },
  },
  {
    at: '2027-01-01T00:02:00Z',
    actor,
    subject: 'fam_sonnenberg',
    type: 'PersonAdded',
    payload: {
      person_id: 'per_martin',
      family_id: 'fam_sonnenberg',
      given_name: 'Martin',
      family_name: 'Sonnenberg',
      birthdate: null,
      role: 'adult',
    },
  },
  {
    at: '2027-01-01T00:03:00Z',
    actor,
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_haupthaus', name: 'Haupthaus', sort_key: 1 },
  },
  {
    at: '2027-01-01T00:04:00Z',
    actor,
    subject: null,
    type: 'RoomAdded',
    payload: {
      room_id: 'rm_101',
      building_id: 'bld_haupthaus',
      number: '101',
      floor: 'ground',
      room_type: 'standard',
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:05:00Z',
    actor,
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'rm_101', key: 'sanitary', value: 'private', strength: null, note: null },
  },
  {
    at: '2027-01-01T00:06:00Z',
    actor,
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'rm_101',
      key: 'price-per-bed-eur',
      value: 24,
      strength: null,
      note: null,
    },
  },
  {
    at: '2027-01-01T00:07:00Z',
    actor,
    subject: null,
    type: 'BedAdded',
    payload: {
      bed_id: 'bed_101_a',
      room_id: 'rm_101',
      label: 'Bett 1',
      bed_type: 'single',
      sleeps: 1,
      sleeping_room: null,
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:08:00Z',
    actor,
    subject: null,
    type: 'BedAdded',
    payload: {
      bed_id: 'bed_101_b',
      room_id: 'rm_101',
      label: 'Bett 2',
      bed_type: 'bunk',
      sleeps: 2,
      sleeping_room: null,
      sort_key: 2,
    },
  },
]

export const organiserFixtureEvents: readonly Event[] = organiserFixtureDrafts.map(
  (event, index) => ({
    ...event,
    seq: index + 1,
  }),
)

export const organiserPendingDraft: EventDraft = {
  at: '2027-01-01T00:09:00Z',
  actor,
  subject: null,
  type: 'LabelSet',
  payload: {
    entity_id: 'rm_101',
    key: 'has-common-room',
    value: true,
    strength: null,
    note: null,
  },
}

export const organiserFixtureState = organiserReducer(initialOrganiserState, {
  type: 'loaded',
  events: organiserFixtureEvents,
  build_revision: 'storybook',
  compatibility_revision: 1,
  principal_email: actor,
})

export const workshopCatalogueFixtureDrafts: readonly EventDraft[] = [
  {
    at: '2027-01-01T00:10:00Z',
    actor,
    subject: null,
    type: 'ExternalLeaderAdded',
    payload: {
      external_leader_id: 'ext_pereira',
      name: 'Pereira',
      phone: '0151 555 0901',
      availability: ['Fr 09:00–11:00', 'Sa 09:00–11:00'],
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:11:00Z',
    actor,
    subject: null,
    type: 'WorkshopAdded',
    payload: {
      workshop_id: 'wks_keramik',
      title: 'Keramik',
      description: 'Schalen und Figuren aus Ton, gebrannt bis Sonntag.',
      audience: 'children',
      age_min: 5,
      age_max: 14,
      capacity: 10,
      participation_mode: 'assigned',
      leader_ids: ['per_martin'],
      needs: ['Brennofen'],
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:12:00Z',
    actor,
    subject: null,
    type: 'WorkshopAdded',
    payload: {
      workshop_id: 'wks_wald',
      title: 'Waldexpedition',
      description: 'Spuren lesen, Tiere beobachten, ein Lager bauen.',
      audience: 'children',
      age_min: 5,
      age_max: 14,
      capacity: 14,
      participation_mode: 'assigned',
      leader_ids: ['per_martin'],
      needs: ['draußen'],
      sort_key: 2,
    },
  },
  {
    at: '2027-01-01T00:13:00Z',
    actor,
    subject: null,
    type: 'WorkshopAdded',
    payload: {
      workshop_id: 'wks_band',
      title: 'Bandprobe',
      description: 'Die Jugendgruppe probt offen. Wer mitspielen will, meldet sich an.',
      audience: 'all',
      age_min: 12,
      age_max: 99,
      capacity: 8,
      participation_mode: 'sign-up',
      leader_ids: ['ext_pereira'],
      needs: ['Bühne'],
      sort_key: 3,
    },
  },
  {
    at: '2027-01-01T00:14:00Z',
    actor,
    subject: null,
    type: 'WorkshopAdded',
    payload: {
      workshop_id: 'wks_schmieden',
      title: 'Schmieden',
      description: 'Einen Haken aus Eisen schmieden.',
      audience: 'children',
      age_min: 12,
      age_max: 15,
      capacity: 6,
      participation_mode: 'assigned',
      leader_ids: ['ext_pereira'],
      needs: ['Esse'],
      sort_key: 4,
    },
  },
  {
    at: '2027-01-01T00:15:00Z',
    actor,
    subject: null,
    type: 'WorkshopSpaceAdded',
    payload: {
      workshop_space_id: 'wsp_atelier',
      name: 'Atelier',
      location_description: 'Haupthaus',
      capacity: 12,
      availability_windows: [
        { starts_at: '2027-05-14T08:00:00Z', ends_at: '2027-05-14T18:00:00Z' },
      ],
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:16:00Z',
    actor,
    subject: null,
    type: 'WorkshopSpaceAdded',
    payload: {
      workshop_space_id: 'wsp_wiese',
      name: 'Wiese',
      location_description: 'Außengelände',
      capacity: 30,
      availability_windows: [
        { starts_at: '2027-05-14T08:00:00Z', ends_at: '2027-05-16T18:00:00Z' },
      ],
      sort_key: 2,
    },
  },
  {
    at: '2027-01-01T00:17:00Z',
    actor,
    subject: null,
    type: 'WorkshopSpaceAdded',
    payload: {
      workshop_space_id: 'wsp_halle',
      name: 'Halle',
      location_description: 'Haus 2',
      capacity: 24,
      availability_windows: [
        { starts_at: '2027-05-14T08:00:00Z', ends_at: '2027-05-16T18:00:00Z' },
      ],
      sort_key: 3,
    },
  },
  {
    at: '2027-01-01T00:18:00Z',
    actor,
    subject: null,
    type: 'WorkshopSlotAdded',
    payload: {
      slot_id: 'slot_fr_morning',
      starts_at: '2027-05-14T09:00:00Z',
      ends_at: '2027-05-14T11:00:00Z',
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:19:00Z',
    actor,
    subject: null,
    type: 'WorkshopSlotAdded',
    payload: {
      slot_id: 'slot_fr_late',
      starts_at: '2027-05-14T11:30:00Z',
      ends_at: '2027-05-14T13:30:00Z',
      sort_key: 2,
    },
  },
  {
    at: '2027-01-01T00:20:00Z',
    actor,
    subject: null,
    type: 'WorkshopSlotAdded',
    payload: {
      slot_id: 'slot_sa_morning',
      starts_at: '2027-05-15T09:00:00Z',
      ends_at: '2027-05-15T11:00:00Z',
      sort_key: 3,
    },
  },
]

export const organiserWorkshopFixtureState = workshopCatalogueFixtureDrafts.reduce(
  (state, event) => organiserReducer(state, { type: 'stage', events: [event] }),
  organiserFixtureState,
)

type AssignmentFixtureFamily = {
  family_id: string
  email: string
  display_name: string
  people: readonly {
    person_id: string
    given_name: string
    family_name: string
    birthdate: string | null
    role: string
  }[]
  requirement?: {
    key: string
    value: string
    strength: 'required' | 'preferred'
  }
}

const assignmentFixtureFeaturedFamilies: readonly AssignmentFixtureFamily[] = [
  {
    family_id: 'fam_seidel',
    email: 'seidel@example.test',
    display_name: 'Familie Seidel',
    people: [
      {
        person_id: 'per_seidel_mara',
        given_name: 'Mara',
        family_name: 'Seidel',
        birthdate: '1988-04-12',
        role: 'adult',
      },
      {
        person_id: 'per_seidel_jonas',
        given_name: 'Jonas',
        family_name: 'Seidel',
        birthdate: '1987-09-03',
        role: 'adult',
      },
      {
        person_id: 'per_seidel_lina',
        given_name: 'Lina',
        family_name: 'Seidel',
        birthdate: '2014-06-19',
        role: 'child',
      },
      {
        person_id: 'per_seidel_emil',
        given_name: 'Emil',
        family_name: 'Seidel',
        birthdate: '2017-01-22',
        role: 'child',
      },
      {
        person_id: 'per_seidel_noa',
        given_name: 'Noa',
        family_name: 'Seidel',
        birthdate: '2020-11-05',
        role: 'child',
      },
    ],
    requirement: { key: 'needs-accessible', value: 'accessible', strength: 'required' },
  },
  {
    family_id: 'fam_morgan',
    email: 'morgan@example.test',
    display_name: 'Familie Morgan',
    people: [
      {
        person_id: 'per_morgan_alex',
        given_name: 'Alex',
        family_name: 'Morgan',
        birthdate: '1989-02-14',
        role: 'adult',
      },
      {
        person_id: 'per_morgan_jamie',
        given_name: 'Jamie',
        family_name: 'Morgan',
        birthdate: '2018-08-30',
        role: 'child',
      },
    ],
    requirement: {
      key: 'needs-private-sanitary',
      value: 'private-sanitary',
      strength: 'preferred',
    },
  },
  {
    family_id: 'fam_rivera',
    email: 'rivera@example.test',
    display_name: 'Familie Rivera',
    people: [
      {
        person_id: 'per_rivera_sam',
        given_name: 'Sam',
        family_name: 'Rivera',
        birthdate: '1985-07-11',
        role: 'adult',
      },
      {
        person_id: 'per_rivera_kim',
        given_name: 'Kim',
        family_name: 'Rivera',
        birthdate: '1986-12-17',
        role: 'adult',
      },
      {
        person_id: 'per_rivera_toni',
        given_name: 'Toni',
        family_name: 'Rivera',
        birthdate: '2015-03-28',
        role: 'child',
      },
    ],
  },
  {
    family_id: 'fam_lang',
    email: 'lang@example.test',
    display_name: 'Familie Lang',
    people: [
      {
        person_id: 'per_lang_robin',
        given_name: 'Robin',
        family_name: 'Lang',
        birthdate: '1992-10-08',
        role: 'adult',
      },
    ],
  },
]

const assignmentFixtureGeneratedSurnames = [
  'Albrecht',
  'Baumann',
  'Conrad',
  'Dietrich',
  'Ebert',
  'Fischer',
  'Gaertner',
  'Hoffmann',
  'Jansen',
  'Keller',
  'Lehmann',
  'Mertens',
  'Neumann',
  'Otto',
  'Peters',
  'Quandt',
  'Richter',
  'Scholz',
  'Thiel',
  'Ullrich',
  'Vogt',
  'Wagner',
  'Yilmaz',
  'Ziegler',
  'Adler',
  'Becker',
  'Clausen',
  'Doering',
  'Engel',
  'Franke',
  'Grimm',
  'Hartmann',
  'Jaeger',
  'Koenig',
  'Lorenz',
] as const

const assignmentFixtureGivenNames = [
  'Anna',
  'Ben',
  'Clara',
  'David',
  'Ella',
  'Felix',
  'Greta',
  'Hannes',
] as const

function assignmentFixtureSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const assignmentFixtureGeneratedFamilies: readonly AssignmentFixtureFamily[] =
  assignmentFixtureGeneratedSurnames.map((surname, familyIndex) => {
    const peopleCount = 3 + (familyIndex % 3)
    const familySlug = assignmentFixtureSlug(surname)
    return {
      family_id: `fam_${familySlug}`,
      email: `${familySlug}@example.test`,
      display_name: `Familie ${surname}`,
      people: Array.from({ length: peopleCount }, (_, personIndex) => ({
        person_id: `per_${familySlug}_${personIndex + 1}`,
        given_name:
          assignmentFixtureGivenNames[
            (familyIndex + personIndex) % assignmentFixtureGivenNames.length
          ]!,
        family_name: surname,
        birthdate: null,
        role: personIndex < 2 ? 'adult' : 'child',
      })),
    }
  })

const assignmentFixtureFamilies: readonly AssignmentFixtureFamily[] = [
  ...assignmentFixtureFeaturedFamilies,
  ...assignmentFixtureGeneratedFamilies,
]

const assignmentFixtureBuildings = [
  { building_id: 'bld_haupthaus', name: 'Haupthaus', sort_key: 1 },
  { building_id: 'bld_gartenhaus', name: 'Gartenhaus', sort_key: 2 },
] as const

const assignmentFixtureAdditionalBuildings = [
  { building_id: 'bld_waldhaus', name: 'Waldhaus', sort_key: 3 },
  { building_id: 'bld_seeblick', name: 'Seeblick', sort_key: 4 },
  { building_id: 'bld_birkenhof', name: 'Birkenhof', sort_key: 5 },
  { building_id: 'bld_gaestehaus', name: 'Gästehaus', sort_key: 6 },
] as const

const assignmentFixtureAdditionalRooms = assignmentFixtureAdditionalBuildings.flatMap(
  (building, buildingIndex) =>
    (['ground', 'first'] as const).flatMap((floor, floorIndex) =>
      [4, 5, 5, 6, 6].map((places, roomIndex) => ({
        room_id: `rm_${assignmentFixtureSlug(building.name)}_${floor}_${roomIndex + 1}`,
        building_id: building.building_id,
        number: `${floorIndex + 1}${String(roomIndex + 1).padStart(2, '0')}`,
        floor,
        room_type: 'standard',
        sort_key: (floorIndex + 1) * 100 + roomIndex + 1,
        sanitary: roomIndex % 3 === 0 ? 'private' : 'shared-floor',
        price: 78 + roomIndex * 6 + buildingIndex * 2,
        accessible: buildingIndex === 0 && floor === 'ground' && roomIndex === 0,
        places,
      })),
    ),
)

const assignmentFixtureRooms = [
  {
    room_id: 'rm_12',
    building_id: 'bld_haupthaus',
    number: '12',
    floor: 'first',
    room_type: 'standard',
    sort_key: 12,
    sanitary: 'private',
    price: 103,
    accessible: false,
    places: 4,
  },
  {
    room_id: 'rm_14',
    building_id: 'bld_haupthaus',
    number: '14',
    floor: 'first',
    room_type: 'standard',
    sort_key: 14,
    sanitary: 'shared-floor',
    price: 88.5,
    accessible: false,
    places: 6,
  },
  {
    room_id: 'rm_16',
    building_id: 'bld_haupthaus',
    number: '16',
    floor: 'first',
    room_type: 'standard',
    sort_key: 16,
    sanitary: 'shared-floor',
    price: 88.5,
    accessible: false,
    places: 3,
  },
  {
    room_id: 'rm_garten_3',
    building_id: 'bld_gartenhaus',
    number: '3',
    floor: 'ground',
    room_type: 'standard',
    sort_key: 3,
    sanitary: 'private',
    price: 103,
    accessible: true,
    places: 2,
  },
] as const

function assignmentFixtureEvent(
  index: number,
  type: string,
  payload: JsonValue,
  subject: string | null = null,
): EventDraft {
  return {
    at: new Date(Date.UTC(2027, 0, 3, 10, 0, index)).toISOString(),
    actor: 'anna.keller@example.test',
    subject,
    type,
    payload,
  }
}

const assignmentFixtureDrafts: readonly EventDraft[] = (() => {
  const drafts: EventDraft[] = []
  const add = (type: string, payload: JsonValue, subject: string | null = null) => {
    drafts.push(assignmentFixtureEvent(drafts.length, type, payload, subject))
  }

  for (const family of assignmentFixtureFamilies) {
    add('FamilyInvited', {
      family_id: family.family_id,
      email: family.email,
      display_name: family.display_name,
      locale: 'de',
    })
    for (const person of family.people) {
      add('PersonAdded', { ...person, family_id: family.family_id }, family.family_id)
    }
    if (family.requirement) {
      add('LabelSet', {
        entity_id: family.family_id,
        key: family.requirement.key,
        value: family.requirement.value,
        strength: family.requirement.strength,
        note: null,
      })
    }
  }

  for (const building of [...assignmentFixtureBuildings, ...assignmentFixtureAdditionalBuildings]) {
    add('BuildingAdded', building)
  }
  for (const room of [...assignmentFixtureRooms, ...assignmentFixtureAdditionalRooms]) {
    add('RoomAdded', {
      room_id: room.room_id,
      building_id: room.building_id,
      number: room.number,
      floor: room.floor,
      room_type: room.room_type,
      sort_key: room.sort_key,
    })
    add('LabelSet', {
      entity_id: room.room_id,
      key: 'sanitary',
      value: room.sanitary,
      strength: null,
      note: null,
    })
    add('LabelSet', {
      entity_id: room.room_id,
      key: 'price-per-bed-eur',
      value: room.price,
      strength: null,
      note: null,
    })
    if (room.accessible) {
      add('LabelSet', {
        entity_id: room.room_id,
        key: 'is-accessible',
        value: true,
        strength: null,
        note: null,
      })
    }
    for (let index = 1; index <= room.places; index += 1) {
      add('BedAdded', {
        bed_id: `bed_${room.room_id.slice(3)}_${index}`,
        room_id: room.room_id,
        label: `Bett ${index}`,
        bed_type: 'single',
        sleeps: 1,
        sleeping_room: null,
        sort_key: index,
      })
    }
  }

  add('LabelSet', {
    entity_id: 'per_morgan_jamie',
    key: 'needs-ground-floor',
    value: 'ground-floor',
    strength: 'preferred',
    note: null,
  })

  return drafts
})()

export const organiserAssignmentFixtureEvents: readonly Event[] = assignmentFixtureDrafts.map(
  (event, index) => ({ ...event, seq: index + 1 }),
)

export const organiserAssignmentFixtureState = organiserReducer(initialOrganiserState, {
  type: 'loaded',
  events: organiserAssignmentFixtureEvents,
  build_revision: 'storybook-assignment-board',
  compatibility_revision: 1,
  principal_email: 'anna.keller@example.test',
})

const organiserAssignmentFixedEvents: readonly EventDraft[] = [
  assignmentFixtureEvent(0, 'LabelSet', {
    entity_id: 'fam_morgan',
    key: 'needs',
    value: 'fam_morgan_room',
    strength: 'required',
    note: null,
  }),
  assignmentFixtureEvent(1, 'LabelSet', {
    entity_id: 'rm_12',
    key: 'provides',
    value: 'fam_morgan_room',
    strength: null,
    note: null,
  }),
  assignmentFixtureEvent(2, 'LabelSet', {
    entity_id: 'fam_seidel',
    key: 'needs',
    value: 'fam_seidel_room',
    strength: 'required',
    note: null,
  }),
  assignmentFixtureEvent(3, 'LabelSet', {
    entity_id: 'rm_16',
    key: 'provides',
    value: 'fam_seidel_room',
    strength: null,
    note: null,
  }),
]

export const organiserAssignmentFixedFixtureState = organiserAssignmentFixedEvents.reduce(
  (state, draft) => organiserReducer(state, { type: 'stage', events: [draft] }),
  organiserAssignmentFixtureState,
)

export function stateWithDrafts(...drafts: readonly EventDraft[][]): OrganiserState {
  return drafts.reduce(
    (state, events) => organiserReducer(state, { type: 'stage', events }),
    organiserFixtureState,
  )
}

export function FixtureProvider({
  children,
  initialState = organiserFixtureState,
}: {
  children: ReactNode
  initialState?: OrganiserState
}) {
  const [state, dispatch] = useState<OrganiserState>(initialState)
  const update: Dispatch<OrganiserAction> = useCallback(
    (action) => dispatch((current) => organiserReducer(current, action)),
    [],
  )
  const stage = useCallback(
    (events: readonly EventDraft[]) => update({ type: 'stage', events }),
    [update],
  )
  const apply = useCallback(async () => undefined, [])
  const world = useMemo(() => deriveOrganiserWorld(state, activeProfile.validation_view), [state])
  const value: OrganiserContextValue = { state, world, dispatch: update, stage, apply }

  return <OrganiserContext.Provider value={value}>{children}</OrganiserContext.Provider>
}
