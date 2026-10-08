import { z } from 'zod'
import { describe, expect, test } from 'vitest'
import { defineOccasionProfile, enumOf, property } from '../../src/config/define.js'
import type { PhaseDate, PhaseDefinition } from '../../src/config/phases.js'
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

const phase = (overrides: Partial<PhaseDefinition> & { id: string }): PhaseDefinition => ({
  area: 'workshops',
  opens: { kind: 'always' },
  target: true,
  closed_by_area: true,
  ...overrides,
})

function moduleWith(
  id: string,
  phases: readonly PhaseDefinition[],
  events: readonly string[] = [],
) {
  return defineModule({
    id,
    params: z.object({}),
    contribute: () => ({
      phases,
      events: events.map((type) => ({
        type,
        payload: z.object({}).strict(),
        authorize: () => true,
        fold: () => {},
      })),
    }),
  })({})
}

function profile(
  modules: readonly ReturnType<typeof moduleWith>[],
  options: {
    phase_dates?: readonly PhaseDate[]
    section?: { phase: string | null; late_contact: string | null }
  } = {},
) {
  return defineOccasionProfile({
    meta: { ...meta, phase_dates: options.phase_dates },
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
            ...(options.section ?? { phase: null, late_contact: null }),
          },
        ],
        module_controls: [],
      }),
    ],
  })
}

describe('phase composition', () => {
  test('accepts an event-opened phase with a target date and a governed section', () => {
    expect(() =>
      profile(
        [
          moduleWith(
            'wishes',
            [phase({ id: 'wishes.choice', opens: { kind: 'event', event: 'ChoiceOpened' } })],
            ['ChoiceOpened'],
          ),
        ],
        {
          phase_dates: [{ phase: 'wishes.choice', target_at: '2027-01-01T10:00:00Z' }],
          section: { phase: 'wishes.choice', late_contact: 'Bitte melden.' },
        },
      ),
    ).not.toThrow()
  })

  test('rejects duplicate, misnamed, and unknown-area phases', () => {
    expect(() =>
      profile([
        moduleWith('wishes', [phase({ id: 'wishes.choice' }), phase({ id: 'wishes.choice' })]),
      ]),
    ).toThrow(/duplicate contribution: phase:wishes.choice/)
    expect(() => profile([moduleWith('wishes', [phase({ id: 'other.choice' })])])).toThrow(
      /must be named wishes.<kebab-case>/,
    )
    expect(() =>
      profile([moduleWith('wishes', [phase({ id: 'wishes.choice', area: 'meals' as never })])]),
    ).toThrow(/unknown area meals/)
  })

  test('rejects an opening event the owning module does not define', () => {
    expect(() =>
      profile([
        moduleWith('wishes', [
          phase({ id: 'wishes.choice', opens: { kind: 'event', event: 'ChoiceOpened' } }),
        ]),
      ]),
    ).toThrow(/opens by ChoiceOpened, which wishes does not define/)
  })

  test('rejects invalid phase dates', () => {
    const modules = [
      moduleWith('wishes', [
        phase({ id: 'wishes.choice' }),
        phase({ id: 'wishes.review', target: false }),
      ]),
    ]
    expect(() =>
      profile(modules, {
        phase_dates: [{ phase: 'wishes.other', target_at: '2027-01-01T10:00:00Z' }],
      }),
    ).toThrow(/undeclared phase wishes.other/)
    expect(() =>
      profile(modules, {
        phase_dates: [{ phase: 'wishes.review', target_at: '2027-01-01T10:00:00Z' }],
      }),
    ).toThrow(/does not accept a target date/)
    expect(() =>
      profile(modules, {
        phase_dates: [
          { phase: 'wishes.choice', target_at: '2027-01-01T10:00:00Z' },
          { phase: 'wishes.choice', target_at: '2027-01-02T10:00:00Z' },
        ],
      }),
    ).toThrow(/two target dates/)
    expect(() =>
      profile(modules, { phase_dates: [{ phase: 'wishes.choice', target_at: '31.03.2027' }] }),
    ).toThrow(/not a UTC instant/)
  })

  test('rejects sections naming undeclared phases or mismatched late copy', () => {
    const modules = [moduleWith('wishes', [phase({ id: 'wishes.choice' })])]
    expect(() =>
      profile(modules, { section: { phase: 'wishes.other', late_contact: 'Bitte melden.' } }),
    ).toThrow(/undeclared phase: wishes.other/)
    expect(() =>
      profile(modules, { section: { phase: 'wishes.choice', late_contact: null } }),
    ).toThrow(/late copy exactly with a phase/)
    expect(() =>
      profile(modules, { section: { phase: null, late_contact: 'Bitte melden.' } }),
    ).toThrow(/late copy exactly with a phase/)
  })

  test('the active profile declares the four phases of both areas', () => {
    expect(
      luebben2027Profile.modules.flatMap(
        (module) => module.contributions.phases?.map(({ id, area }) => [id, area]) ?? [],
      ),
    ).toEqual([
      ['room-assignment.review', 'accommodation'],
      ['workshop-rankings.choice', 'workshops'],
      ['workshop-assignment.review', 'workshops'],
      ['family-preferences.accommodation-preferences', 'accommodation'],
    ])
  })
})
