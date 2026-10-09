import { expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import type { PhaseView } from '../../src/derive/phases.js'
import { familyPreferencesConfig } from '../../src/modules/family-preferences/index.js'
import { phaseNoticeText } from '../../src/modules/family-preferences/app/controls.js'

const section = familyPreferencesConfig(activeProfile).sections.find(
  ({ key }) => key === 'room-wishes',
)!

const phase = (overrides: Partial<PhaseView>): PhaseView[] => [
  {
    phase: 'family-preferences.accommodation-preferences',
    area: 'accommodation',
    status: 'open',
    target_at: '2027-03-31T21:59:59Z',
    readiness: { ready: true },
    closed: null,
    ...overrides,
  },
]

test('an open phase names the Zieltermin without a cut-off', () => {
  expect(phaseNoticeText(section, activeProfile.meta, 'organiser', phase({}))).toBe(
    'Zieltermin: 31. März 2027. Änderungen bleiben danach möglich, werden aber als verspätet markiert.',
  )
})

test('a late phase keeps editing open and adds the late contact', () => {
  expect(phaseNoticeText(section, activeProfile.meta, 'family', phase({ status: 'late' }))).toBe(
    'Zieltermin: 31. März 2027 (überschritten). Änderungen bleiben möglich, werden aber als verspätet markiert. Späte Änderungen an Zimmerwünschen bitte mit dem Organisationsteam abstimmen.',
  )
})

test('a closed phase names the organiser decision for each audience', () => {
  const closed = phase({ status: 'closed', closed: { seq: 7, at: '2027-04-02T08:00:00.000Z' } })
  expect(phaseNoticeText(section, activeProfile.meta, 'organiser', closed)).toBe(
    'Zimmerwünsche: Festgelegt am 2. April 2027. Änderungen hier erscheinen als Abweichung vom festgelegten Ergebnis.',
  )
  expect(phaseNoticeText(section, activeProfile.meta, 'family', closed)).toBe(
    'Zimmerwünsche: Festgelegt. Für Änderungen wende dich bitte an das Organisationsteam.',
  )
})

test('an upcoming phase shows no notice', () => {
  expect(
    phaseNoticeText(section, activeProfile.meta, 'family', phase({ status: 'upcoming' })),
  ).toBe(null)
})
