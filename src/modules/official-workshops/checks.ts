import type { WorkshopRecord } from './index.js'

export type WorkshopNote = {
  id: string
  workshop_id: string
  title: string
  message: string
  kind: 'advisory' | 'information'
}

/** Presentation advisories do not add domain validation or solver constraints. */
export function workshopAgeWarning(workshop: Pick<WorkshopRecord, 'audience' | 'age_min' | 'age_max'>): string | null {
  if (workshop.audience === 'adults' && workshop.age_min < 16)
    return 'Zielgruppe Erwachsene, aber das Mindestalter liegt unter 16 Jahren.'
  if (workshop.audience === 'children' && workshop.age_max > 17)
    return 'Zielgruppe Kinder, aber das Höchstalter liegt über 17 Jahren.'
  return null
}

export function workshopNotes(workshops: readonly WorkshopRecord[], knownLeaders: ReadonlySet<string>, demand: Readonly<Record<string, number>> = {}): WorkshopNote[] {
  return workshops.flatMap((workshop) => {
    const notes: WorkshopNote[] = []
    const add = (code: string, message: string, kind: WorkshopNote['kind'] = 'advisory') =>
      notes.push({ id: `${workshop.id}:${code}`, workshop_id: workshop.id, title: workshop.title, message, kind })
    const age = workshopAgeWarning(workshop)
    if (age) add('age', age)
    if (!workshop.leader_ids.length) add('leader-missing', 'Leitung fehlt.')
    else if (workshop.leader_ids.some((id) => !knownLeaders.has(id)))
      add('leader-unresolved', 'Mindestens eine Leitung ist nicht mehr verfügbar.')
    if (workshop.mode === 'assigned' && (demand[workshop.id] ?? 0) > workshop.capacity)
      add('demand', 'Mehr Wünsche als Plätze: ein erwartbares Ergebnis der Zuordnung.', 'information')
    return notes
  })
}

/** Opaque, deterministic content token; reviewed-head validation is the concurrency guard. */
export function workshopAdvisoryFingerprint(notes: readonly WorkshopNote[]): string {
  const content = JSON.stringify(notes.filter((note) => note.kind === 'advisory').map(({ id, message }) => [id, message]).sort(([a], [b]) => a!.localeCompare(b!)))
  let hash = 14695981039346656037n
  for (const char of content) hash = BigInt.asUintN(64, (hash ^ BigInt(char.codePointAt(0)!)) * 1099511628211n)
  return hash.toString(16).padStart(16, '0')
}

export function workshopAgeLabel(workshop: Pick<WorkshopRecord, 'age_min' | 'age_max'>): string {
  return workshop.age_max >= 99 ? `ab ${workshop.age_min} Jahren` : `${workshop.age_min}–${workshop.age_max} Jahre`
}
