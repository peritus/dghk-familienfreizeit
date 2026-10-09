import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import {
  AreaClosingActions,
  ClosedAreaDifferences,
} from '../../src/app/organiser/components/area-closing.js'
import { Dashboard } from '../../src/app/organiser/screens/dashboard.js'
import {
  initialOrganiserState,
  organiserReducer,
  type OrganiserState,
} from '../../src/app/organiser/state.js'
import {
  FixtureProvider,
  organiserAssignmentFixtureState,
  organiserFixtureState,
} from '../../src/app/stories/organiser-fixtures.js'
import { activeProfile } from '../../src/config/index.js'
import { closedResults } from '../../src/config/phases.js'
import { derive } from '../../src/events/fold.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'

afterEach(() => cleanup())

const contributions = composeSolverContributions(activeProfile)
const revisions = { build_revision: 'storybook', compatibility_revision: 1 }

function accommodationResult(state: OrganiserState) {
  const world = derive(state.committed, activeProfile.validation_view)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    ...revisions,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
  return closedResults(activeProfile.modules).get('accommodation')!.compute({
    world,
    plan,
  }) as unknown as {
    placements: readonly { family_id: string }[]
    unplaced: readonly { family_id: string }[]
  }
}

function closedState(base: OrganiserState, payload: object): OrganiserState {
  const closing: Event = {
    seq: base.committed.length + 1,
    at: '2027-04-01T08:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'AccommodationClosed',
    payload: payload as JsonValue,
  }
  return organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [...base.committed, closing],
    ...revisions,
    feature_overrides: [],
    principal_email: 'organiser@example.test',
  })
}

test('the closing review explains blocking findings and cannot be confirmed', () => {
  render(
    <FixtureProvider initialState={organiserAssignmentFixtureState} with_plan>
      <AreaClosingActions area="accommodation" />
    </FixtureProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Festlegen' }))
  const dialog = within(screen.getByRole('alertdialog'))
  expect(dialog.getByText('Prüfung erforderlich')).toBeTruthy()
  expect(dialog.getByText(/Kein Zimmer erfüllt die Anforderungen/)).toBeTruthy()
  expect((dialog.getByRole('button', { name: 'Festlegen' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
})

test('Festlegen previews the first result and stages a closing that stays pending until applied', () => {
  const result = accommodationResult(organiserFixtureState)
  render(
    <FixtureProvider initialState={organiserFixtureState} with_plan>
      <AreaClosingActions area="accommodation" />
    </FixtureProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Festlegen' }))
  const dialog = within(screen.getByRole('alertdialog'))
  expect(dialog.getByText(/Das ist die erste Festlegung/)).toBeTruthy()
  const families = result.placements.length
  expect(
    dialog.getByText(`${families} ${families === 1 ? 'Familie betroffen' : 'Familien betroffen'}`),
  ).toBeTruthy()
  fireEvent.click(dialog.getByRole('button', { name: 'Festlegen' }))
  expect(screen.getByRole('status').textContent).toBe('Das Ergebnis wird festgelegt …')
  expect(screen.queryByRole('button', { name: 'Festlegen' })).toBeNull()
})

test('a closed area with an unchanged derivation shows no difference and offers reopening', () => {
  const closed = closedState(organiserFixtureState, {
    ...accommodationResult(organiserFixtureState),
    ...revisions,
  })
  render(
    <FixtureProvider initialState={closed} with_plan>
      <AreaClosingActions area="accommodation" />
      <ClosedAreaDifferences area="accommodation" />
    </FixtureProvider>,
  )
  expect(screen.getByText('Keine Abweichung vom festgelegten Ergebnis')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Erneut festlegen' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Wieder öffnen' }))
  expect(
    within(screen.getByRole('alertdialog')).getByText(/weiterhin das zuletzt festgelegte/),
  ).toBeTruthy()
})

test('a change after closing is listed per family and raises a dashboard Hinweis', async () => {
  const result = accommodationResult(organiserAssignmentFixtureState)
  const [, ...rest] = result.placements
  const stale = closedState(organiserAssignmentFixtureState, {
    ...result,
    placements: rest,
    ...revisions,
  })
  render(
    <FixtureProvider initialState={stale} with_plan>
      <ClosedAreaDifferences area="accommodation" />
    </FixtureProvider>,
  )
  expect(screen.getByText('2 Abweichungen vom festgelegten Ergebnis')).toBeTruthy()
  expect(screen.getAllByText('(neu)')).toHaveLength(2)
  cleanup()
  render(
    <FixtureProvider initialState={stale} with_plan>
      <Dashboard />
    </FixtureProvider>,
  )
  const all = screen.queryByRole('button', { name: /Alle .* Hinweise anzeigen/ })
  if (all) fireEvent.click(all)
  expect(
    await screen.findByText(/Abweichung vom festgelegten Ergebnis/, { selector: 'summary' }),
  ).toBeTruthy()
})
