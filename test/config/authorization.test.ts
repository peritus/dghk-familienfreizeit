import { describe, expect, test } from 'vitest'
import { canAppendEvent } from '../../src/auth/authorization.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { familyGovernedLabelKeys } from '../../src/modules/family-preferences/index.js'
import { derive } from '../../src/events/fold.js'
import type { Event } from '../../src/events/types.js'

const events: Event[] = [
  {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'FamilyInvited',
    payload: { family_id: 'fam_1', email: 'a@test.invalid', display_name: 'A', locale: 'de' },
  },
]

const family = { kind: 'family' as const, email: 'a@test.invalid', family_id: 'fam_1' }
const organiser = { kind: 'organiser' as const, email: 'org@test.invalid' }

const labelSet: Event = {
  seq: 2,
  at: '2027-01-01T00:00:01Z',
  actor: 'a@test.invalid',
  subject: null,
  type: 'LabelSet',
  payload: { entity_id: 'fam_1', key: 'flag', value: true, strength: null, note: null },
}

const displayNameChanged: Event = {
  seq: 2,
  at: '2027-01-01T00:00:01Z',
  actor: 'org@test.invalid',
  subject: 'fam_1',
  type: 'FamilyDisplayNameChanged',
  payload: { family_id: 'fam_1', old_display_name: 'A', new_display_name: 'A family' },
}

const personUpdated: Event = {
  seq: 2,
  at: '2027-01-01T00:00:01Z',
  actor: 'a@test.invalid',
  subject: 'per_1',
  type: 'PersonUpdated',
  payload: {
    person_id: 'per_1',
    family_id: 'fam_1',
    given_name: 'Updated',
    family_name: 'Person',
    age: null,
    role: 'adult',
  },
}

const personEvents: Event[] = [
  ...events,
  {
    seq: 2,
    at: '2027-01-01T00:00:01Z',
    actor: 'org@test.invalid',
    subject: 'fam_1',
    type: 'PersonAdded',
    payload: {
      person_id: 'per_1',
      family_id: 'fam_1',
      given_name: 'A',
      family_name: 'Person',
      age: null,
      role: 'adult',
    },
  },
]

describe('event append authorization', () => {
  test('an organiser may LabelSet any key regardless of family_writable', () => {
    const world = derive(events)
    expect(canAppendEvent(organiser, labelSet, world, {})).toBe(true)
  })

  test('a family may LabelSet a key its own trait declares family_writable', () => {
    const world = derive(events)
    const config = { label_schemas: [{ key: 'flag', family_writable: true }] }
    expect(canAppendEvent(family, labelSet, world, config)).toBe(true)
  })

  test('a family may not LabelSet a key that is not declared family_writable', () => {
    const world = derive(events)
    expect(canAppendEvent(family, labelSet, world, {})).toBe(false)
    const config = { label_schemas: [{ key: 'flag', family_writable: false }] }
    expect(canAppendEvent(family, labelSet, world, config)).toBe(false)
  })

  test('family_writable does not bypass entity ownership', () => {
    const world = derive(events)
    const config = { label_schemas: [{ key: 'flag', family_writable: true }] }
    const otherFamilysLabel: Event = {
      ...labelSet,
      payload: { ...labelSet.payload, entity_id: 'fam_2' },
    }
    expect(canAppendEvent(family, otherFamilysLabel, world, config)).toBe(false)
  })

  test('display-name correction permits only the family that owns the identity', () => {
    const world = derive(events)
    expect(canAppendEvent(organiser, displayNameChanged, world, {})).toBe(true)
    expect(canAppendEvent(family, displayNameChanged, world, {})).toBe(true)
    expect(
      canAppendEvent({ ...family, family_id: 'fam_other' }, displayNameChanged, world, {}),
    ).toBe(false)
  })

  test('a family update is authorized by the existing person ownership, not the payload family', () => {
    const world = derive(personEvents)
    const otherFamily = { kind: 'family' as const, email: 'b@test.invalid', family_id: 'fam_2' }
    expect(canAppendEvent(family, personUpdated, world, {})).toBe(true)
    expect(
      canAppendEvent(
        otherFamily,
        { ...personUpdated, payload: { ...personUpdated.payload, family_id: 'fam_2' } },
        world,
        {},
      ),
    ).toBe(false)
  })

  const moduleEvent: Event = {
    seq: 2,
    at: '2027-01-01T00:00:01Z',
    actor: 'a@test.invalid',
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_1', name: 'Haupthaus', sort_key: 1 },
  } as unknown as Event

  test('a module event with no declared authorization rule denies a family principal (issue 022)', () => {
    const world = derive(events)
    expect(canAppendEvent(family, moduleEvent, world, {})).toBe(false)
  })

  test('a module event dispatches to its own declared authorization rule', () => {
    const world = derive(events)
    const organiserOnly = { event_authorize_dispatch: { BuildingAdded: () => false } }
    expect(canAppendEvent(family, moduleEvent, world, organiserOnly)).toBe(false)

    const anyoneMay = { event_authorize_dispatch: { BuildingAdded: () => true } }
    expect(canAppendEvent(family, moduleEvent, world, anyoneMay)).toBe(true)
  })

  test('an organiser may always append a module event regardless of its declared rule', () => {
    const world = derive(events)
    const organiserOnly = { event_authorize_dispatch: { BuildingAdded: () => false } }
    expect(canAppendEvent(organiser, moduleEvent, world, organiserOnly)).toBe(true)
  })
})

describe('feature narrowing of family label writes', () => {
  const config = { label_schemas: [{ key: 'flag', family_writable: true }] }
  const world = derive(events)

  test('a family write is rejected when its governing family feature is not offered', () => {
    expect(canAppendEvent(family, labelSet, world, config, () => true)).toBe(true)
    expect(canAppendEvent(family, labelSet, world, config, (key) => key !== 'flag')).toBe(false)
  })

  test('narrowing never grants a write ordinary authorisation refuses', () => {
    const closed = { label_schemas: [{ key: 'flag', family_writable: false }] }
    expect(canAppendEvent(family, labelSet, world, closed, () => true)).toBe(false)
  })

  test('aliases are narrowed by their canonical key', () => {
    const aliased = { ...config, aliases: { old: 'flag' } }
    const aliasSet = { ...labelSet, payload: { ...(labelSet.payload as object), key: 'old' } }
    expect(canAppendEvent(family, aliasSet as Event, world, aliased, (key) => key !== 'flag')).toBe(
      false,
    )
  })

  test('organiser writes are never gated by availability', () => {
    expect(canAppendEvent(organiser, labelSet, world, config, () => false)).toBe(true)
  })
})

describe('family governed label keys', () => {
  test('maps every control of a family-governed section to its family feature', () => {
    expect(Object.fromEntries(familyGovernedLabelKeys(luebben2027Profile))).toEqual({
      'response-needs-private-sanitary': 'family-preferences.family-room-wishes',
      'response-needs-accessible': 'family-preferences.family-room-wishes',
      'response-sole-occupancy': 'family-preferences.family-room-wishes',
      'needs-private-sanitary': 'family-preferences.family-room-wishes',
      'needs-accessible': 'family-preferences.family-room-wishes',
      'sole-occupancy': 'family-preferences.family-room-wishes',
      'family-note': 'family-preferences.family-room-wishes',
      'workshop-with': 'workshop-rankings.family-workshop-wishes',
      'prefers-workshop': 'workshop-rankings.family-workshop-wishes',
      'signed-up-for': 'workshop-rankings.family-workshop-wishes',
      'interested-in': 'workshop-rankings.family-workshop-wishes',
    })
  })
})
