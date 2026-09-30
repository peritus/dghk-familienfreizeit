import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { FamilyDetail } from '../../src/app/organiser/screens/family-detail.js'
import { FixtureProvider } from '../../src/app/stories/organiser-fixtures.js'

afterEach(() => cleanup())

test('organiser can rename a family and edit profile-driven controls', () => {
  render(
    <FixtureProvider>
      <FamilyDetail family_id="fam_sonnenberg" />
    </FixtureProvider>,
  )

  const displayName = screen.getByLabelText('Anzeigename')
  expect((displayName as HTMLInputElement).value).toBe('Familie Sonnenberg')
  expect(screen.getAllByRole('note').every((note) => note.textContent?.includes('Frist bis'))).toBe(
    true,
  )
  expect(screen.getAllByText('Schläft bei den Eltern')).toHaveLength(2)
  expect(screen.getAllByText('Workshop-Wünsche')).toHaveLength(2)

  fireEvent.change(displayName, { target: { value: 'Familie Abendrot' } })
  fireEvent.click(screen.getByRole('button', { name: 'Familiennamen speichern' }))

  expect(screen.getByRole('heading', { name: 'Familie Abendrot' })).toBeTruthy()
  expect(
    screen.getByText('Familienname geändert: Familie Sonnenberg → Familie Abendrot'),
  ).toBeTruthy()
})

test('organiser controls save their ordinary label events on change', () => {
  render(
    <FixtureProvider>
      <FamilyDetail family_id="fam_sonnenberg" />
    </FixtureProvider>,
  )

  const sleepAtHome = screen.getAllByRole('checkbox')[0]!
  fireEvent.click(sleepAtHome)

  expect((sleepAtHome as HTMLInputElement).checked).toBe(true)
})
