import { describe, expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import type { PhaseStatus, PhaseView } from '../../src/derive/phases.js'
import { accommodationTrack } from '../../src/modules/room-assignment/app/accommodation-track.js'
import { workshopTrack } from '../../src/modules/workshop-assignment/app/workshop-track.js'

const view = (
  phase: string,
  area: PhaseView['area'],
  status: PhaseStatus,
  overrides: Partial<PhaseView> = {},
): PhaseView => ({
  phase,
  area,
  status,
  target_at: null,
  readiness: { ready: true },
  closed: null,
  ...overrides,
})

const states = (steps: readonly { state: string }[]) => steps.map(({ state }) => state)

describe('workshop track', () => {
  const track = (choice: PhaseStatus, count = 2, review: Partial<PhaseView> = {}) =>
    workshopTrack({
      phases: [
        view('workshop-rankings.choice', 'workshops', choice, {
          target_at: '2027-04-15T21:59:59Z',
          closed: choice === 'closed' ? { seq: 9, at: '2027-04-20T08:00:00.000Z' } : null,
        }),
        view('workshop-assignment.review', 'workshops', 'open', review),
      ],
      active_workshop_count: count,
      meta: activeProfile.meta,
    })

  test('maps each phase state to one fixed stepper position', () => {
    expect(states(track('upcoming', 0))).toEqual(['current', 'upcoming', 'upcoming', 'upcoming'])
    expect(states(track('upcoming'))).toEqual(['complete', 'current', 'upcoming', 'upcoming'])
    expect(states(track('open'))).toEqual(['complete', 'complete', 'current', 'upcoming'])
    expect(states(track('late'))).toEqual(['complete', 'complete', 'current', 'upcoming'])
    expect(states(track('closed'))).toEqual(['complete', 'complete', 'complete', 'complete'])
  })

  test('describes the Zieltermin, readiness, and the closing time', () => {
    expect(track('upcoming')[1]!.description).toBe('Zieltermin: 15. April 2027')
    expect(
      track('open', 2, {
        readiness: {
          ready: false,
          findings: [{ id: 'x', subject_id: null, message: 'm' }],
        },
      })[2]!.description,
    ).toBe('Prüfung erforderlich: 1 Hinweis')
    expect(track('open')[2]!.description).toBe('Bereit zum Festlegen')
    expect(track('closed')[3]!.description).toBe('Festgelegt am 20. April 2027')
  })
})

describe('accommodation track', () => {
  const track = (status: PhaseStatus) =>
    accommodationTrack({
      phases: [
        view('family-preferences.accommodation-preferences', 'accommodation', status, {
          target_at: '2027-03-31T21:59:59Z',
        }),
        view('room-assignment.review', 'accommodation', 'open'),
      ],
      meta: activeProfile.meta,
    })

  test('wishes lead until the Zieltermin passes, then review, then the closed area', () => {
    expect(states(track('open'))).toEqual(['current', 'upcoming', 'upcoming'])
    expect(states(track('late'))).toEqual(['complete', 'current', 'upcoming'])
    expect(states(track('closed'))).toEqual(['complete', 'complete', 'complete'])
    expect(track('late')[0]!.description).toBe('Zieltermin: 31. März 2027 (überschritten)')
  })
})
