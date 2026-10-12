import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Workshops } from '../../src/app/organiser/screens/workshops.js'
import { useOrganiser } from '../../src/app/organiser/context.js'
import { materializeDraftEvents } from '../../src/app/organiser/state.js'
import {
  FixtureProvider,
  organiserWorkshopFixtureState,
} from '../../src/app/stories/organiser-fixtures.js'

function DraftState() {
  const { state, dispatch } = useOrganiser()
  return (
    <>
      <output data-testid="draft-state">{JSON.stringify(state)}</output>
      <button onClick={() => dispatch({ type: 'discard' })}>Entwurf verwerfen</button>
    </>
  )
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

test('deleting a workshop requires confirmation and removes it only from the prospective world', async () => {
  const committed = [
    ...organiserWorkshopFixtureState.committed,
    ...materializeDraftEvents(organiserWorkshopFixtureState),
  ]
  render(
    <FixtureProvider
      initialState={{
        ...organiserWorkshopFixtureState,
        committed,
        drafts: [],
        head_seq: committed.length,
      }}
      with_plan
    >
      <Workshops />
      <DraftState />
    </FixtureProvider>,
  )
  const remove = screen.getAllByRole('button', { name: /^Kurs löschen:/ })[0]!
  const row = remove.closest('article')!
  const title = within(row).getByRole('heading').textContent!
  const workshopId = row.id.slice('workshop-'.length)
  const initial = JSON.parse(screen.getByTestId('draft-state').textContent!)

  remove.focus()
  fireEvent.click(remove)
  expect(screen.getByRole('alertdialog').textContent).toContain(title)
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Behalten' }))
  await waitFor(() => expect(document.activeElement).toBe(remove), { timeout: 1000 })
  expect(JSON.parse(screen.getByTestId('draft-state').textContent!)).toEqual(initial)
  expect(screen.getByRole('heading', { name: title })).toBeTruthy()

  fireEvent.click(remove)
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ja, löschen' }),
  )
  expect(screen.queryByRole('heading', { name: title })).toBeNull()
  await waitFor(
    () => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })),
    { timeout: 1000 },
  )
  const after = JSON.parse(screen.getByTestId('draft-state').textContent!)
  expect(after.committed).toEqual(initial.committed)
  expect(after.drafts.flatMap((batch: { events: unknown[] }) => batch.events)).toEqual([
    expect.objectContaining({
      type: 'WorkshopRetired',
      payload: { workshop_id: workshopId, reason: 'Organisatorisch entfernt' },
    }),
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Entwurf verwerfen' }))
  expect(screen.getByRole('heading', { name: title })).toBeTruthy()
  expect(JSON.parse(screen.getByTestId('draft-state').textContent!).drafts).toEqual([])
})
