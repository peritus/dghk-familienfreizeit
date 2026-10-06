import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import { activeProfile } from '../../src/config/index.js'
import { OrganiserContext } from '../../src/app/organiser/context.js'
import { WorkshopLists } from '../../src/app/organiser/screens/workshop-reports.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { organiserFixtureState } from '../../src/app/stories/organiser-fixtures.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'

afterEach(() => cleanup())

// The full prototype dataset gives every list several documents to choose from.
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

function renderLists(path: string) {
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
        <WorkshopLists />
      </Router>
    </OrganiserContext.Provider>,
  )
  return location
}

test.each([
  ['/workshops/lists/workshops', 'Workshop auswählen', 'workshop'],
  ['/workshops/lists/persons', 'Person auswählen', 'person'],
  ['/workshops/lists/families', 'Familie auswählen', 'family'],
  ['/workshops/lists/rooms', 'Raum auswählen', 'room'],
])('%s keeps the document chosen in its picker', (path, label, parameter) => {
  const location = renderLists(path)
  const picker = screen.getByLabelText(label) as HTMLSelectElement
  const options = [...picker.options]
  expect(options.length).toBeGreaterThan(1)
  const target = options.at(-1)!

  fireEvent.change(picker, { target: { value: target.value } })

  expect(location.history.at(-1)).toBe(`${path}?${parameter}=${target.value}`)
  expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe(target.value)
})

test('previous and next move through the documents', () => {
  renderLists('/workshops/lists/rooms')
  const picker = () => screen.getByLabelText('Raum auswählen') as HTMLSelectElement
  const [first, second] = [...picker().options]

  fireEvent.click(screen.getByRole('button', { name: /Nächste/ }))
  expect(picker().value).toBe(second!.value)

  fireEvent.click(screen.getByRole('button', { name: /Vorherige/ }))
  expect(picker().value).toBe(first!.value)
})
