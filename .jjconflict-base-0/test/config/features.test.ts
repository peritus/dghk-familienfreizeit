import { z } from 'zod'
import { describe, expect, test } from 'vitest'
import { defineOccasionProfile, enumOf, property } from '../../src/config/define.js'
import type { FeatureDefinition } from '../../src/config/features.js'
import { featureBindingName, featureBindingNames } from '../../src/config/features.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { defineModule } from '../../src/modules/define.js'
import { familyPreferences } from '../../src/modules/family-preferences/index.js'

const meta = {
  id: 'test-profile',
  name: { de: 'Test', en: 'Test' },
  description: { de: 'Test', en: 'Test' },
  starts_on: '2027-01-01',
  ends_on: '2027-01-02',
  timezone: 'Europe/Berlin',
  locale: 'de',
  fallback_locale: 'en',
  public_landing: {
    heading: 'Test',
    intro: 'Test',
    actions: [
      {
        id: 'login',
        label: 'Anmelden',
        emphasis: 'primary',
        destination: { kind: 'route', to: '/login' },
      },
    ],
  },
}

const traits = {
  answer: property({
    title: 'Answer',
    scopes: ['family'] as const,
    value: enumOf(['yes']),
    family_facing: {
      control: 'toggle' as const,
      title: 'Answer',
      help: null,
      scope: 'family' as const,
      strengths: null,
      invert: false,
    },
  }),
}

const feature = (overrides: Partial<FeatureDefinition> & { id: string }): FeatureDefinition => ({
  audience: 'organiser',
  subject_kind: null,
  requires_features: [],
  requires_phases: [],
  activation_mode: 'all',
  ...overrides,
})

const wishes = [
  feature({
    id: 'wishes.family-answer',
    audience: 'family',
    organiser_counterpart: 'wishes.organiser-answer',
  }),
  feature({ id: 'wishes.organiser-answer' }),
]

function moduleWith(
  id: string,
  features: readonly FeatureDefinition[],
  options: { requires?: readonly string[]; entity_kinds?: readonly string[] } = {},
) {
  return defineModule({
    id,
    requires: options.requires,
    params: z.object({}),
    contribute: () => ({
      features,
      entity_kinds: options.entity_kinds?.map((kind) => ({ id: kind, prefix: `${kind[0]}x_` })),
    }),
  })
}

function profile(
  modules: readonly ReturnType<ReturnType<typeof moduleWith>>[],
  sectionFeatures: readonly string[] = [],
) {
  return defineOccasionProfile({
    meta,
    traits,
    modules: [
      ...modules,
      familyPreferences({
        sections: [
          {
            key: 'main',
            title: 'Main',
            intro: null,
            traits: ['answer'],
            features: sectionFeatures,
            phase: null,
            late_contact: null,
          },
        ],
        module_controls: [],
      }),
    ],
  })
}

