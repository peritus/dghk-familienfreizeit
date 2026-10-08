import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { FamilyDetail } from '../../src/app/organiser/screens/family-detail.js'
import {
  FixtureProvider,
  organiserFamilyDetailFixtureState,
} from '../../src/app/stories/organiser-fixtures.js'

afterEach(() => cleanup())

test('organiser can rename a family and edit profile-driven controls', () => {
  render(
    <FixtureProvider>
      <FamilyDetail family_id="fam_sonnenberg" />
    </FixtureProvider>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Familie bearbeiten' }))
  const dialog = screen.getByRole('dialog')
  const displayName = within(dialog).getByLabelText('Familienname')
  expect((displayName as HTMLInputElement).value).toBe('Familie Sonnenberg')

  fireEvent.change(displayName, { target: { value: 'Familie Abendrot' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Änderungen speichern' }))

  expect(screen.getByRole('heading', { name: 'Familie Abendrot' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Zimmer' }).getAttribute('aria-selected')).toBe('true')
})

test('organiser controls save their ordinary label events on change', () => {
  render(
    <FixtureProvider>
      <FamilyDetail family_id="fam_sonnenberg" />
    </FixtureProvider>,
  )

  const privateBathroom = screen.getAllByRole('radio', { name: 'Unbedingt' })[0]!
  fireEvent.click(privateBathroom)

  expect((privateBathroom as HTMLInputElement).checked).toBe(true)
})

test('family detail renders the people view with its person selector and editor', () => {
  render(
    <FixtureProvider initialState={organiserFamilyDetailFixtureState}>
      <FamilyDetail family_id="fam_sonnenberg" topic="personen" person_id="per_lena" />
    </FixtureProvider>,
  )

  expect(screen.getByRole('tab', { name: /Lena Sonnenberg/ })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Person' })).toBeTruthy()
  expect(screen.getByLabelText('Vorname')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Person entfernen' })).toBeTruthy()
})

test('family detail renders person food preferences through generic controls', () => {
  render(
    <FixtureProvider initialState={organiserFamilyDetailFixtureState}>
      <FamilyDetail family_id="fam_sonnenberg" topic="essen" person_id="per_lena" />
    </FixtureProvider>,
  )

  expect(screen.getByRole('group', { name: 'Was isst die Person?' })).toBeTruthy()
  const vegetarian = screen.getByRole('radio', { name: 'Vegetarisch' })
  expect((vegetarian as HTMLInputElement).checked).toBe(true)
  expect(screen.getByRole('textbox', { name: /Hinweise zum Essen/ })).toBeTruthy()

  fireEvent.click(screen.getByRole('radio', { name: 'Vegan' }))
  expect((screen.getByRole('radio', { name: 'Vegan' }) as HTMLInputElement).checked).toBe(true)
})

test('family detail renders workshop wishes and participation areas', () => {
  render(
    <FixtureProvider initialState={organiserFamilyDetailFixtureState}>
      <FamilyDetail family_id="fam_sonnenberg" topic="workshops" person_id="per_lena" />
    </FixtureProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Wunschliste' })).toBeTruthy()
  expect(screen.getByText('Keramik')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Feste Anmeldungen' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Interesse' })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Workshops finden' }).length).toBeGreaterThan(0)
})

test('family detail omits wish sections whose organiser feature is not effective', () => {
  const roomOnly = new Set(['family-preferences.organiser-room-wishes'])
  const { unmount } = render(
    <FixtureProvider effective_features={new Set(['workshop-rankings.organiser-workshop-wishes'])}>
      <FamilyDetail family_id="fam_sonnenberg" />
    </FixtureProvider>,
  )
  expect(screen.queryByRole('heading', { name: 'Zimmerwünsche' })).toBeNull()
  expect(screen.queryAllByRole('radio', { name: 'Unbedingt' })).toHaveLength(0)
  unmount()

  render(
    <FixtureProvider initialState={organiserFamilyDetailFixtureState} effective_features={roomOnly}>
      <FamilyDetail family_id="fam_sonnenberg" topic="workshops" person_id="per_lena" />
    </FixtureProvider>,
  )
  expect(screen.queryByRole('heading', { name: 'Wunschliste' })).toBeNull()
  expect(screen.getByText('Workshopwünsche sind in dieser Planung ausgeschaltet.')).toBeTruthy()
})
