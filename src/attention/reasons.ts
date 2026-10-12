const reasons: Readonly<Record<string, readonly [string, string]>> = {
  'closed-explanation-unavailable': [
    'Erklärung zum festgelegten Ergebnis nicht verfügbar.',
    'Explanation for the closed result unavailable.',
  ],
  ['hard.room-unavailable']: ['Zimmer nicht verfügbar', 'Room unavailable'],
  ['hard.trait-requirements']: [
    'Benötigte Zimmermerkmale fehlen',
    'Required room capabilities missing',
  ],
  ['hard.resolver-decisions']: ['Zimmerentscheidung oder Ausschluss', 'Room decision or exclusion'],
  ['hard.keep-apart']: ['Getrennte Unterbringung erforderlich', 'Separate accommodation required'],
  ['hard.sole-occupancy']: ['Zimmer allein erforderlich', 'Sole occupancy required'],
  ['hard.eligibility']: ['Alter oder Zielgruppe passt nicht', 'Age or audience does not match'],
  infant: ['Säuglinge nehmen nicht an der Wahl teil', 'Infants do not take part in choices'],
  ['age-unknown']: ['Alter nicht dokumentiert', 'Age not recorded'],
  ['age-too-young']: ['Unter dem Mindestalter', 'Below minimum age'],
  ['age-too-old']: ['Über dem Höchstalter', 'Above maximum age'],
  ['audience-children']: ['Für Kinder vorgesehen', 'Intended for children'],
  ['audience-adults']: ['Für Erwachsene vorgesehen', 'Intended for adults'],
  ['hard.capacity']: ['Teilnahmeplätze ausgeschöpft', 'Attendance capacity exhausted'],
  ['hard.overlap']: ['Gleichzeitige Teilnahme', 'Simultaneous attendance'],
  ['hard.leader-conflict']: ['Gleichzeitige Leitung', 'Simultaneous leadership'],
  ['hard.cancellation']: ['Kurs nicht mehr verfügbar', 'Workshop unavailable'],
  ['hard.workshop-unavailable']: ['Kurs nicht mehr verfügbar', 'Workshop unavailable'],
  ['hard.unscheduled']: ['Kurs nicht im Programm', 'Workshop not scheduled'],
  ['hard.mode-not-assigned']: ['Andere Teilnahmeart', 'Different participation mode'],
  ['hard.fixed-pair-unresolved']: [
    'Feste Teilnahme nicht beidseitig bestätigt',
    'Fixed attendance pair unmatched',
  ],
  ['policy.target-reached']: [
    'Automatisches Teilnahmeziel erreicht',
    'Automatic attendance target reached',
  ],
  ['hard.slot-unavailable']: ['Slot nicht verfügbar', 'Slot unavailable'],
  ['hard.space-unavailable']: ['Raum nicht verfügbar', 'Space unavailable'],
  ['hard.space-capacity']: ['Raum zu klein', 'Space capacity insufficient'],
  ['hard.space-occupied']: ['Raum bereits belegt', 'Space already occupied'],
  ['hard.space-slot-blocked']: ['Raum für diesen Slot gesperrt', 'Space blocked for this slot'],
  ['hard.missing-capability']: ['Benötigte Ausstattung fehlt', 'Required capability missing'],
  ['hard.no-slot-or-space']: ['Räume oder Slots fehlen', 'Spaces or slots missing'],
  ['hard.fixed-invalid']: ['Feste Entscheidung prüfen', 'Review fixed decision'],
  ['no eligible capacity']: [
    'Gewählte Kurse konnten nicht zugeordnet werden',
    'Chosen workshops could not be assigned',
  ],
  ['no current workshop choice']: [
    'Keine aktuelle Kurswahl dokumentiert',
    'No current workshop choice recorded',
  ],
}
export function attentionReason(code: string, locale = 'de'): string {
  return (
    reasons[code]?.[locale === 'de' ? 0 : 1] ??
    (locale === 'de' ? 'Anforderung nicht erfüllt' : 'Requirement not satisfied')
  )
}