describe('feature composition', () => {
  test('accepts paired family and organiser features governing a section', () => {
    expect(() =>
      profile(
        [moduleWith('wishes', wishes)({})],
        ['wishes.family-answer', 'wishes.organiser-answer'],
      ),
    ).not.toThrow()
  })

  test('rejects a duplicate feature id', () => {
    expect(() =>
      profile([moduleWith('wishes', [...wishes, feature({ id: 'wishes.organiser-answer' })])({})]),
    ).toThrow(/duplicate contribution: feature:wishes.organiser-answer/)
  })

  test('rejects an id outside the owner or without its audience prefix', () => {
    expect(() =>
      profile([moduleWith('wishes', [feature({ id: 'other.organiser-answer' })])({})]),
    ).toThrow(/must be named wishes.organiser-<kebab-case>/)
    expect(() => profile([moduleWith('wishes', [feature({ id: 'wishes.answer' })])({})])).toThrow(
      /must be named wishes.organiser-<kebab-case>/,
    )
  })

  test('requires an organiser counterpart for a family feature (D24)', () => {
    expect(() =>
      profile([
        moduleWith('wishes', [feature({ id: 'wishes.family-answer', audience: 'family' })])({}),
      ]),
    ).toThrow(/needs an organiser counterpart/)
    expect(() =>
      profile([
        moduleWith('wishes', [
          feature({
            id: 'wishes.family-answer',
            audience: 'family',
            organiser_counterpart: 'wishes.family-other',
          }),
          feature({
            id: 'wishes.family-other',
            audience: 'family',
            organiser_counterpart: 'wishes.family-answer',
          }),
        ])({}),
      ]),
    ).toThrow(/needs an organiser counterpart/)
    expect(() =>
      profile([
        moduleWith('wishes', [
          ...wishes,
          feature({
            id: 'wishes.organiser-more',
            organiser_counterpart: 'wishes.organiser-answer',
          }),
        ])({}),
      ]),
    ).toThrow(/cannot name an organiser counterpart/)
  })

  test('rejects unknown, unrequired, and cyclic feature requirements', () => {
    expect(() =>
      profile([
        moduleWith('wishes', [feature({ id: 'wishes.organiser-a', requires_features: ['x.y'] })])(
          {},
        ),
      ]),
    ).toThrow(/requires unknown feature x.y/)
    expect(() =>
      profile([
        moduleWith('base', [feature({ id: 'base.organiser-a' })])({}),
        moduleWith('wishes', [
          feature({ id: 'wishes.organiser-b', requires_features: ['base.organiser-a'] }),
        ])({}),
      ]),
    ).toThrow(/which wishes does not require/)
    expect(() =>
      profile([
        moduleWith('base', [feature({ id: 'base.organiser-a' })])({}),
        moduleWith(
          'wishes',
          [feature({ id: 'wishes.organiser-b', requires_features: ['base.organiser-a'] })],
          { requires: ['base'] },
        )({}),
      ]),
    ).not.toThrow()
    expect(() =>
      profile([
        moduleWith('wishes', [
          feature({ id: 'wishes.organiser-a', requires_features: ['wishes.organiser-b'] }),
          feature({ id: 'wishes.organiser-b', requires_features: ['wishes.organiser-a'] }),
        ])({}),
      ]),
    ).toThrow(/form a cycle/)
  })

  test('rejects an unknown phase', () => {
    expect(() =>
      profile([
        moduleWith('wishes', [
          feature({ id: 'wishes.organiser-a', requires_phases: ['wishes.choice'] }),
        ])({}),
      ]),
    ).toThrow(/requires unknown phase wishes.choice/)
  })

  test('rejects unknown and mismatched subject kinds', () => {
    expect(() =>
      profile([
        moduleWith('wishes', [feature({ id: 'wishes.organiser-a', subject_kind: 'tent' })])({}),
      ]),
    ).toThrow(/unknown subject kind tent/)
    expect(() =>
      profile([
        moduleWith('wishes', [
          feature({ id: 'wishes.organiser-a', subject_kind: 'family' }),
          feature({
            id: 'wishes.organiser-b',
            subject_kind: 'person',
            requires_features: ['wishes.organiser-a'],
          }),
        ])({}),
      ]),
    ).toThrow(/subject kind differs/)
    expect(() =>
      profile([
        moduleWith('wishes', [feature({ id: 'wishes.organiser-a', subject_kind: 'tent' })], {
          entity_kinds: ['tent'],
        })({}),
      ]),
    ).not.toThrow()
  })

  test('rejects sections naming unknown features or two of one audience', () => {
    expect(() => profile([moduleWith('wishes', wishes)({})], ['wishes.family-other'])).toThrow(
      /names unknown feature: wishes.family-other/,
    )
    expect(() =>
      profile(
        [moduleWith('wishes', [...wishes, feature({ id: 'wishes.organiser-more' })])({})],
        ['wishes.organiser-answer', 'wishes.organiser-more'],
      ),
    ).toThrow(/names two organiser features/)
  })

  test('accepts own deselections and rejects foreign or unknown ones', () => {
    expect(() =>
      profile([moduleWith('wishes', wishes)({ deselected_features: ['wishes.family-answer'] })]),
    ).not.toThrow()
    expect(
      profile([moduleWith('wishes', wishes)({ deselected_features: ['wishes.family-answer'] })])
        .modules[0].deselected_features,
    ).toEqual(['wishes.family-answer'])
    expect(() =>
      profile([moduleWith('wishes', wishes)({ deselected_features: ['wishes.family-other'] })]),
    ).toThrow(/deselects unknown feature wishes.family-other/)
    expect(() =>
      profile([
        moduleWith('other', [])({ deselected_features: ['wishes.family-answer'] }),
        moduleWith('wishes', wishes)({}),
      ]),
    ).toThrow(/module other deselects unknown feature wishes.family-answer/)
  })

  test('rejects two features sharing one binding name', () => {
    expect(() =>
      profile([
        moduleWith('wishes', [
          feature({ id: 'wishes.organiser-a-b' }),
          feature({ id: 'wishes.organiser-a--b' }),
        ])({}),
      ]),
    ).toThrow()
    expect(featureBindingName('workshop-rankings.family-workshop-wishes')).toBe(
      'DGHK_FEATURE_WORKSHOP_RANKINGS_FAMILY_WORKSHOP_WISHES',
    )
  })

  test('the active profile declares the M8 wish features and governs their sections', () => {
    expect(featureBindingNames(luebben2027Profile.modules)).toEqual([
      'DGHK_FEATURE_FAMILY_PREFERENCES_FAMILY_ROOM_WISHES',
      'DGHK_FEATURE_FAMILY_PREFERENCES_ORGANISER_ROOM_WISHES',
      'DGHK_FEATURE_WORKSHOP_RANKINGS_FAMILY_WORKSHOP_WISHES',
      'DGHK_FEATURE_WORKSHOP_RANKINGS_ORGANISER_WORKSHOP_WISHES',
    ])
    const sections = (
      luebben2027Profile.modules.find(({ id }) => id === 'family-preferences')?.parameters as {
        sections: readonly { key: string; features: readonly string[] }[]
      }
    ).sections
    expect(Object.fromEntries(sections.map(({ key, features }) => [key, features]))).toEqual({
      people: [],
      'room-wishes': [
        'family-preferences.family-room-wishes',
        'family-preferences.organiser-room-wishes',
      ],
      food: [],
      workshops: [
        'workshop-rankings.family-workshop-wishes',
        'workshop-rankings.organiser-workshop-wishes',
      ],
    })
  })
})
