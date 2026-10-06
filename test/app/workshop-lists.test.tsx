import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
import type { WorkshopAssignmentSection } from '../../src/modules/workshop-assignment/index.js'

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
  ['/workshops/lists/workshops', 'Workshop', 'workshop'],
  ['/workshops/lists/families', 'Familie', 'family'],
  ['/workshops/lists/rooms', 'Raum', 'room'],
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

test('the person list is searched by name, external leaders included', () => {
  const location = renderLists('/workshops/lists/persons')
  const field = screen.getByLabelText('Person suchen') as HTMLInputElement
  expect(field.type).toBe('search')
  const external = [...document.querySelectorAll('datalist option')]
    .map((option) => (option as HTMLOptionElement).value)
    .find((value) => value.endsWith(' (extern)'))!

  // An incomplete name selects nothing.
  fireEvent.change(field, { target: { value: external.slice(0, 3) } })
  expect(location.history).toHaveLength(1)

  fireEvent.change(field, { target: { value: external } })
  expect(location.history.at(-1)).toMatch(/\/workshops\/lists\/persons\?person=ext_/)
  expect(
    screen.getByRole('heading', { level: 2, name: external.replace(' (extern)', '') }),
  ).toBeTruthy()
  expect(screen.getByText('Externe Leitung')).toBeTruthy()
})

test('previous and next move through the documents and focus the new one', () => {
  renderLists('/workshops/lists/rooms')
  const picker = () => screen.getByLabelText('Raum') as HTMLSelectElement
  const [first, second] = [...picker().options]
  expect(screen.queryByRole('button', { name: /Vorherige/ })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: `Nächste ›: ${second!.text}` }))
  expect(picker().value).toBe(second!.value)
  expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: second!.text }))

  fireEvent.click(screen.getByRole('button', { name: /Vorherige/ }))
  expect(picker().value).toBe(first!.value)
})

test('the roster shows the confidentiality notice and keeps attendance boxes for print', () => {
  renderLists('/workshops/lists/workshops')
  expect(screen.getByRole('note').textContent).toBe(
    'Vertraulich. Enthält Allergien und Gesundheitshinweise. Nur für die Workshopleitung.',
  )
  expect(
    screen
      .getAllByRole('columnheader', { name: 'Anwesend' })[0]!
      .classList.contains('workshop-print-only'),
  ).toBe(true)
  expect(screen.getByText(/Nach der Veranstaltung vernichten/).classList).toContain(
    'workshop-print-note',
  )
})

test('an open case shows Offen in every empty slot with the reason', () => {
  const openId = (plan.sections['workshop-assignment'] as WorkshopAssignmentSection).unassigned[0]!
    .person_id
  renderLists(`/workshops/lists/persons?person=${openId}`)
  const rows = screen.getAllByRole('row').slice(1)
  const empty = rows.filter((row) => within(row).queryByText('Offen'))
  expect(empty.length).toBeGreaterThan(0)
  for (const row of empty)
    expect(
      within(row).getByText(/Alle passenden Workshops sind voll|Keine Workshopwahl abgegeben/),
    ).toBeTruthy()
})
