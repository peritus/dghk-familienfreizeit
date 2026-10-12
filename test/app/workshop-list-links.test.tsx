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
import { WorkshopProgramme } from '../../src/app/organiser/screens/workshops.js'
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
  return location
}

test('a placed workshop in the programme opens its roster', () => {
  const location = renderAt('/workshops/programme', <WorkshopProgramme />)

  fireEvent.click(screen.getByRole('button', { name: 'Keramik: Teilnahmeliste öffnen' }))

  expect(location.history.at(-1)).toBe('/workshops/lists/workshops?workshop=wks_keramik')
})

test('the traced person links to their workshop plan', () => {
  renderAt('/workshops/allocation/trace?person=per_p1', <WorkshopAllocation />)

  expect(screen.getByRole('link', { name: 'Kursplan ansehen' }).getAttribute('href')).toBe(
    '/workshops/lists/persons?person=per_p1',
  )
})
