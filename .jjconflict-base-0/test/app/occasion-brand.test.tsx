import { expect, test } from 'vitest'
import { familyIdentityLabel } from '../../src/app/components/application/occasion-brand.js'

test.each([
  [undefined, 'de', 'Familie'],
  ['Schmitz', 'de', 'Familie Schmitz'],
  [' Familie Schmitz ', 'de', 'Familie Schmitz'],
  ['Familienfreund', 'de', 'Familie Familienfreund'],
  [undefined, 'en', 'Family'],
  ['Schmitz', 'en', 'Schmitz family'],
  ['Schmitz family', 'en', 'Schmitz family'],
  ['Family Schmitz', 'en', 'Family Schmitz'],
])('family header identity for %s in %s is %s', (name, locale, expected) => {
  expect(familyIdentityLabel(name, locale)).toBe(expected)
})
