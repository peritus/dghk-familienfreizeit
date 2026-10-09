import { expect, test } from 'vitest'
import { workshopAgeWarning } from '../../src/modules/official-workshops/checks.js'
import { workshopAgeAdvisory } from '../../src/modules/official-workshops/attention.js'
test('editor preview shares compiled age applicability', () => {
  const value = { audience: 'adults', age_min: 12, age_max: 99 }
  expect(workshopAgeAdvisory(value)).toBe(true)
  expect(workshopAgeWarning(value)).toBe('Alter und Zielgruppe prüfen')
  expect(workshopAgeWarning({ ...value, audience: 'all' })).toBeNull()
})
