import { z } from 'zod'
import { describe, expect, test } from 'vitest'
import { defineOccasionProfile, enumOf, property } from '../../src/config/define.js'
import { deriveFeatureView } from '../../src/derive/features.js'
import { derivePhaseView, deriveAreaView, phaseActivation } from '../../src/derive/phases.js'
import { derive } from '../../src/events/fold.js'
import type { Event } from '../../src/events/types.js'
import { defineModule } from '../../src/modules/define.js'
import { familyPreferences } from '../../src/modules/family-preferences/index.js'

const noPayload = z.object({}).strict()
const event = (type: string) => ({
  type,
  payload: noPayload,
  authorize: () => true,
  fold: () => {},
})

const wishes = defineModule({
  id: 'wishes',
  params: z.object({}),
  contribute: () => ({
    events: [event('ChoiceOpened'), event('WishesClosed'), event('WishesReopened')],
    phases: [
      {
        id: 'wishes.choice',
        area: 'workshops',
        opens: { kind: 'event', event: 'ChoiceOpened' },
        target: true,
        closed_by_area: true,
      },
      {
        id: 'wishes.review',
        area: 'workshops',
        opens: { kind: 'always' },
        target: false,
        closed_by_area: false,
        readiness: ({ plan }) =>
          plan
            ? { ready: true }
            : { ready: false, findings: [{ id: 'no-plan', subject_id: null, message: 'none' }] },
      },
    ],
    features: [
      {
        id: 'wishes.family-wishes',
        audience: 'family',
        subject_kind: null,
        requires_features: [],
        requires_phases: ['wishes.choice'],
        activation_mode: 'all',
        organiser_counterpart: 'wishes.organiser-wishes',
      },
      {
        id: 'wishes.organiser-wishes',
        audience: 'organiser',
        subject_kind: null,
        requires_features: [],
        requires_phases: [],
        activation_mode: 'all',
      },
    ],
  }),
})

const profile = defineOccasionProfile({
  meta: {
    id: 'test-profile',
    name: 'Test',
    description: 'Test',
    starts_on: '2027-01-01',
    ends_on: '2027-01-02',
    timezone: 'Europe/Berlin',
    locale: 'de',
    fallback_locale: 'en',
    phase_dates: [{ phase: 'wishes.choice', target_at: '2027-03-31T21:59:59Z' }],
  },
  traits: {
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
  },
  modules: [
    wishes({}),
    familyPreferences({
      sections: [
        {
          key: 'main',
          title: 'Main',
          intro: null,
          traits: ['answer'],
          features: ['wishes.family-wishes', 'wishes.organiser-wishes'],
          phase: 'wishes.choice',
          late_contact: 'Bitte melden.',
        },
      ],
      module_controls: [],
    }),
  ],
})

// Closing and reopening roles come from closed-result contributions; injected here directly.
const config = {
  ...profile.validation_view,
  phase_event_roles: {
    ...profile.validation_view.phase_event_roles,
    WishesClosed: { role: 'close' as const, area: 'workshops' },
    WishesReopened: { role: 'reopen' as const, area: 'workshops' },
  },
}

const log = (...types: readonly string[]): Event[] =>
  types.map((type, index) => ({
    seq: index + 1,
    at: `2027-01-0${index + 1}T10:00:00Z`,
    actor: 'org@test.invalid',
    subject: null,
    type,
    payload: {},
  }))

const view = (types: readonly string[], now = '2027-02-01T00:00:00Z') =>
  derivePhaseView({
    modules: profile.modules,
    meta: profile.meta,
    world: derive(log(...types), config),
    now,
    plan: null,
  })

const status = (phases: ReturnType<typeof view>, id: string) =>
  phases.find(({ phase }) => phase === id)!

const familyEffective = (phases: ReturnType<typeof view>) =>
  deriveFeatureView({
    modules: profile.modules,
    world: derive([], config),
    overrides: [],
    phase_active: phaseActivation(phases),
    principal: 'family',
  }).find(({ feature }) => feature === 'wishes.family-wishes')!.effective

describe('phase view', () => {
  test('an event-opened phase is upcoming until its opening event', () => {
    expect(status(view([]), 'wishes.choice')).toMatchObject({
      status: 'upcoming',
      target_at: '2027-03-31T21:59:59Z',
      closed: null,
    })
    expect(status(view(['ChoiceOpened']), 'wishes.choice').status).toBe('open')
    expect(status(view([]), 'wishes.review').status).toBe('open')
  })

  test('a passed target makes an open phase late, never closed', () => {
    expect(status(view(['ChoiceOpened'], '2027-03-31T21:59:59Z'), 'wishes.choice').status).toBe(
      'open',
    )
    expect(status(view(['ChoiceOpened'], '2027-03-31T21:59:59.001Z'), 'wishes.choice').status).toBe(
      'late',
    )
  })

  test('closing and reopening the area drive closed status and keep the latest closing', () => {
    const closed = view(['ChoiceOpened', 'WishesClosed'])
    expect(status(closed, 'wishes.choice')).toMatchObject({
      status: 'closed',
      closed: { seq: 2, at: '2027-01-02T10:00:00.000Z' },
    })
    expect(status(closed, 'wishes.review').status).toBe('open')
    const reopened = view(['ChoiceOpened', 'WishesClosed', 'WishesReopened'])
    expect(status(reopened, 'wishes.choice')).toMatchObject({
      status: 'open',
      closed: { seq: 2, at: '2027-01-02T10:00:00.000Z' },
    })
    expect(
      deriveAreaView(derive(log('ChoiceOpened', 'WishesClosed'), config), 'workshops'),
    ).toMatchObject({
      closed: true,
      closings: [{ seq: 2 }],
    })
  })

  test('readiness stays separate from status', () => {
    expect(status(view([]), 'wishes.review')).toMatchObject({
      status: 'open',
      readiness: { ready: false, findings: [{ id: 'no-plan' }] },
    })
  })

  test('the family feature follows the phase and returns on reopening', () => {
    expect(familyEffective(view([]))).toBe(false)
    expect(familyEffective(view(['ChoiceOpened']))).toBe(true)
    expect(familyEffective(view(['ChoiceOpened'], '2027-04-02T00:00:00Z'))).toBe(true)
    expect(familyEffective(view(['ChoiceOpened', 'WishesClosed']))).toBe(false)
    expect(familyEffective(view(['ChoiceOpened', 'WishesClosed', 'WishesReopened']))).toBe(true)
  })
})
