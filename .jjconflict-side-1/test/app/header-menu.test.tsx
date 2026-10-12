import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useReducer } from 'react'
import { HeaderMenu } from '../../src/app/organiser/header-menu.js'
import { OrganiserContext } from '../../src/app/organiser/context.js'
import { organiserReducer, type OrganiserState } from '../../src/app/organiser/state.js'
import {
  organiserFixtureState,
  organiserPendingDraft,
  stateWithDrafts,
} from '../../src/app/stories/organiser-fixtures.js'

afterEach(cleanup)
function fixture(initialState = organiserFixtureState) {
  const apply = vi.fn(async () => undefined)
  const logout = vi.fn()
  function Harness() {
    const [state, dispatch] = useReducer(
      organiserReducer,
      initialState.drafts.length ? { ...initialState, change_mode: 'drafting' } : initialState,
    )
    return (
      <OrganiserContext.Provider
        value={{ state, dispatch, apply, stage: () => undefined, world: null }}
      >
        <HeaderMenu on_logout={logout} />
      </OrganiserContext.Provider>
    )
  }
  render(<Harness />)
  return { apply, logout }
}

async function open() {
  fireEvent.click(screen.getByRole('button', { name: /^Menü/ }))
  return within(await screen.findByRole('dialog', { name: 'Menü' }))
}
test('compact mode changes use existing reducer semantics and close returns focus', async () => {
  fixture()
  const menu = await open()
  expect(menu.queryByText(/Zuletzt gespeichert/)).toBeNull()
  fireEvent.click(menu.getByRole<HTMLInputElement>('radio', { name: /^Entwurfsmodus/ }))
  expect(menu.getByRole<HTMLInputElement>('radio', { name: /^Entwurfsmodus/ }).checked).toBe(true)
  expect(document.querySelector('.header-menu-pill')!.getAttribute('aria-label')).toContain(
    'nichts offen',
  )
  fireEvent.click(menu.getByRole('radio', { name: /^Automatisch speichern/ }))
  expect(document.querySelector('.header-menu-pill')!.getAttribute('aria-label')).toContain(
    'alles gespeichert',
  )
  fireEvent.click(menu.getByRole('button', { name: 'Schließen' }))
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Menü/ })),
  )
})
test('pending mode changes require the same safe confirmation and allow cancel', async () => {
  fixture(stateWithDrafts([organiserPendingDraft]))
  const menu = await open()
  fireEvent.click(menu.getByRole('radio', { name: /^Automatisch speichern/ }))
  expect(menu.getByRole('heading', { name: 'Entwurfsmodus beenden?' })).toBeTruthy()
  fireEvent.click(menu.getByRole('button', { name: 'Abbrechen' }))
  expect(document.querySelector('.header-menu-pill')!.getAttribute('aria-label')).toContain(
    '1 ungespeicherte Änderung',
  )
  fireEvent.click(menu.getByRole('radio', { name: /^Automatisch speichern/ }))
  fireEvent.click(menu.getByRole('button', { name: 'Verwerfen und beenden' }))
  expect(document.querySelector('.header-menu-pill')!.getAttribute('aria-label')).toContain(
    'alles gespeichert',
  )
})
test('outer save, menu save and retry invoke the existing apply command', async () => {
  const { apply } = fixture(stateWithDrafts([organiserPendingDraft]))
  fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
  const menu = await open()
  fireEvent.click(menu.getByRole('button', { name: '1 Änderung speichern' }))
  expect(apply).toHaveBeenCalledTimes(2)
  cleanup()
  const errorState: OrganiserState = {
    ...stateWithDrafts([organiserPendingDraft]),
    status: 'error',
    error: 'Fehler',
  }
  const errorFixture = fixture(errorState)
  fireEvent.click(screen.getByRole('button', { name: 'Wiederholen' }))
  expect(errorFixture.apply).toHaveBeenCalledOnce()
})
test('a real save timestamp and the session logout action appear in the menu', async () => {
  const { logout } = fixture({
    ...organiserFixtureState,
    last_saved_at: '2027-01-15T09:30:00.000Z',
  })
  const menu = await open()
  expect(menu.getByText(/Zuletzt gespeichert/).querySelector('time')?.dateTime).toBe(
    '2027-01-15T09:30:00.000Z',
  )
  fireEvent.click(menu.getByRole('button', { name: 'Abmelden' }))
  expect(logout).toHaveBeenCalledOnce()
})
