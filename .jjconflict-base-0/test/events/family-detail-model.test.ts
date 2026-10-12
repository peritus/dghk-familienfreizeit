import { test, expect } from 'vitest'
import { derive } from '../../src/events/fold.js'
import { parseEvent, eventPayloadSchemas } from '../../src/events/types.js'
import { activeProfile } from '../../src/config/index.js'
import { buildFamilyDetailData } from '../../src/family-detail/read-model.js'
import { familyChangeEvents } from '../../src/family-detail/changes.js'

const schema = eventPayloadSchemas(activeProfile.validation_view)
const draft = (type: string, payload: unknown, seq: number) =>
  parseEvent(
    { seq, type, payload, at: '2026-10-01T00:00:00Z', actor: 'org@example.test', subject: null },
    schema,
  )
const events = [
  draft(
    'FamilyInvited',
    { family_id: 'fam_a', email: 'a@example.test', display_name: 'A', locale: 'de' },
    1,
  ),
  draft(
    'FamilyInvited',
    { family_id: 'fam_b', email: 'b@example.test', display_name: 'Hidden family', locale: 'de' },
    2,
  ),
  draft(
    'PersonAdded',
    {
      person_id: 'per_a',
      family_id: 'fam_a',
      given_name: 'Own',
      family_name: 'A',
      role: 'child',
      age: 9,
    },
    3,
  ),
  draft(
    'PersonAdded',
    {
      person_id: 'per_b',
      family_id: 'fam_b',
      given_name: 'Hidden',
      family_name: 'B',
      role: 'child',
      age: 9,
    },
    4,
  ),
  draft(
    'LabelSet',
    {
      entity_id: 'fam_a',
      key: 'apart-from',
      value: 'fam_b',
      strength: 'required',
      note: 'Hidden note',
    },
    5,
  ),
]
test('family model is an allowlisted representation, excluding hidden identities and derived internals', () => {
  const world = derive(events, activeProfile.validation_view)
  const data = buildFamilyDetailData(world, activeProfile, 'fam_a', {
    audience: 'family',
    now: '2026-10-11T00:00:00Z',
  })
  expect(data.people.map((person) => person.id)).toEqual(['per_a'])
  expect(JSON.stringify(data)).not.toMatch(
    /fam_b|per_b|Hidden|head_seq|set_seq|diagnostics|summaries|apart-from/,
  )
  expect(data.can_edit_email).toBe(false)
  expect(data.can_remove_person).toBe(false)
})
test('both adapters can use the same answer intent semantics including explicit indifference', () => {
  const world = derive(events, activeProfile.validation_view)
  const changes = familyChangeEvents(
    {
      type: 'preference',
      target_id: 'fam_a',
      key: 'needs-private-sanitary',
      answer: { values: [], answered: true },
    },
    world,
    'fam_a',
    'a@example.test',
    '2026-10-11T00:00:00Z',
  )
  const data = buildFamilyDetailData(
    derive(
      [
        ...events,
        ...changes.map((event, index) =>
          parseEvent({ ...event, seq: events.length + index + 1 }, schema),
        ),
      ],
      activeProfile.validation_view,
    ),
    activeProfile,
    'fam_a',
    { audience: 'family', now: '2026-10-11T00:00:00Z' },
  )
  expect(data.preferences.fam_a?.['needs-private-sanitary']?.answer).toEqual({
    values: [],
    answered: true,
  })
})
