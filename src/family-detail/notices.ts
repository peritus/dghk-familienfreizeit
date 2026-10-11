import type { FamilyPreferencesParams, OccasionProfile } from '../config/define.js'
import type { FeatureAudience } from '../config/features.js'
import type { PhaseView } from '../derive/phases.js'

function localized(
  value: string | Readonly<Record<string, string>> | null,
  locale: string,
  fallback: string,
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? value[fallback] ?? Object.values(value)[0] ?? ''
}

function formatPhaseDate(value: string, meta: OccasionProfile['meta']): string {
  return new Intl.DateTimeFormat(meta.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ['timeZone']: meta.timezone,
  }).format(new Date(value))
}

/**
 * The notice for a section's governing phase (spec/architecture/phases.md §8). A Zieltermin
 * never reads as a cut-off; only a closed area names the organiser decision. Without a phase
 * view the static Zieltermin is shown.
 */

export function phaseNoticeText(
  section: FamilyPreferencesParams['sections'][number],
  meta: OccasionProfile['meta'],
  audience: FeatureAudience,
  phases?: readonly PhaseView[],
): string | null {
  if (!section.phase) return null
  const view = phases?.find(({ phase }) => phase === section.phase)
  const target =
    view?.target_at ??
    meta.phase_dates?.find(({ phase }) => phase === section.phase)?.target_at ??
    null
  const title = localized(section.title, meta.locale, meta.fallback_locale)
  if (view?.status === 'closed')
    return audience === 'organiser'
      ? `${title}: Festgelegt${view.closed ? ` am ${formatPhaseDate(view.closed.at, meta)}` : ''}. Änderungen hier erscheinen als Abweichung vom festgelegten Ergebnis.`
      : `${title}: Festgelegt. Für Änderungen wende dich bitte an das Organisationsteam.`
  if (view?.status === 'upcoming') return null
  if (!target) return null
  if (view?.status === 'late')
    return `Zieltermin: ${formatPhaseDate(target, meta)} (überschritten). Änderungen bleiben möglich, werden aber als verspätet markiert.${section.late_contact ? ` ${localized(section.late_contact, meta.locale, meta.fallback_locale)}` : ''}`
  return `Zieltermin: ${formatPhaseDate(target, meta)}. Änderungen bleiben danach möglich, werden aber als verspätet markiert.`
}
