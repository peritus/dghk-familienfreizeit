import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import { activeProfile } from '../../src/config/index.js'
import { OrganiserContext } from '../../src/app/organiser/context.js'
import { WorkshopAllocation } from '../../src/app/organiser/screens/workshop-allocation.js'
import { WorkshopProgramme, Workshops } from '../../src/app/organiser/screens/workshops.js'
import { WorkshopAllocationConflictNotice } from '../../src/modules/workshop-rankings/app/components/workshop-allocation.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { organiserFixtureState } from '../../src/app/stories/organiser-fixtures.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'

afterEach(() => cleanup())

const fixture = readFileSync(
  resolve(process.cwd(), 'test/fixtures/workshop-assignment/prototype-dataset.kdl'),
  'utf-8',
)
const world = derive(loadKdl(fixture, activeProfile.validation_view), activeProfile.validation_view)
const contributions = composeSolverContributions(activeProfile)
const plan = solve(buildSolverInput(world, contributions), contributions, {
  build_revision: 'test',
  compatibility_revision: 1,
  event_date: activeProfile.meta.starts_on,
  profile: activeProfile,
  seed: null,
})

/** Copy that promised transitions, history or publication no event can produce. */
const unsupportedPromises = [
  'Wahl öffnen, Zuordnung prüfen',
  'den aktuellen Plan festlegen',
  'manuelle Freigabe',
  'Historie',
  'bei der Workshopplanung ergänzt',
  'vor dem Festlegen',
  'bevor der Plan festgelegt wird',
]

function renderAt(path: string, children: ReactNode) {
  const location = memoryLocation({ path, record: true })
  render(
    <OrganiserContext.Provider
      value={{
        state: organiserFixtureState,
        world,
        dispatch: () => undefined,
        stage: () => undefined,
        apply: async () => undefined,
        current_plan: plan,
      }}
    >
      <Router hook={location.hook} searchHook={location.searchHook}>
        {children}
      </Router>
    </OrganiserContext.Provider>,
  )
}

function expectNoUnsupportedPromise() {
  const text = document.body.textContent ?? ''
  for (const promise of unsupportedPromises) expect(text).not.toContain(promise)
}

test('the workshop overview describes only what the screen can do', () => {
  renderAt('/workshops', <Workshops />)

  expect(
    screen.getByText(
      'Workshops anlegen und bearbeiten, Leitungen und Zielgruppen im Blick behalten.',
    ),
  ).toBeTruthy()
  expectNoUnsupportedPromise()

  fireEvent.click(screen.getByRole('link', { name: /Externe Leitungen/ }))
  expectNoUnsupportedPromise()
})

test('the programme and allocation screens ask for review without promising a commitment', () => {
  renderAt('/workshops/programme', <WorkshopProgramme />)
  expectNoUnsupportedPromise()
  cleanup()

  renderAt('/workshops/allocation', <WorkshopAllocation />)
  expectNoUnsupportedPromise()
})

test('the allocation conflict notice asks for review of the marked cases', () => {
  render(
    <WorkshopAllocationConflictNotice
      projection={{
        max_rank: 3,
        answers: [],
        participation: { slots: [], people: [] },
        demand: [],
        trace_events: [],
        trace_people: [],
        person_names: [],
        unassigned_person_ids: ['noah'],
        unassigned_count: 1,
        fixed_violation_count: 0,
        has_answers: true,
        has_workshops: true,
      }}
    />,
  )

  expect(
    screen.getByText('Die Zuordnung bleibt eine abgeleitete Vorschau. Prüfe die markierten Fälle.'),
  ).toBeTruthy()
  expectNoUnsupportedPromise()
})
