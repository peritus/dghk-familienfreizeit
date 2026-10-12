import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { WorkshopSummaryRow } from '../../src/modules/official-workshops/app/components/authoring.js'

afterEach(() => cleanup())

test('capacity summary separates fixed attendance from sign-up or interest totals', () => {
  render(
    <WorkshopSummaryRow
      workshop={{
        id: 'wks_interest',
        title: 'Basteln',
        audience: 'Kinder',
        age_range: 'ab 6 Jahren',
        capacity: 10,
        participation_mode: 'Interesse',
        leaders: [],
        count: 2,
        fixed_attendance_count: 1,
        interest_count: 3,
      }}
    />,
  )

  expect(screen.getByText('2 Teilnehmende · 3 Interessen · 1 fest zugeordnet')).toBeTruthy()
})
