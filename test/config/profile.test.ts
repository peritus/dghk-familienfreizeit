import { z } from 'zod'
import { describe, expect, test } from 'vitest'
import { capability, defineOccasionProfile, enumOf, property } from '../../src/config/define.js'
import { kernelProfile } from '../../src/config/profiles/kernel.js'
import { defineModule } from '../../src/modules/define.js'
import { derive } from '../../src/events/fold.js'

const meta = {
  id: 'test-profile',
  name: { de: 'Test', en: 'Test' },
  description: { de: 'Test', en: 'Test' },
  starts_on: '2027-01-01',
  ends_on: '2027-01-02',
  timezone: 'Europe/Berlin',
  locale: 'de',
  fallback_locale: 'en',
}

describe('occasion profile', () => {
  test('kernel-only fixture produces the M1 validation view without module surface', () => {
    expect(kernelProfile.modules).toEqual([])
    expect(kernelProfile.validation_view.label_schemas?.map(({ key }) => key)).toEqual(['role'])
    expect(() => derive([], kernelProfile.validation_view)).not.toThrow()
  })
  test('rejects invalid vocabulary and impure evaluators', () => {
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {
          bad_key: property({ title: 'Bad', scopes: ['person'], value: enumOf(['not valid']) }),
        },
      }),
    ).toThrow(/kebab/)
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {
          clock: capability({
            title: 'Clock',
            scopes: ['person'],
            value: enumOf(['yes']),
            derive: () => Date.now() > 0,
          }),
        },
      }),
    ).toThrow(/impure/)
  })
  test('validates selected-module dependencies, role shapes, and defaults', () => {
    const assignment = defineModule({
      id: 'assignment',
      requires: ['inventory'],
      params: z.object({ room_trait: z.string().default('room-capability') }),
      contribute: () => ({ trait_roles: [{ parameter: 'room_trait', kind: 'capability' }] }),
    })
    const inventory = defineModule({
      id: 'inventory',
      params: z.object({}),
      contribute: () => ({}),
    })
    const traits = {
      role: property({ title: 'Role', scopes: ['person'], value: enumOf(['adult']) }),
      'room-capability': capability({ title: 'Room', scopes: ['family'], value: enumOf(['yes']) }),
    }
    expect(() => defineOccasionProfile({ meta, traits, modules: [assignment({})] })).toThrow(
      /requires inventory/,
    )
    expect(() =>
      defineOccasionProfile({ meta, traits, modules: [inventory({}), assignment({})] }),
    ).not.toThrow()
    expect(() =>
      defineOccasionProfile({
        meta,
        traits,
        modules: [inventory({}), assignment({ room_trait: 'role' })],
      }),
    ).toThrow(/wrong trait shape/)
  })
  test('threads family_writable onto the validation view and rejects it with organiser_only', () => {
    const profile = defineOccasionProfile({
      meta,
      traits: {
        role: property({
          title: 'Role',
          scopes: ['person'],
          value: enumOf(['adult']),
          family_writable: true,
        }),
      },
    })
    expect(
      profile.validation_view.label_schemas?.find(({ key }) => key === 'role')?.family_writable,
    ).toBe(true)
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {
          role: property({
            title: 'Role',
            scopes: ['person'],
            value: enumOf(['adult']),
            organiser_only: true,
            family_writable: true,
          }),
        },
      }),
    ).toThrow(/organiser_only and family_writable/)
  })
  test('rejects duplicate module contributions', () => {
    const module = (id: string) => ({
      id,
      requires: [],
      enhances: [],
      contributions: { events: [{ type: 'Setup' }] },
    })
    expect(() =>
      defineOccasionProfile({ meta, traits: {}, modules: [module('one'), module('two')] }),
    ).toThrow(/duplicate contribution/)
  })
})
