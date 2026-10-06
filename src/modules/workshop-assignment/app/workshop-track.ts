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

function readinessText(view: PhaseView | undefined): string {
  if (!view || view.readiness.ready) return 'Bereit zum Festlegen'
  const count = view.readiness.findings.length
  return `Prüfung erforderlich: ${count} ${count === 1 ? 'Hinweis' : 'Hinweise'}`
}

/**
 * The workshop track (spec/architecture/phases.md §4): a fixed mapping from the phase view to
 * stepper states. No screen derives a workshop step from local facts.
 */
export function workshopTrack(input: {
  phases: readonly PhaseView[]
  active_workshop_count: number
  meta: OccasionProfile['meta']
}): TrackStep[] {
  const choice = input.phases.find(({ phase }) => phase === 'workshop-rankings.choice')
  const review = input.phases.find(({ phase }) => phase === 'workshop-assignment.review')
  const authored = input.active_workshop_count > 0
  const opened = choice !== undefined && choice.status !== 'upcoming'
  const closed = choice?.status === 'closed'
  const choosing = choice?.status === 'open' || choice?.status === 'late'
  return [
    {
      id: 'authoring',
      label: 'Workshops anlegen',
      state: authored ? 'complete' : 'current',
      description: authored
        ? `${input.active_workshop_count} Workshop${input.active_workshop_count === 1 ? '' : 's'} angelegt`
        : 'Titel, Zielgruppe und Leitung erfassen',
    },
    {
      id: 'choice',
      label: 'Wahl öffnen',
      state: opened ? 'complete' : authored ? 'current' : 'upcoming',
      description: opened
        ? choice?.status === 'late'
          ? 'Wahl offen, Zieltermin überschritten'
          : 'Familien können wählen'
        : choice?.target_at
          ? `Zieltermin: ${formatDate(choice.target_at, input.meta)}`
          : 'Katalog für Familien öffnen',
    },
    {
      id: 'review',
      label: 'Zuordnung prüfen',
      state: closed ? 'complete' : choosing ? 'current' : 'upcoming',
      description: closed ? 'Geprüft' : readinessText(review),
    },
    {
      id: 'fixed',
      label: 'Festgelegt',
      state: closed ? 'complete' : 'upcoming',
      description:
        closed && choice?.closed
          ? `Festgelegt am ${formatDate(choice.closed.at, input.meta)}`
          : 'Ergebnis für Familien festlegen',
    },
  ]
}
