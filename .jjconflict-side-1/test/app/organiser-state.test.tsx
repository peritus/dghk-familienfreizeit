import { expect, test } from 'vitest'
import type { EventDraft } from '../../src/events/types.js'
import {
  deriveWorld,
  initialOrganiserState,
  materializeDraftEvents,
  organiserReducer,
  draftCount,
  saveStatusView,
} from '../../src/app/organiser/state.js'

const family = {
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
} satisfies EventDraft

function loadedState() {
  return organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [],
    build_revision: 'development',
    compatibility_revision: 1,
    feature_overrides: [],
    principal_email: 'organiser@example.test',
  })
}

test('draft batches materialize contiguous events and derive locally', () => {
  const loaded = organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [],
    build_revision: 'development',
    compatibility_revision: 1,
    feature_overrides: [],
    principal_email: 'organiser@example.test',
  })
  const state = organiserReducer(loaded, { type: 'stage', events: [family] })
  expect(draftCount(state)).toBe(1)
  expect(materializeDraftEvents(state)[0]?.seq).toBe(1)
  expect(deriveWorld(state).families.map(({ id }) => id)).toEqual(['fam_state'])
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

  expect(deriveWorld(failed).families.map(({ id }) => id)).toEqual(['fam_state'])
  expect(draftCount(failed)).toBe(1)
  expect(failed.change_mode).toBe('drafting')
})

test('save status reflects a save failure, never a load failure', () => {
  const saveFailed = organiserReducer(loadedState(), {
    type: 'failed',
    status: 'error',
    error: 'Die Änderungsentwürfe konnten nicht angewendet werden.',
  })
  expect(saveStatusView(saveFailed)).toEqual({ kind: 'failed' })
  const pending = organiserReducer(loadedState(), { type: 'stage', events: [family] })
  expect(saveStatusView({ ...pending, status: 'error' })).toEqual({ kind: 'failed' })
  expect(saveStatusView({ ...pending, status: 'stale_head' })).toEqual({ kind: 'failed' })

  const loadFailed = organiserReducer(initialOrganiserState, {
    type: 'failed',
    status: 'load_error',
    error: 'Die Familiendaten konnten nicht geladen werden.',
  })
  expect(saveStatusView(loadFailed)).not.toEqual({ kind: 'failed' })
})

test('drafting mode cannot be disabled while drafts exist', () => {
  const drafting = organiserReducer(organiserReducer(loadedState(), { type: 'toggle_drafting' }), {
    type: 'stage',
    events: [family],
  })

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

test('last saved time is successful browser-session metadata, never inferred from log events', () => {
  const loaded = loadedState()
  expect(loaded.last_saved_at).toBeUndefined()
  const staged = organiserReducer(loaded, { type: 'stage', events: [family] })
  expect(staged.last_saved_at).toBeUndefined()
  const applying = organiserReducer(staged, { type: 'applying' })
  const saved = organiserReducer(applying, {
    type: 'applied',
    count: 1,
    events: [{ ...family, seq: 1 }],
    saved_at: '2026-10-08T19:45:00.000Z',
  })
  expect(saved.last_saved_at).toBe('2026-10-08T19:45:00.000Z')
  expect(saved.change_mode).toBe('immediate')
  const failed = organiserReducer(saved, { type: 'failed', status: 'error', error: 'Save failed' })
  expect(failed.last_saved_at).toBe(saved.last_saved_at)
  expect(organiserReducer(failed, { type: 'discard' }).last_saved_at).toBe(saved.last_saved_at)
})

test('group recovery preserves other groups and rejects edits to the in-flight prefix', () => {
  const one = organiserReducer(loadedState(), { type: 'stage', events: [family] })
  const two = organiserReducer(one, {
    type: 'stage',
    events: [
      {
        ...family,
        type: 'FamilyDisplayNameChanged',
        payload: { family_id: 'fam_state', old_display_name: 'State', new_display_name: 'Other' },
      },
    ],
  })
  const first = two.drafts[0]!.id!,
    second = two.drafts[1]!.id!
  const applying = organiserReducer(two, { type: 'applying' })
  expect(saveStatusView(applying)).toEqual({ kind: 'saving' })
  expect(organiserReducer(applying, { type: 'discard-group', group_id: first })).toBe(applying)
  expect(organiserReducer(applying, { type: 'replace-group', group_id: first, events: [] })).toBe(
    applying,
  )
  const three = organiserReducer(applying, { type: 'stage', events: [family] })
  const corrected = organiserReducer(three, {
    type: 'replace-group',
    group_id: three.drafts[2]!.id!,
    events: [],
  })
  expect(corrected.drafts[0]).toBe(applying.drafts[0])
  expect(corrected.drafts[1]).toBe(applying.drafts[1])
  const failed = organiserReducer(applying, { type: 'failed', status: 'error', error: 'sanitized' })
  const discarded = organiserReducer(failed, { type: 'discard-group', group_id: first })
  expect(discarded.drafts.map((group) => group.id)).toEqual([second])
  const replaced = organiserReducer(failed, {
    type: 'replace-group',
    group_id: second,
    events: [family],
  })
  expect(replaced.drafts[1]!.id).toBe(second)
  expect(replaced.drafts[0]).toBe(two.drafts[0])
  expect(two.drafts).toHaveLength(2)
})
