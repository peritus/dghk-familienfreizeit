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
  test('validation views compose kernel and selected-module event schemas', () => {
    const module = defineModule({
      id: 'fixture-events',
      params: z.object({}),
      contribute: () => ({
        events: [
          {
            type: 'FixtureAdded',
            payload: z.object({ fixture_id: z.string() }),
            authorize: () => true,
            fold: () => {},
          },
        ],
      }),
    })
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [module({})] })

    expect(profile.validation_view.event_payload_schemas).toEqual(
      expect.objectContaining({
        FamilyInvited: expect.anything(),
        FixtureAdded: expect.anything(),
      }),
    )
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

    const roomScoped = defineModule({
      id: 'room-scoped',
      params: z.object({ trait: z.string() }),
      contribute: () => ({
        trait_roles: [{ parameter: 'trait', kind: 'property' as const, scopes: ['room'] }],
      }),
    })
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {
          'family-trait': property({
            title: 'Family',
            scopes: ['family'],
            value: enumOf(['yes']),
          }),
        },
        modules: [roomScoped({ trait: 'family-trait' })],
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
  test('compiles capability derivations, sensitivity, and validity into the kernel view', () => {
    const profile = defineOccasionProfile({
      meta,
      traits: {
        floor: property({ title: 'Floor', scopes: ['family'], value: enumOf(['ground']) }),
        accessible: capability({
          title: 'Accessible',
          scopes: ['family'],
          value: enumOf(['yes']),
          sensitivity: 'restricted',
          derive: (entity) => entity.label('floor') === 'ground',
        }),
      },
    })
    expect(profile.validation_view.capability_descriptors).toHaveLength(1)
    expect(
      profile.validation_view.label_schemas?.find((schema) => schema.key === 'accessible')
        ?.sensitivity,
    ).toBe('restricted')
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
  test('rejects a module shadowing a kernel entity kind or event type', () => {
    const noopFold = (): void => {}
    const shadowsKind = defineModule({
      id: 'shadow-kind',
      params: z.object({}),
      contribute: () => ({ entity_kinds: [{ id: 'family', prefix: 'xx_' }] }),
    })
    expect(() => defineOccasionProfile({ meta, traits: {}, modules: [shadowsKind({})] })).toThrow(
      /duplicate contribution/,
    )
    const shadowsEvent = defineModule({
      id: 'shadow-event',
      params: z.object({}),
      contribute: () => ({
        events: [{ type: 'FamilyInvited', payload: z.object({}), fold: noopFold }],
      }),
    })
    expect(() => defineOccasionProfile({ meta, traits: {}, modules: [shadowsEvent({})] })).toThrow(
      /duplicate contribution/,
    )
  })
  test('rejects two modules declaring the same entity-kind id prefix', () => {
    const withPrefix = (id: string) =>
      defineModule({
        id,
        params: z.object({}),
        contribute: () => ({ entity_kinds: [{ id: `${id}-kind`, prefix: 'wg_' }] }),
      })
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {},
        modules: [withPrefix('one')({}), withPrefix('two')({})],
      }),
    ).toThrow(/duplicate contribution/)
  })
  test('validates module label ownership per entity scope', () => {
    const module = (id: string) =>
      defineModule({
        id,
        params: z.object({}),
        contribute: () => ({ label_keys: [{ key: 'module-label', scopes: ['room'] }] }),
      })
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {},
        modules: [module('one')({}), module('two')({})],
      }),
    ).toThrow(/duplicate module label ownership/)

    const inventory = module('inventory')
    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {
          'module-label': property({ title: 'Label', scopes: ['room'], value: enumOf(['yes']) }),
        },
        modules: [inventory({})],
      }),
    ).toThrow(/profile trait module-label overlaps module label ownership/)

    expect(() =>
      defineOccasionProfile({
        meta,
        traits: {
          'module-label': property({ title: 'Label', scopes: ['family'], value: enumOf(['yes']) }),
        },
        modules: [inventory({})],
      }),
    ).not.toThrow()
  })
})
