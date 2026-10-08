import { describe, expect, test } from 'vitest'
import {
  defineOccasionProfile,
  type ProfileLandingAction,
} from '../../src/config/define.js'

const action = {
  id: 'organiser-login',
  label: { de: 'Als Organisator anmelden', en: 'Organiser login' },
  emphasis: 'primary' as const,
  destination: { kind: 'route' as const, to: '/login' },
}

function profile(actions: readonly ProfileLandingAction[] = [action]) {
  return defineOccasionProfile({
    meta: {
      id: 'landing-test',
      name: { de: 'Test', en: 'Test' },
      description: { de: 'Test', en: 'Test' },
      starts_on: '2027-01-01',
      ends_on: '2027-01-02',
      timezone: 'Europe/Berlin',
      locale: 'de',
      fallback_locale: 'en',
      public_landing: {
        heading: { de: 'Test', en: 'Test' },
        intro: { de: 'Test', en: 'Test' },
        actions,
      },
    },
    traits: {},
  })
}

describe('public landing profile actions', () => {
  test('accepts localized in-app and HTTPS destinations with per-action emphasis', () => {
    expect(
      profile([
        action,
        {
          id: 'schedule',
          label: { de: 'Programm ansehen', en: 'View schedule' },
          emphasis: 'secondary',
          destination: { kind: 'external', href: 'https://example.org/schedule' },
        },
      ]).meta.public_landing.actions,
    ).toHaveLength(2)
  })

  test('requires at least one action and unique kebab-case ids', () => {
    expect(() => profile([])).toThrow(/at least one action/)
    expect(() => profile([action, action])).toThrow(/duplicate public landing action/)
    expect(() => profile([{ ...action, id: 'Organiser Login' }])).toThrow(/kebab-case/)
  })

  test('requires localized labels and valid destinations', () => {
    expect(() =>
      profile([{ ...action, label: { de: 'Anmelden' } } as unknown as ProfileLandingAction]),
    ).toThrow(/localized copy misses profile locale/)
    expect(() => profile([{ ...action, destination: { kind: 'route', to: '//example.org' } }])).toThrow(
      /in-app path/,
    )
    expect(() =>
      profile([
        {
          ...action,
          destination: { kind: 'external', href: 'http://example.org' },
        } as unknown as ProfileLandingAction,
      ]),
    ).toThrow(/HTTPS URL/)
  })
})
