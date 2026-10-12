import { workshopAgeAdvisory } from './attention.js'
import type { WorkshopRecord } from './index.js'

/** Editor preview shares the registered check's compiled applicability policy. */
export function workshopAgeWarning(
  workshop: Pick<WorkshopRecord, 'audience' | 'age_min' | 'age_max'>,
): string | null {
  return workshopAgeAdvisory(workshop) ? 'Alter und Zielgruppe prüfen' : null
}

export function workshopAgeLabel(workshop: Pick<WorkshopRecord, 'age_min' | 'age_max'>): string {
  return workshop.age_max >= 99
    ? `ab ${workshop.age_min} Jahren`
    : `${workshop.age_min}–${workshop.age_max} Jahre`
}
