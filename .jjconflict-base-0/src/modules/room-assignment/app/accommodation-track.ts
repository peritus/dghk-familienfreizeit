import type { OccasionProfile } from '../../../config/define.js'
import type { PhaseView } from '../../../derive/phases.js'

/** One stepper step; structurally the `WorkflowStep` the shared stepper renders. */
export type TrackStep = {
  id: string
  label: string
  description?: string
  state: 'complete' | 'current' | 'upcoming'
}

function formatDate(value: string, meta: OccasionProfile['meta']): string {
  return new Intl.DateTimeFormat(meta.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ['timeZone']: meta.timezone,
  }).format(new Date(value))
}

/**
 * The accommodation track (spec/architecture/phases.md §4): a fixed mapping from the phase view
 * to stepper states. No screen derives an accommodation step from local facts.
 */
export function accommodationTrack(input: {
  phases: readonly PhaseView[]
  meta: OccasionProfile['meta']
}): TrackStep[] {
  const preferences = input.phases.find(
    ({ phase }) => phase === 'family-preferences.accommodation-preferences',
  )
  const review = input.phases.find(({ phase }) => phase === 'room-assignment.review')
  const closed = preferences?.status === 'closed'
  // Once the Zieltermin has passed, review becomes the current step; wishes stay editable.
  const late = preferences?.status === 'late'
  const findings = review && !review.readiness.ready ? review.readiness.findings.length : 0
  return [
    {
      id: 'preferences',
      label: 'Zimmerwünsche',
      state: closed || late ? 'complete' : 'current',
      description: preferences?.target_at
        ? `Zieltermin: ${formatDate(preferences.target_at, input.meta)}${preferences.status === 'late' ? ' (überschritten)' : ''}`
        : 'Familien geben Zimmerwünsche an',
    },
    {
      id: 'review',
      label: 'Zuordnung prüfen',
      state: closed ? 'complete' : late ? 'current' : 'upcoming',
      description: closed
        ? 'Geprüft'
        : findings > 0
          ? `Prüfung erforderlich: ${findings} ${findings === 1 ? 'Hinweis' : 'Hinweise'}`
          : 'Bereit zum Festlegen',
    },
    {
      id: 'fixed',
      label: 'Festgelegt',
      state: closed ? 'complete' : 'upcoming',
      description:
        closed && preferences?.closed
          ? `Festgelegt am ${formatDate(preferences.closed.at, input.meta)}`
          : 'Zimmerzuordnung für Familien festlegen',
    },
  ]
}
