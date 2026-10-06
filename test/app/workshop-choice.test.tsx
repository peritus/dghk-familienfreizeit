import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Workshops } from '../../src/app/organiser/screens/workshops.js'
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
