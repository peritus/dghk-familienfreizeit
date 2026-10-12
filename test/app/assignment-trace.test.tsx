import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { AssignmentTraceScreen } from '../../src/modules/room-assignment/app/screens/assignment-trace.js'
import { FixtureProvider } from '../../src/app/stories/organiser-fixtures.js'

afterEach(() => cleanup())

test('organisers see compact family placements and can expand the decision evidence', () => {
  render(
    <FixtureProvider>
      <AssignmentTraceScreen />
    </FixtureProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Verlauf der Zimmerverteilung' })).toBeTruthy()
  expect(
    screen.getByRole('heading', {
      name: 'So wird die nächste automatische Zuordnung entschieden',
    }),
  ).toBeTruthy()
  expect(screen.getByText('Feste Zimmerentscheidungen werden zuerst übernommen.')).toBeTruthy()
  expect(screen.getByText(/Nach jeder automatischen Zuordnung/)).toBeTruthy()
  expect(screen.getByText(/Automatische Zuordnungen in Auswahlreihenfolge \(1\)/)).toBeTruthy()

  const familyName = screen.getByText('Sonnenberg')
  const familyRow = familyName.closest('details')
  expect(familyRow?.open).toBe(false)
  expect(screen.getByText(/Zugeordnet zu Zimmer 101/)).toBeTruthy()

  const visibleText = document.body.textContent ?? ''
  expect(visibleText).not.toContain('fam_sonnenberg')
  expect(visibleText).not.toContain('rm_101')
  expect(visibleText).not.toMatch(/Familien-ID|Zimmer-ID|Runde \d/)

  fireEvent.click(familyName)
  expect(familyRow?.open).toBe(true)
  expect(screen.getByRole('heading', { name: /Warum wurde diese Familie/ })).toBeTruthy()
  expect(screen.getByText(/Aktuell passende Zimmer/)).toBeTruthy()
  expect(document.body.textContent).not.toContain('Gespeicherte Familienreihenfolge')
  expect(document.body.textContent).toContain('früher im System angelegt')
  expect(document.body.textContent).not.toContain('Zeitpunkt der Anmeldung')
})
