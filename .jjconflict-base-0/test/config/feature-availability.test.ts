import { z } from 'zod'
import { describe, expect, test } from 'vitest'
import type { ProfileModule } from '../../src/config/define.js'
import type { FeatureDefinition } from '../../src/config/features.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import {
  deriveFeatureView,
  effectiveFeatureIds,
  familyFeatureView,
  sectionOffered,
  type FeatureViewInput,
} from '../../src/derive/features.js'
import { derive } from '../../src/events/fold.js'
import { defineModule } from '../../src/modules/define.js'

const world = derive([], luebben2027Profile.validation_view)

const feature = (overrides: Partial<FeatureDefinition> & { id: string }): FeatureDefinition => ({
  audience: 'organiser',
  subject_kind: null,
  requires_features: [],
  requires_phases: [],
  activation_mode: 'all',
  ...overrides,
})

function modules(
  features: readonly FeatureDefinition[],
  deselected: readonly string[] = [],
): readonly ProfileModule[] {
  return [
    defineModule({ id: 'wishes', params: z.object({}), contribute: () => ({ features }) })({
      deselected_features: deselected,
    }),
  ]
}

const base = (input: Partial<FeatureViewInput>): FeatureViewInput => ({
  modules: luebben2027Profile.modules,
  world,
  overrides: [],
  phase_active: () => true,
  principal: 'diagnostics',
  ...input,
})

const layer = (view: ReturnType<typeof deriveFeatureView>, id: string) =>
  view.find(({ feature: candidate }) => candidate === id)!

describe('feature availability', () => {
  test('every built feature is effective for its own audience in diagnostics', () => {
    const view = deriveFeatureView(base({}))
    expect(
      view.map(({ feature: id, effective, operational }) => [id, effective, operational]),
    ).toEqual([
      ['workshop-rankings.family-workshop-wishes', true, 'built'],
      ['workshop-rankings.organiser-workshop-wishes', true, 'built'],
      ['family-preferences.family-room-wishes', true, 'built'],
      ['family-preferences.organiser-room-wishes', true, 'built'],
    ])
  })

  test('authorised follows the principal audience', () => {
    const organiser = deriveFeatureView(base({ principal: 'organiser' }))
    expect([...effectiveFeatureIds(organiser)]).toEqual([
      'workshop-rankings.organiser-workshop-wishes',
      'family-preferences.organiser-room-wishes',
    ])
    const family = deriveFeatureView(base({ principal: 'family' }))
    expect(familyFeatureView(family)).toEqual([
      { feature: 'workshop-rankings.family-workshop-wishes' },
      { feature: 'family-preferences.family-room-wishes' },
    ])
    expect(effectiveFeatureIds(deriveFeatureView(base({ principal: null })))).toEqual(new Set())
  })

  test('a deselected feature is enabled again only by an on binding', () => {
    const deselected = modules([feature({ id: 'wishes.organiser-a' })], ['wishes.organiser-a'])
    const off = layer(deriveFeatureView(base({ modules: deselected })), 'wishes.organiser-a')
    expect(off).toMatchObject({ selected: false, operational: 'built', effective: false })
    const on = layer(
      deriveFeatureView(
        base({ modules: deselected, overrides: [{ feature: 'wishes.organiser-a', value: 'on' }] }),
      ),
      'wishes.organiser-a',
    )
    expect(on).toMatchObject({ selected: false, operational: 'env-on', effective: true })
  })

  test('an off binding disables a selected feature without touching its counterpart', () => {
    const view = deriveFeatureView(
      base({ overrides: [{ feature: 'family-preferences.family-room-wishes', value: 'off' }] }),
    )
    expect(layer(view, 'family-preferences.family-room-wishes')).toMatchObject({
      selected: true,
      operational: 'env-off',
      effective: false,
    })
    expect(layer(view, 'family-preferences.organiser-room-wishes').effective).toBe(true)
  })

  test('the declared floor: a feature of an unselected module never appears', () => {
    const view = deriveFeatureView(
      base({
        modules: modules([feature({ id: 'wishes.organiser-a' })]),
        overrides: [{ feature: 'family-preferences.family-room-wishes', value: 'on' }],
      }),
    )
    expect(view.map(({ feature: id }) => id)).toEqual(['wishes.organiser-a'])
  })

  test('phase activation honours all and any', () => {
    const features = [
      feature({ id: 'wishes.organiser-all', requires_phases: ['p.a', 'p.b'] }),
      feature({
        id: 'wishes.organiser-any',
        requires_phases: ['p.a', 'p.b'],
        activation_mode: 'any',
      }),
    ]
    const view = deriveFeatureView(
      base({ modules: modules(features), phase_active: (phase) => phase === 'p.a' }),
    )
    expect(layer(view, 'wishes.organiser-all')).toMatchObject({
      phase_active: false,
      effective: false,
    })
    expect(layer(view, 'wishes.organiser-any')).toMatchObject({
      phase_active: true,
      effective: true,
    })
  })

  test('readiness and required features feed ready with their reasons', () => {
    const features = [
      feature({
        id: 'wishes.organiser-a',
        readiness: () => ({ ready: false, reason: 'no workshops', finding_id: 'wishes.empty' }),
      }),
      feature({ id: 'wishes.organiser-b', requires_features: ['wishes.organiser-a'] }),
    ]
    const view = deriveFeatureView(base({ modules: modules(features) }))
    expect(layer(view, 'wishes.organiser-a')).toMatchObject({
      ready: false,
      not_ready: { ready: false, reason: 'no workshops', finding_id: 'wishes.empty' },
      effective: false,
    })
    expect(layer(view, 'wishes.organiser-b')).toMatchObject({
      ready: false,
      failing_requirement: 'wishes.organiser-a',
      not_ready: null,
      effective: false,
    })
  })

  test('a section is offered when ungoverned for the audience or its feature is effective', () => {
    const effective = new Set(['family-preferences.organiser-room-wishes'])
    const room = {
      features: [
        'family-preferences.family-room-wishes',
        'family-preferences.organiser-room-wishes',
      ],
    }
    expect(sectionOffered(room, 'organiser', luebben2027Profile.modules, effective)).toBe(true)
    expect(sectionOffered(room, 'family', luebben2027Profile.modules, effective)).toBe(false)
    expect(sectionOffered({ features: [] }, 'family', luebben2027Profile.modules, effective)).toBe(
      true,
    )
  })
})
