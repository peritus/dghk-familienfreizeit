import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { WorkshopProgramme, Workshops } from '../../src/app/organiser/screens/workshops.js'
import { WorkshopAllocation } from '../../src/app/organiser/screens/workshop-allocation.js'
import {
  FixtureProvider,
  organiserWorkshopFixtureState,
} from '../../src/app/stories/organiser-fixtures.js'

afterEach(() => cleanup())

test('organisers open workshop choice through a confirmed decision', () => {
  render(
    <FixtureProvider initialState={organiserWorkshopFixtureState}>
      <Workshops />
    </FixtureProvider>,
  )
  expect(
    screen.getByText('Familien sehen noch keine Workshops, bis die Wahl geöffnet ist.'),
  ).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Wahl öffnen' }))
  const dialog = within(screen.getByRole('alertdialog'))
  fireEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }))
  expect(screen.queryByText('Die Workshopwahl ist geöffnet.')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Wahl öffnen' }))
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Wahl öffnen' }),
  )

  expect(screen.getByText('Die Workshopwahl ist geöffnet.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Wahl öffnen' })).toBeNull()
})

test('the overview, programme and allocation screens render the same workshop track', () => {
  const stepsOf = () =>
    within(screen.getByRole('region', { name: 'Ablauf der Workshopwahl' }))
      .getAllByRole('listitem')
      .map((item) => `${item.textContent}|${item.getAttribute('aria-current') ?? ''}`)
  const tracks = [Workshops, WorkshopProgramme, WorkshopAllocation].map((Screen) => {
    render(
      <FixtureProvider initialState={organiserWorkshopFixtureState} with_plan>
        <Screen />
      </FixtureProvider>,
    )
    const steps = stepsOf()
    cleanup()
    return steps
  })
  expect(tracks[0]!.length).toBe(4)
  expect(tracks[1]).toEqual(tracks[0])
  expect(tracks[2]).toEqual(tracks[0])
})
