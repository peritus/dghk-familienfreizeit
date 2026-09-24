import { expect, test } from 'vitest'
import type { EventDraft } from '../../src/events/types.js'
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

function loadedState() {
  return organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [],
    build_revision: 'development',
    compatibility_revision: 1,
    principal_email: 'organiser@example.test',
  })
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
  const loaded = loadedState()
  const one = organiserReducer(loaded, { type: 'stage', events: [family] })
  const two = organiserReducer(one, { type: 'stage', events: [family] })
  expect(pendingEventCount(organiserReducer(two, { type: 'undo' }))).toBe(1)
  expect(pendingEventCount(organiserReducer(two, { type: 'discard' }))).toBe(0)
})

test('an apply error keeps pending events in the derived organiser world', () => {
  const loaded = loadedState()
  const pending = organiserReducer(loaded, { type: 'stage', events: [family] })
  const failed = organiserReducer(pending, {
    type: 'failed',
    status: 'error',
    error: 'Die Änderungen konnten nicht angewendet werden.',
  })

  expect(deriveOrganiserWorld(failed).families.map(({ id }) => id)).toEqual(['fam_state'])
  expect(pendingEventCount(failed)).toBe(1)
  expect(failed.commit_mode).toBe('collecting')
  expect(failed.review_open).toBe(true)
})

test('collecting mode cannot be disabled while events are pending', () => {
  const collecting = organiserReducer(
    organiserReducer(loadedState(), { type: 'toggle_collecting' }),
    {
      type: 'stage',
      events: [family],
    },
  )

  const stillCollecting = organiserReducer(collecting, { type: 'toggle_collecting' })
  expect(stillCollecting.commit_mode).toBe('collecting')

  const immediate = organiserReducer(organiserReducer(stillCollecting, { type: 'discard' }), {
    type: 'toggle_collecting',
  })
  expect(immediate.commit_mode).toBe('immediate')
})

test('applying acknowledges only the submitted pending prefix', () => {
  const first = { ...family, payload: { ...family.payload, family_id: 'fam_first' } }
  const second = { ...family, payload: { ...family.payload, family_id: 'fam_second' } }
  const staged = organiserReducer(
    organiserReducer(loadedState(), { type: 'stage', events: [first] }),
    { type: 'stage', events: [second] },
  )

  const applied = organiserReducer(staged, {
    type: 'applied',
    count: 1,
    events: [{ ...first, seq: 1 }],
  })
  expect(pendingEventCount(applied)).toBe(1)
  expect(materializePendingEvents(applied)[0]?.payload).toEqual(second.payload)
  expect(applied.committed).toHaveLength(1)
})
