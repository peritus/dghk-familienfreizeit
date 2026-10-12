import { cleanup, fireEvent, render, screen, within, act } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { DraftGroupEditor } from '../../src/app/organiser/draft-group-editor.js'
import { AttentionDetails, AttentionNotices } from '../../src/app/organiser/attention.js'
import { OrganiserContext } from '../../src/app/organiser/context.js'
import { initialOrganiserState, organiserReducer } from '../../src/app/organiser/state.js'
import { operationFeedback } from '../../src/attention/operations.js'
import { derive } from '../../src/events/fold.js'
import type { EventDraft } from '../../src/events/types.js'
import type { AttentionItem } from '../../src/attention/types.js'
afterEach(() => cleanup())
const draft: EventDraft = {
  at: '2027-01-01T00:00:00Z',
  actor: 'organiser@example.test',
  subject: 'wks_a',
  type: 'WorkshopUpdated',
  payload: {
    workshop_id: 'wks_a',
    title: 'Titel',
    description: '',
    audience: 'all',
    age_min: 0,
    age_max: 99,
    capacity: 2,
    participation_mode: 'assigned',
    leader_ids: [],
    needs: [],
    sort_key: 1,
  },
}
const staged = organiserReducer(
  { ...initialOrganiserState, status: 'ready' },
  { type: 'stage', events: [draft] },
)
test('group correction replaces its atomic events and preserves durable identities', () => {
  const dispatch = vi.fn(),
    close = vi.fn()
  render(
    <OrganiserContext.Provider
      value={{ state: staged, world: null, dispatch, stage: vi.fn(), apply: async () => {} }}
    >
      <DraftGroupEditor group_id={staged.drafts[0]!.id!} onClose={close} />
    </OrganiserContext.Provider>,
  )
  fireEvent.change(screen.getByLabelText('Plätze'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Korrektur übernehmen' }))
  expect(dispatch).toHaveBeenCalledWith({
    type: 'replace-group',
    group_id: staged.drafts[0]!.id,
    events: [{ ...draft, payload: { ...(draft.payload as object), capacity: 3 } }],
  })
  expect(close).toHaveBeenCalledOnce()
  expect(screen.queryByLabelText('workshop_id')).toBeNull()
})
test('a submitted group cannot be corrected or discarded from its editor', () => {
  const state = organiserReducer(staged, { type: 'applying' })
  render(
    <OrganiserContext.Provider
      value={{ state, world: null, dispatch: vi.fn(), stage: vi.fn(), apply: async () => {} }}
    >
      <DraftGroupEditor group_id={state.drafts[0]!.id!} onClose={vi.fn()} />
    </OrganiserContext.Provider>,
  )
  expect(
    (screen.getByRole('button', { name: 'Korrektur übernehmen' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(
    (screen.getByRole('button', { name: 'Gruppe verwerfen' }) as HTMLButtonElement).disabled,
  ).toBe(true)
})
test('print includes all selected attention and its evidence while screen details remain bounded', () => {
  const items: AttentionItem[] = Array.from({ length: 12 }, (_, index) => ({
    ...operationFeedback('invalid-field'),
    id: `input-${index}`,
    wording: { title: `Angabe ${index}`, detail: 'Prüfen', reasons: [] },
    evidence: { capacity: index },
  }))
  const result = { items, coverage: [] }
  const view = render(
    <OrganiserContext.Provider
      value={{
        state: staged,
        world: derive([]),
        dispatch: vi.fn(),
        stage: vi.fn(),
        apply: async () => {},
        attention: result,
      }}
    >
      <AttentionNotices scope="operation" />
    </OrganiserContext.Provider>,
  )
  expect(view.container.querySelectorAll('summary')).toHaveLength(8)
  expect(view.container.querySelector('[data-slot="attention-print"]')).toBeNull()
  act(() => window.dispatchEvent(new Event('beforeprint')))
  const printed = view.container.querySelector('[data-slot="attention-print"]') as HTMLElement
  expect(printed.children).toHaveLength(12)
  expect(within(printed).getAllByText('Plätze')).toHaveLength(12)
  act(() => window.dispatchEvent(new Event('afterprint')))
  expect(view.container.querySelector('[data-slot="attention-print"]')).toBeNull()
})

test('attention details replace unresolved typed entity IDs with readable fallback text', () => {
  const item: AttentionItem = {
    ...operationFeedback('invalid-field'),
    id: 'invalid-building-reference',
    wording: { title: 'Verweis prüfen', detail: 'Ein Objekt fehlt.', reasons: [] },
    evidence: { subject_id: 'bld_missing' },
  }
  render(
    <OrganiserContext.Provider
      value={{
        state: staged,
        world: derive([]),
        dispatch: vi.fn(),
        stage: vi.fn(),
        apply: async () => {},
        attention: { items: [item], coverage: [] },
      }}
    >
      <AttentionDetails item={item} />
    </OrganiserContext.Provider>,
  )

  expect(screen.getByText('Objekt nicht verfügbar')).toBeTruthy()
  expect(document.body.textContent).not.toContain('bld_missing')
})
