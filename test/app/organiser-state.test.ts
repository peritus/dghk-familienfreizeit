import { expect, test } from 'vitest'
import type { EventDraft } from '../../src/events/store.js'
import {
  deriveOrganiserWorld,
  initialOrganiserState,
  materializePendingEvents,
  organiserReducer,
  pendingEventCount,
} from '../../src/app/organiser/state.js'

const family: EventDraft = {
  at: '2027-01-01T00:00:00Z',
  actor: 'organiser@example.test',
  subject: null,
  type: 'FamilyInvited',
  payload: {
    family_id: 'fam_state',
    email: 'state@example.test',
    display_name: 'State',
    locale: 'de',
  },
}

test('pending actions materialize contiguous events and derive locally', () => {
  const loaded = organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [],
    build_revision: 'development',
    compatibility_revision: 1,
    principal_email: 'organiser@example.test',
  })
  const state = organiserReducer(loaded, { type: 'stage', events: [family] })
  expect(pendingEventCount(state)).toBe(1)
  expect(materializePendingEvents(state)[0]?.seq).toBe(1)
  expect(deriveOrganiserWorld(state).families.map(({ id }) => id)).toEqual(['fam_state'])
})

test('undo removes one grouped action and discard clears all pending work', () => {
  const loaded = organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [],
    build_revision: 'development',
    compatibility_revision: 1,
    principal_email: 'organiser@example.test',
  })
  const one = organiserReducer(loaded, { type: 'stage', events: [family] })
  const two = organiserReducer(one, { type: 'stage', events: [family] })
  expect(pendingEventCount(organiserReducer(two, { type: 'undo' }))).toBe(1)
  expect(pendingEventCount(organiserReducer(two, { type: 'discard' }))).toBe(0)
})
