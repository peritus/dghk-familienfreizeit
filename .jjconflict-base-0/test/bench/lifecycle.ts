import type { Event, JsonValue } from '../../src/events/types.ts'

export type LifecycleScenario = 'normal' | 'contention'

export type LifecyclePhase =
  | 'setup'
  | 'registration'
  | 'preferences'
  | 'rankings'
  | 'corrections'
  | 'decisions'
  | 'closing'

export type LifecycleAction = { phase: LifecyclePhase; first_seq: number; count: number }

/** Assumed occasion lifecycle, not an observed distribution or an exact-size log. */
export function lifecycleLog(
  families: number,
  scenario: LifecycleScenario = 'normal',
  seed = 2027,
) {
  if (!Number.isSafeInteger(families) || families < 1 || families > 2000)
    throw new Error('lifecycle families must be 1..2000')
  if (
    !['normal', 'contention'].includes(scenario) ||
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw new Error('invalid lifecycle scenario or seed')
  let randomState = seed >>> 0
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0
    return randomState / 0x100000000
  }
  const events: Event[] = []
  const actions: LifecycleAction[] = []
  let phase: LifecyclePhase = 'setup'
  const action = (
    batch: readonly { type: string; payload: JsonValue }[],
    actor = 'organiser@example.test',
  ) => {
    const first = events.length + 1
    for (const draft of batch)
      events.push({
        ...draft,
        seq: events.length + 1,
        at: new Date(Date.UTC(2027, 0, 1) + actions.length * 60000).toISOString(),
        actor,
        subject: null,
      })
    actions.push({ phase, first_seq: first, count: batch.length })
  }
  const set = (
    id: string,
    key: string,
    value: JsonValue,
    strength: 'required' | 'preferred' | null = null,
  ) => ({
    type: 'LabelSet',
    payload: { entity_id: id, key, value, strength, note: null },
  })
  const clear = (id: string, key: string) => ({
    type: 'LabelCleared',
    payload: { entity_id: id, key, value: null },
  })
  const rooms = Math.ceil(families * 1.2)
  const sizes = [2, 3, 4, 4, 5, 6]
  const households = Array.from({ length: families }, (_, family) => ({
    id: `fam_life_${family}`,
    email: `family-${family}@example.test`,
    size: sizes[Math.floor(random() * sizes.length)]!,
  }))
  const people: {
    id: string
    family_id: string
    given_name: string
    family_name: string
    age: number
    role: string
  }[] = []
  for (const [index, family] of households.entries())
    for (let member = 0; member < family.size; member++) {
      const adult = member < (index % 8 === 0 ? 1 : 2)
      const infant = !adult && member === family.size - 1 && index % 10 === 0
      people.push({
        id: `per_life_${people.length}`,
        family_id: family.id,
        given_name: `Person ${people.length}`,
        family_name: `Family ${index}`,
        age: adult ? 25 + Math.floor(random() * 30) : infant ? 1 : 4 + Math.floor(random() * 13),
        role: adult ? 'adult' : infant ? 'infant' : 'child',
      })
    }
  let beds = 0
  let places = 0
  for (let building = 0; building < 3; building++)
    action([
      {
        type: 'BuildingAdded',
        payload: {
          building_id: `bld_life_${building}`,
          name: `Building ${building}`,
          sort_key: building,
        },
      },
    ])
  for (let room = 0; room < rooms; room++) {
    const id = `rm_life_${room}`
    const capacity =
      room % (scenario === 'normal' ? 8 : 12) === 0 ? 6 : [2, 3, 4, 4, 5, 6, 6, 6][room % 8]!
    action([
      {
        type: 'RoomAdded',
        payload: {
          room_id: id,
          building_id: `bld_life_${room % 3}`,
          number: String(room + 1),
          floor: room % 2 === 0 ? 'ground' : 'first',
          room_type: room % 5 === 0 ? 'apartment' : 'standard',
          sort_key: room,
        },
      },
      set(id, 'sanitary', room % 3 === 0 ? 'private' : 'shared-floor'),
      set(id, 'price-per-bed-eur', 50 + (room % 30)),
      set(id, 'is-accessible', room % (scenario === 'normal' ? 8 : 12) === 0),
      set(id, 'suitable-for-two-families', room % 4 === 0),
    ])
    for (let place = 0; place < capacity;) {
      const sleeps = place === 0 && capacity >= 4 ? 2 : 1
      action([
        {
          type: 'BedAdded',
          payload: {
            bed_id: `bed_life_${beds++}`,
            room_id: id,
            label: `Bed ${place + 1}`,
            bed_type: sleeps === 2 ? 'double' : 'single',
            sleeps,
            sort_key: place,
          },
        },
      ])
      places += sleeps
      place += sleeps
    }
  }
  const workshopCapacity = Math.max(12, Math.ceil(people.length / 8))
  for (let space = 0; space < 12; space++)
    action([
      {
        type: 'WorkshopSpaceAdded',
        payload: {
          workshop_space_id: `wsp_life_${space}`,
          name: `Space ${space}`,
          location_description: 'Venue',
          capacity: workshopCapacity + 5,
          sort_key: space,
        },
      },
    ])
  for (let slot = 0; slot < 8; slot++) {
    const day = slot < 4 ? '2027-04-30' : '2027-05-01'
    const hour = 9 + (slot % 4) * 2
    action([
      {
        type: 'WorkshopSlotAdded',
        payload: {
          slot_id: `slot_life_${slot}`,
          starts_at: `${day}T${String(hour).padStart(2, '0')}:00:00Z`,
          ends_at: `${day}T${String(hour + 1).padStart(2, '0')}:30:00Z`,
          sort_key: slot,
        },
      },
    ])
  }
  for (let leader = 0; leader < 10; leader++)
    action([
      {
        type: 'ExternalLeaderAdded',
        payload: {
          external_leader_id: `ext_life_${leader}`,
          name: `Programme leader ${leader}`,
          phone: null,
          availability: ['slot_life_0', 'slot_life_1', 'slot_life_2'],
          sort_key: leader,
        },
      },
    ])
  const workshops = Array.from({ length: 30 }, (_, index) => ({
    workshop_id: `wks_life_${index}`,
    title: `Workshop ${index}`,
    description: 'A planned occasion activity.',
    audience: index % 5 === 0 ? 'children' : index % 5 === 1 ? 'adults' : 'all',
    age_min: index % 5 === 0 ? 6 : index % 5 === 1 ? 18 : 0,
    age_max: index % 5 === 0 ? 17 : 99,
    capacity: workshopCapacity,
    participation_mode: 'assigned',
    leader_ids: [`ext_life_${index % 10}`],
    needs: [] as string[],
    sort_key: index,
  }))
  for (const workshop of workshops) action([{ type: 'WorkshopAdded', payload: workshop }])
  // A bounded programme: ten activities in each of three slots; other slots remain available.
  for (let workshop = 0; workshop < 30; workshop++)
    action([
      set(`wks_life_${workshop}`, 'fixed-placement', {
        slot_id: `slot_life_${Math.floor(workshop / 10)}`,
        space_id: `wsp_life_${workshop % 10}`,
      }),
    ])
  action([{ type: 'WorkshopChoiceOpened', payload: {} }])
  phase = 'registration'
  for (const family of households) {
    action([
      {
        type: 'FamilyInvited',
        payload: {
          family_id: family.id,
          email: family.email,
          display_name: family.id,
          locale: 'de',
        },
      },
    ])
    for (const person of people.filter((person) => person.family_id === family.id)) {
      const { id, ...payload } = person
      action([{ type: 'PersonAdded', payload: { person_id: id, ...payload } }])
    }
  }
  phase = 'preferences'
  const preference = (
    family: number,
    key: string,
    value: string,
    strength: 'required' | 'preferred' | null,
  ) => {
    const household = households[family]!
    action(
      [
        clear(household.id, key),
        clear(household.id, `response-${key}`),
        strength
          ? set(household.id, key, value, strength)
          : set(household.id, `response-${key}`, true),
      ],
      household.email,
    )
  }
  for (const [family, household] of households.entries()) {
    preference(
      family,
      'needs-private-sanitary',
      'private-sanitary',
      family % 10 === 0 ? 'required' : family % 3 === 0 ? 'preferred' : null,
    )
    preference(
      family,
      'needs-accessible',
      'accessible',
      family % (scenario === 'normal' ? 25 : 12) === 0 ? 'required' : null,
    )
    preference(family, 'sole-occupancy', 'no-other-families', family % 3 === 0 ? 'preferred' : null)
    if (family % 5 === 0)
      action(
        [set(household.id, 'family-note', 'Arrival after dinner; please retain the room key.')],
        household.email,
      )
    if (family % 7 === 0 && family + 1 < families)
      action([set(household.id, 'apart-from', households[family + 1]!.id, 'required')])
  }
  for (const [index, person] of people.entries()) {
    const email = households.find((family) => family.id === person.family_id)!.email
    action([set(person.id, 'diet', ['meat', 'vegetarian', 'meat', 'vegan'][index % 4]!)], email)
    if (index % 10 === 0)
      action(
        [
          set(
            person.id,
            'food-note',
            'Please provide a nut-free meal and discuss ingredients on arrival.',
          ),
        ],
        email,
      )
    if (person.role === 'infant') action([set(person.id, 'does-not-need-a-bed', true)], email)
  }
  phase = 'rankings'
  const eligible = people.filter((person) => person.role !== 'infant')
  const choices = new Map<string, string[]>()
  const ranking = (person: (typeof people)[number], ids: readonly string[]) =>
    action(
      [
        clear(person.id, 'prefers-workshop'),
        ...ids.map((id, index) =>
          set(person.id, 'prefers-workshop', { workshop_id: id, rank: index + 1 }),
        ),
      ],
      households.find((family) => family.id === person.family_id)!.email,
    )
  for (const [index, person] of eligible.entries()) {
    const selected = [0, 1, 2].map((slot) => {
      const pool = workshops.filter(
        (workshop) =>
          Math.floor(workshop.sort_key / 10) === slot &&
          person.age >= workshop.age_min &&
          person.age <= workshop.age_max,
      )
      return pool[
        scenario === 'contention' && slot === 0 && index % 2 === 0 ? 0 : index % pool.length
      ]!.workshop_id
    })
    choices.set(person.id, selected)
    // The current picker emits clear + the whole list when each choice is added.
    for (let count = 1; count <= selected.length; count++) ranking(person, selected.slice(0, count))
  }
  phase = 'corrections'
  for (const [index, person] of people.entries()) {
    if (index % 10 === 0) {
      const { id, ...payload } = person
      action([
        {
          type: 'PersonUpdated',
          payload: { person_id: id, ...payload, given_name: `Corrected ${index}` },
        },
      ])
    }
    if (index % 20 === 0) action([set(person.id, 'diet', 'vegetarian')])
  }
  for (const [index, person] of eligible.entries())
    if (index % 5 === 0) {
      const ids = choices.get(person.id)!
      ranking(person, [ids[1]!, ids[0]!, ids[2]!])
    }
  for (let family = 0; family < families; family++)
    if (family % 10 === 0)
      preference(family, 'needs-private-sanitary', 'private-sanitary', 'preferred')
  phase = 'decisions'
  for (const [index, workshop] of workshops.entries())
    if (index % 10 === 0)
      action([
        {
          type: 'WorkshopUpdated',
          payload: { ...workshop, description: 'Updated meeting point: reception.' },
        },
      ])
  const phaseCounts = Object.fromEntries(
    ['setup', 'registration', 'preferences', 'rankings', 'corrections', 'decisions'].map((key) => [
      key,
      actions
        .filter((action) => action.phase === key)
        .reduce((sum, action) => sum + action.count, 0),
    ]),
  )
  return {
    events,
    scenario,
    actions,
    phaseCounts,
    scale: {
      families,
      persons: people.length,
      buildings: 3,
      rooms,
      beds,
      places,
      workshops: 30,
      spaces: 12,
      slots: 8,
      eligible_persons: eligible.length,
      external_leaders: 10,
      seed,
      actions: actions.length,
      log_bytes: new TextEncoder().encode(JSON.stringify(events)).byteLength,
    },
  }
}
