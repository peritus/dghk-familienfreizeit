import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import {
  FixtureProvider,
  organiserWorkshopFixtureState,
} from '../../src/app/stories/organiser-fixtures.js'
import { WorkshopAllocation } from '../../src/app/organiser/screens/workshop-allocation.js'

afterEach(() => cleanup())

test('organisers can add and clear a fixed attendance despite an eligibility conflict', () => {
  render(
    <FixtureProvider initialState={organiserWorkshopFixtureState} with_plan>
      <WorkshopAllocation />
    </FixtureProvider>,
  )

  fireEvent.change(screen.getByLabelText('Person'), { target: { value: 'per_martin' } })
  fireEvent.change(screen.getByLabelText('Kurs'), { target: { value: 'wks_schmieden' } })
  fireEvent.click(screen.getByRole('button', { name: 'Fest zuordnen' }))

  const fixedAttendance = screen.getByRole('region', { name: 'Feste Teilnahmen' })
  expect(
    within(fixedAttendance).getByRole('button', {
      name: 'Feste Teilnahme von Martin Sonnenberg an Schmieden entfernen',
    }),
  ).toBeTruthy()
  expect(screen.getByText('nicht erfüllbar')).toBeTruthy()

  fireEvent.click(
    within(fixedAttendance).getByRole('button', {
      name: 'Feste Teilnahme von Martin Sonnenberg an Schmieden entfernen',
    }),
  )
  expect(within(fixedAttendance).getByText('Noch keine festen Teilnahmen.')).toBeTruthy()
})
