import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { AssignmentBoard } from '../../src/app/organiser/accommodation-ui/assignment-board.js'
import { OrganiserDecisions } from '../../src/app/organiser/accommodation-ui/decisions.js'
import { PlanInspection } from '../../src/app/organiser/accommodation-ui/plans.js'
import { AssignmentReports } from '../../src/app/organiser/accommodation-ui/reports.js'
import {
  CommunicationReview,
  ReleaseControl,
} from '../../src/app/organiser/accommodation-ui/release-control.js'

afterEach(() => cleanup())

test('accommodation screens keep implementation details out of the rendered UI', () => {
  const screens = [
    <AssignmentBoard key="board" />,
    <OrganiserDecisions key="decisions" />,
    <PlanInspection key="plan" />,
    <AssignmentReports key="report" />,
    <ReleaseControl key="release" />,
    <CommunicationReview key="review" />,
  ]

  for (const screen of screens) {
    const { unmount } = render(screen)
    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(
      /Ereignisstand|Ereignisverlauf|Resolver|needs|provides|separates-/i,
    )
    unmount()
  }
})

test('accommodation actions use human-facing concepts and the shared dialog', () => {
  render(<OrganiserDecisions />)

  expect(screen.getByText(/Anforderung:/)).toBeTruthy()
  expect(screen.getByText(/Merkmal:/)).toBeTruthy()
  expect(screen.getByText(/Trennung:/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Inspect' })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Entscheidung hinzufügen' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Neue Angabe hinzufügen' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Art der Angabe' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('moving a family uses the shared focus-managed dialog', () => {
  render(<AssignmentBoard />)

  fireEvent.click(screen.getAllByRole('button', { name: 'Raum wählen' })[0]!)
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Familie Braun' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
