import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { AssignmentTraceScreen } from '../../src/modules/room-assignment/app/screens/assignment-trace.js'
import { FixtureProvider } from '../../src/app/stories/organiser-fixtures.js'

afterEach(() => cleanup())

test('organisers can inspect each room allocation round and its ordering factors', () => {
  render(
    <FixtureProvider>
      <AssignmentTraceScreen />
    </FixtureProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Verlauf der Zimmerverteilung' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Runde 1: Sonnenberg' })).toBeTruthy()
  expect(screen.getByText(/Aktuell passende Zimmer/)).toBeTruthy()
  expect(screen.getByText(/Familien-ID bei Gleichstand/)).toBeTruthy()
  expect(screen.getByText(/Zimmer 101/)).toBeTruthy()
})
