import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import { activeProfile } from '../../src/config/index.js'
import { OrganiserContext } from '../../src/app/organiser/context.js'
import { WorkshopAllocation } from '../../src/app/organiser/screens/workshop-allocation.js'
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

test('a trace link opens with the person from its query highlighted', () => {
  const location = memoryLocation({ path: '/workshops/allocation/trace?person=per_p1' })
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
        <WorkshopAllocation />
      </Router>
    </OrganiserContext.Provider>,
  )

  expect((screen.getByRole('radio', { name: /hervorheben/ }) as HTMLInputElement).checked).toBe(
    true,
  )
  expect((screen.getByLabelText('Person suchen') as HTMLInputElement).value).toBe('Alex Morgan')
})
