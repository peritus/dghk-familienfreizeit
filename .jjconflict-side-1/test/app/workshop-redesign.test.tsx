import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import { activeProfile } from '../../src/config/index.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { derivePhaseView } from '../../src/derive/phases.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'
import { OrganiserContext } from '../../src/app/organiser/context.js'
import { organiserFixtureState } from '../../src/app/stories/organiser-fixtures.js'
import { AreaClosingActions } from '../../src/app/organiser/components/area-closing.js'
import { Workshops } from '../../src/app/organiser/screens/workshops.js'

const events = loadKdl(
  `
WorkshopSpaceAdded workshop_space_id="wsp_test" name="Raum" location_description="Unten" capacity=10 sort_key=1
WorkshopSlotAdded slot_id="slot_test" starts_at="2027-05-01T09:00:00+02:00" ends_at="2027-05-01T11:00:00+02:00" sort_key=1
WorkshopAdded workshop_id="wks_test" title="Gemeinsam" description="Für alle" audience="all" age_min=0 age_max=99 capacity=4 participation_mode="assigned" sort_key=1
WorkshopChoiceOpened`,
  activeProfile.validation_view,
)
const world = derive(events, activeProfile.validation_view)
const contributions = composeSolverContributions(activeProfile)
const plan = solve(buildSolverInput(world, contributions), contributions, {
  build_revision: 'test',
  compatibility_revision: 1,
  event_date: activeProfile.meta.starts_on,
  profile: activeProfile,
  seed: null,
})
const phases = derivePhaseView({
  modules: activeProfile.modules,
  meta: activeProfile.meta,
  world,
  now: '2027-04-01T00:00:00Z',
  plan,
})
const stage = vi.fn()
function renderScreen(children: React.ReactNode) {
  const location = memoryLocation({ path: '/workshops' })
  return render(
    <OrganiserContext.Provider
      value={{
        state: organiserFixtureState,
        world,
        current_plan: plan,
        phases,
        stage,
        dispatch: vi.fn(),
        apply: async () => undefined,
      }}
    >
      <Router hook={location.hook} searchHook={location.searchHook}>
        {children}
      </Router>
    </OrganiserContext.Provider>,
  )
}
afterEach(() => {
  cleanup()
  window.localStorage.clear()
  stage.mockClear()
})

test('one all-audience workshop remains visible in both groups and metric filters share checkbox state', () => {
  renderScreen(<Workshops />)
  const visibleText = document.body.textContent ?? ''
  expect(visibleText).not.toContain('wks_test')
  expect(visibleText).not.toContain('slot_test')
  expect(visibleText).not.toContain('wsp_test')

  fireEvent.click(screen.getByRole('button', { name: 'Kinder (1)' }))
  expect(screen.getByRole('heading', { name: 'Gemeinsam' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Erwachsene (1)' }))
  expect(screen.getByRole('heading', { name: 'Gemeinsam' })).toBeTruthy()
  const tile = screen.getByRole('button', { name: /noch nicht eingeplant/ })
  fireEvent.click(tile)
  expect(
    (screen.getByRole('checkbox', { name: 'Nur nicht eingeplante' }) as HTMLInputElement).checked,
  ).toBe(true)
  expect(screen.getByText('Keine Workshops für diese Filter')).toBeTruthy()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Nur nicht eingeplante' }))
  expect(tile.getAttribute('aria-pressed')).toBe('false')
})

test('the inline advisory review manages focus, stages no preview, and requires a new acknowledgement after cancellation', () => {
  renderScreen(<AreaClosingActions area="workshops" />)
  fireEvent.click(screen.getByRole('button', { name: '1 Hinweis prüfen' }))
  expect(document.activeElement).toBe(
    screen.getByRole('heading', { name: 'Hinweise vor dem Festlegen' }),
  )
  expect(stage).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '1 Hinweis prüfen' }))
  fireEvent.click(screen.getByRole('button', { name: 'Festlegen' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hinweise zur Kenntnis genommen' }))
  fireEvent.click(screen.getByRole('button', { name: 'Festlegen' }))
  const dialog = within(screen.getByRole('alertdialog'))
  expect(dialog.queryByText('Gemeinsam')).toBeNull()
  fireEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }))
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '1 Hinweis prüfen' }))
  expect(screen.getByRole('button', { name: '1 Hinweis prüfen' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '1 Hinweis prüfen' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hinweise zur Kenntnis genommen' }))
  fireEvent.click(screen.getByRole('button', { name: 'Festlegen' }))
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Festlegen' }),
  )
  expect(stage.mock.calls[0]?.[0].map((event: { type: string }) => event.type)).toEqual([
    'WorkshopWarningsAcknowledged',
    'WorkshopsClosed',
  ])
})
