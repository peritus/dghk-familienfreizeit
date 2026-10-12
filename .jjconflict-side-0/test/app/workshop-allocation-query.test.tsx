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
const duplicatePersonId = 'per_dupe'
const duplicatePersonEvent = {
  seq: loadKdl(fixture, activeProfile.validation_view).length + 1,
  at: '2027-05-01T00:00:00Z',
  actor: 'organiser@example.test',
  subject: null,
  type: 'PersonAdded',
  payload: {
    person_id: duplicatePersonId,
    family_id: 'fam_f0',
    given_name: 'Alex',
    family_name: 'Morgan',
    age: 8,
    role: 'child',
  },
} as const
const duplicateWorld = derive(
  [...loadKdl(fixture, activeProfile.validation_view), duplicatePersonEvent],
  activeProfile.validation_view,
)
const contributions = composeSolverContributions(activeProfile)
const plan = solve(buildSolverInput(world, contributions), contributions, {
  build_revision: 'test',
  compatibility_revision: 1,
  event_date: activeProfile.meta.starts_on,
  profile: activeProfile,
  seed: null,
})

function expectRenderedCopyToHideOpaqueEntityIds() {
  const accessibleNames = [...document.body.querySelectorAll('[aria-label], [title]')]
    .map((element) => element.getAttribute('aria-label') ?? element.getAttribute('title') ?? '')
    .join('\n')
  const controlValues = [
    ...[...document.body.querySelectorAll('input:not([type="hidden"]), textarea')].map(
      (element) => (element as HTMLInputElement | HTMLTextAreaElement).value,
    ),
    ...[...document.body.querySelectorAll('select')].map((element) =>
      [...(element as HTMLSelectElement).selectedOptions]
        .map((option) => option.textContent)
        .join(' '),
    ),
  ].join('\n')
  expect(`${document.body.textContent}\n${accessibleNames}\n${controlValues}`).not.toMatch(
    /\b[a-z]{2,5}_[a-z0-9]+\b/,
  )
}

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
  expectRenderedCopyToHideOpaqueEntityIds()
})

test('a trace URL keeps the selected person ID when names are identical', () => {
  const location = memoryLocation({
    path: `/workshops/allocation/trace?person=${duplicatePersonId}`,
    record: true,
  })
  render(
    <OrganiserContext.Provider
      value={{
        state: organiserFixtureState,
        world: duplicateWorld,
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

  const selectedLabel = 'Alex Morgan · Familie Morgan · Person 2'
  expect((screen.getByLabelText('Person suchen') as HTMLInputElement).value).toBe(selectedLabel)
  expect(screen.getByRole('columnheader', { name: selectedLabel })).toBeTruthy()
  expectRenderedCopyToHideOpaqueEntityIds()
  expect(location.history.at(-1)).toBe(`/workshops/allocation/trace?person=${duplicatePersonId}`)
})
