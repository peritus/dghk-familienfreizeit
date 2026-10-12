import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { AssignmentTraceScreen } from '../../src/modules/room-assignment/app/screens/assignment-trace.js'
import { FixtureProvider, stateWithDrafts } from '../../src/app/stories/organiser-fixtures.js'
import type { EventDraft } from '../../src/events/types.js'

afterEach(() => cleanup())

test('organisers see compact family placements and can expand the decision evidence', () => {
  const initialState = stateWithDrafts([
    {
      at: '2027-01-01T00:24:00Z',
      actor: 'organiser@example.test',
      subject: 'fam_sonnenberg',
      type: 'LabelSet',
      payload: {
        entity_id: 'fam_sonnenberg',
        key: 'needs-private-sanitary',
        value: 'private-sanitary',
        strength: 'preferred',
        note: null,
      },
    } satisfies EventDraft,
  ])
  render(
    <FixtureProvider initialState={initialState}>
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

  const familyName = screen.getByText('Familie Sonnenberg')
  const familySummary = familyName.closest('summary')
  const familyRow = familySummary?.closest('details')
  expect(familyRow?.open).toBe(false)
  expect(familySummary?.textContent).toContain('1.')
  expect(familySummary?.textContent).toContain('Zimmer 101')
  expect(familySummary?.textContent).toContain('Priorität 0')

  const visibleText = document.body.textContent ?? ''
  expect(visibleText).not.toContain('fam_sonnenberg')
  expect(visibleText).not.toContain('rm_101')
  expect(visibleText).not.toMatch(/Familien-ID|Zimmer-ID|Runde \d/)

  fireEvent.click(familyName)
  expect(familyRow?.open).toBe(true)
  expect(screen.getByRole('heading', { name: /Warum wurde diese Familie/ })).toBeTruthy()
  const prioritySection = screen.getByRole('region', { name: 'Konfigurierte Priorität' })
  expect(prioritySection.textContent).toContain('1. Konfigurierte Priorität')
  expect(prioritySection.textContent).toContain('Eigenes Bad (Wunsch)')
  expect(prioritySection.textContent).toContain('Barrierearmes Zimmer')
  expect(prioritySection.textContent).toContain('Wunsch 8 × 1 = 8')
  expect(prioritySection.textContent).toContain('erforderlich 8 × 2 = 16')
  expect(prioritySection.textContent).toContain('0')
  expect(prioritySection.textContent).toContain('nicht eingetragen')
  const bedDemandSection = screen.getByRole('region', { name: 'Benötigte Schlafplätze' })
  const bedDemandValue = screen.getByText(/^\d+ Schlafplätze$/)
  expect(bedDemandSection.textContent).toContain(bedDemandValue.textContent)
  expect(
    prioritySection.compareDocumentPosition(bedDemandSection) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(screen.getAllByText(/^\d+ Schlafplätze$/)).toHaveLength(1)
  expect(screen.getByText('2. Wie viele Zimmer noch passen')).toBeTruthy()
  expect(
    screen.getByText(/Familien mit weniger passenden Zimmern werden früher zugeordnet/),
  ).toBeTruthy()
  expect(screen.queryByText('Weniger Auswahl zuerst')).toBeNull()
  expect(screen.queryByText(/\b\d+ Zimmer\b/)).toBeNull()
  expect(document.body.textContent).not.toContain('Gespeicherte Familienreihenfolge')
  expect(document.body.textContent).toContain('Zeitpunkt der Anmeldung')
})

test('labels unsuitable rooms by the reasons they cannot be assigned', () => {
  const initialState = stateWithDrafts([
    {
      at: '2027-01-01T00:10:00Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'RoomAdded',
      payload: {
        room_id: 'rm_102',
        building_id: 'bld_haupthaus',
        number: '102',
        floor: 'ground',
        room_type: 'standard',
        sort_key: 2,
      },
    } satisfies EventDraft,
  ])
  render(
    <FixtureProvider initialState={initialState}>
      <AssignmentTraceScreen />
    </FixtureProvider>,
  )

  fireEvent.click(screen.getByText('Familie Sonnenberg'))
  expect(screen.getByText('Ungeeignete Zimmer (1)')).toBeTruthy()
  expect(screen.queryByText(/Abgelehnte Zimmer/)).toBeNull()
})
