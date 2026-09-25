import { expect, test } from 'vitest'
import type { EventDraft } from '../../src/events/types.js'
import {
  deriveOrganiserWorld,
  initialOrganiserState,
  materializeDraftEvents,
  organiserReducer,
  draftCount,
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

test('draft batches materialize contiguous events and derive locally', () => {
  const loaded = organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [],
    build_revision: 'development',
    compatibility_revision: 1,
    principal_email: 'organiser@example.test',
  })
  const state = organiserReducer(loaded, { type: 'stage', events: [family] })
  expect(draftCount(state)).toBe(1)
  expect(materializeDraftEvents(state)[0]?.seq).toBe(1)
  expect(deriveOrganiserWorld(state).families.map(({ id }) => id)).toEqual(['fam_state'])
})

test('discard clears all drafts and exits drafting mode', () => {
  const loaded = loadedState()
  const one = organiserReducer(loaded, { type: 'stage', events: [family] })
  const two = organiserReducer(one, { type: 'stage', events: [family] })
  const drafting = organiserReducer(two, { type: 'toggle_drafting' })
  const discarded = organiserReducer(drafting, { type: 'discard' })
  expect(draftCount(discarded)).toBe(0)
  expect(discarded.change_mode).toBe('immediate')
})

test('an apply error keeps draft events in the derived organiser world', () => {
  const loaded = loadedState()
  const drafting = organiserReducer(loaded, { type: 'stage', events: [family] })
  const failed = organiserReducer(drafting, {
    type: 'failed',
    status: 'error',
    error: 'Die Änderungsentwürfe konnten nicht angewendet werden.',
  })

  expect(deriveOrganiserWorld(failed).families.map(({ id }) => id)).toEqual(['fam_state'])
  expect(draftCount(failed)).toBe(1)
  expect(failed.change_mode).toBe('drafting')
})

test('drafting mode cannot be disabled while drafts exist', () => {
  const drafting = organiserReducer(
    organiserReducer(loadedState(), { type: 'toggle_drafting' }),
    {
      type: 'stage',
      events: [family],
    },
  )

  const stillDrafting = organiserReducer(drafting, { type: 'toggle_drafting' })
  expect(stillDrafting.change_mode).toBe('drafting')

  const immediate = organiserReducer(stillDrafting, { type: 'discard' })
  expect(immediate.change_mode).toBe('immediate')
})

test('applying acknowledges only the submitted draft prefix', () => {
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
  expect(draftCount(applied)).toBe(1)
  expect(materializeDraftEvents(applied)[0]?.payload).toEqual(second.payload)
  expect(applied.committed).toHaveLength(1)
  expect(applied.change_mode).toBe('drafting')

  const completed = organiserReducer(applied, {
    type: 'applied',
    count: 1,
    events: [{ ...second, seq: 2 }],
  })
  expect(draftCount(completed)).toBe(0)
  expect(completed.change_mode).toBe('immediate')
})
