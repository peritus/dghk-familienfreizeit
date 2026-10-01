import type { WorkshopAuthoringView } from '../../modules/official-workshops/app/components/authoring.js'
import type {
  WorkshopSlotView,
  WorkshopSpaceView,
} from '../organiser/components/workshop/resources.js'

export type FullWorkshopFixture = {
  id: string
  title: string
  description: string
  audience: string
  age_range: string
  capacity: number
  participation_mode: string
  leaders: readonly string[]
  requirement?: string
  placement: NonNullable<WorkshopAuthoringView['placement']>
  demand: string
}

export const fullWorkshopCatalogue: readonly FullWorkshopFixture[] = [
  {
    id: 'keramik',
    title: 'Keramik',
    description: 'Schalen und Figuren aus Ton, gebrannt bis Sonntag.',
    audience: 'Kinder',
    age_range: '5–14 Jahre',
    capacity: 10,
    participation_mode: 'Automatische Zuordnung',
    leaders: ['Sam Morgan', 'Anna Albers'],
    requirement: 'Brennofen',
    placement: { label: 'Vorläufig · Fr 09:00 · Atelier', tone: 'success' },
    demand: '8/10 zugeordnet · 14 Wünsche',
  },
  {
    id: 'wald',
    title: 'Waldexpedition',
    description: 'Spuren lesen, Tiere beobachten, ein Lager bauen.',
    audience: 'Kinder',
    age_range: '5–14 Jahre',
    capacity: 14,
    participation_mode: 'Automatische Zuordnung',
    leaders: ['Jens Brandt', 'Lina Seidel'],
    requirement: 'draußen',
    placement: { label: 'Vorläufig · Fr 11:30 · Wiese', tone: 'success' },
    demand: '14/14 zugeordnet · 21 Wünsche',
  },
  {
    id: 'zirkus',
    title: 'Zirkus',
    description: 'Jonglieren, Balancieren und eine kleine Vorführung.',
    audience: 'Kinder',
    age_range: '5–12 Jahre',
    capacity: 16,
    participation_mode: 'Automatische Zuordnung',
    leaders: ['Pereira (extern)', 'Katrin Conrad'],
    requirement: 'Matten',
    placement: { label: 'Vorläufig · Sa 09:00 · Halle', tone: 'success' },
    demand: '12/16 zugeordnet · 18 Wünsche',
  },
  {
    id: 'band',
    title: 'Bandprobe',
    description: 'Die Jugendgruppe probt offen. Wer mitspielen will, meldet sich an.',
    audience: 'Alle',
    age_range: '12–99 Jahre',
    capacity: 8,
    participation_mode: 'Anmeldung',
    leaders: ['Mats Lorenz'],
    requirement: 'Bühne',
    placement: { label: 'Vorläufig · Sa 17:30 · Saal', tone: 'success' },
    demand: '5 Anmeldungen',
  },
  {
    id: 'schmieden',
    title: 'Schmieden',
    description: 'Einen Haken aus Eisen schmieden.',
    audience: 'Kinder',
    age_range: '12–15 Jahre',
    capacity: 6,
    participation_mode: 'Automatische Zuordnung',
    leaders: ['Kaya (extern)'],
    requirement: 'Esse',
    placement: { label: 'Nicht eingeplant', tone: 'attention' },
    demand: '9 Wünsche · kein passender Raum',
  },
  {
    id: 'aquarell',
    title: 'Aquarell',
    description: 'Landschaften mit Wasserfarben.',
    audience: 'Erwachsene',
    age_range: '18–99 Jahre',
    capacity: 10,
    participation_mode: 'Interesse',
    leaders: ['Katrin Conrad'],
    requirement: 'Tische',
    placement: { label: 'Vorläufig · Sa 11:30 · Atelier', tone: 'success' },
    demand: '7 Interessen',
  },
  {
    id: 'wanderung',
    title: 'Wanderung',
    description: 'Zwei Stunden auf den Hausberg und zurück.',
    audience: 'Erwachsene',
    age_range: '18–99 Jahre',
    capacity: 15,
    participation_mode: 'Automatische Zuordnung',
    leaders: ['Jens Brandt'],
    requirement: 'draußen',
    placement: { label: 'Vorläufig · So 09:30 · Wiese', tone: 'success' },
    demand: '11/15 zugeordnet · 16 Wünsche',
  },
  {
    id: 'achtsamkeit',
    title: 'Achtsamkeit',
    description: 'Stille Übungen für zwischendurch.',
    audience: 'Erwachsene',
    age_range: '18–99 Jahre',
    capacity: 12,
    participation_mode: 'Interesse',
    leaders: ['Sabine Graf'],
    requirement: 'ruhig',
    placement: { label: 'Noch nicht eingeplant', tone: 'attention' },
    demand: '3 Interessen · Raum fehlt',
  },
]

export function mapWorkshopFixtures<T>(
  map: (workshop: FullWorkshopFixture, index: number) => T,
): readonly T[] {
  return fullWorkshopCatalogue.map(map)
}

export const fullWorkshopRows: readonly WorkshopAuthoringView[] = mapWorkshopFixtures(
  (workshop) => workshop,
)

export const fullInternalLeaders = [
  {
    id: 'sam',
    name: 'Sam Morgan',
    age_label: '41 Jahre',
    leads: ['Keramik'],
    participation_count: 3,
  },
  {
    id: 'jens',
    name: 'Jens Brandt',
    age_label: '45 Jahre',
    leads: ['Waldexpedition', 'Wanderung'],
    participation_count: 4,
  },
  {
    id: 'katrin',
    name: 'Katrin Conrad',
    age_label: '37 Jahre',
    leads: ['Zirkus', 'Aquarell'],
    participation_count: 2,
  },
]

export const fullExternalLeaders = [
  {
    id: 'pereira',
    name: 'Pereira',
    phone: '0151 555 0901',
    availability: ['Fr 09:00–11:00', 'Sa 09:00–11:00', 'Sa 11:30–13:30'],
    leads: ['Zirkus'],
  },
  {
    id: 'kaya',
    name: 'Kaya',
    phone: '0151 555 0902',
    availability: ['Fr 09:00–11:00', 'Sa 15:00–17:00'],
    leads: ['Holzwerkstatt', 'Schmieden'],
  },
]

export const fullWorkshopSpaces: readonly WorkshopSpaceView[] = [
  {
    id: 'atelier',
    name: 'Atelier',
    location: 'Haupthaus',
    capacity: 12,
    capabilities: ['Tische', 'Brennofen'],
    blocked_slots: [],
  },
  {
    id: 'halle',
    name: 'Halle',
    location: 'Haus 2',
    capacity: 24,
    capabilities: ['Matten', 'Musikanlage', 'viel Platz'],
    blocked_slots: ['Sa 11:30–13:30'],
  },
  {
    id: 'saal',
    name: 'Saal',
    location: 'Haupthaus',
    capacity: 40,
    capabilities: ['Bühne', 'Tische', 'viel Platz'],
    blocked_slots: ['Sa 11:30–13:30'],
  },
  {
    id: 'wiese',
    name: 'Wiese',
    location: 'Außengelände',
    capacity: 30,
    capabilities: ['draußen'],
    blocked_slots: [],
  },
  {
    id: 'wald',
    name: 'Wald',
    location: 'Außengelände',
    capacity: 20,
    capabilities: ['draußen', 'ruhig'],
    blocked_slots: [],
  },
]

export const fullWorkshopSlots: readonly WorkshopSlotView[] = [
  {
    id: 'fr-1',
    day_label: 'Freitag, 14. Mai',
    time_label: '09:00–11:00',
    workshop_count: 3,
  },
  {
    id: 'fr-2',
    day_label: 'Freitag, 14. Mai',
    time_label: '11:30–13:30',
    workshop_count: 2,
  },
  {
    id: 'sa-1',
    day_label: 'Samstag, 15. Mai',
    time_label: '09:00–11:00',
    workshop_count: 3,
  },
  {
    id: 'sa-2',
    day_label: 'Samstag, 15. Mai',
    time_label: '11:30–13:30',
    workshop_count: 1,
    conflict: 'Raum Saal gesperrt',
  },
  {
    id: 'so-1',
    day_label: 'Sonntag, 16. Mai',
    time_label: '09:30–11:30',
    workshop_count: 2,
  },
]

export const fullProgrammeRows = [
  {
    id: 'fr-1',
    slot_label: '09:00–11:00',
    cells: [
      {
        id: 'keramik',
        state: 'placed' as const,
        title: 'Keramik',
        audience: 'Kinder',
        age_range: '5–14 Jahre',
        leaders: '2 Leitungen',
        capacity_label: '8/10 Plätze',
        demand_label: '14 Wünsche',
      },
      {
        id: 'zirkus',
        state: 'placed' as const,
        title: 'Zirkus',
        audience: 'Kinder',
        age_range: '5–12 Jahre',
        leaders: '2 Leitungen',
        capacity_label: '12/16 Plätze',
        demand_label: '18 Wünsche',
      },
      { id: 'fr-1-saal', state: 'empty' as const },
    ],
  },
  {
    id: 'fr-2',
    slot_label: '11:30–13:30',
    cells: [
      { id: 'fr-2-atelier', state: 'empty' as const },
      {
        id: 'wald',
        state: 'placed' as const,
        title: 'Waldexpedition',
        audience: 'Kinder',
        age_range: '5–14 Jahre',
        leaders: '2 Leitungen',
        capacity_label: '14/14 Plätze',
      },
      { id: 'fr-2-saal', state: 'blocked' as const },
    ],
  },
  {
    id: 'sa-1',
    slot_label: '09:00–11:00',
    cells: [
      { id: 'sa-1-atelier', state: 'empty' as const },
      { id: 'sa-1-halle', state: 'empty' as const },
      {
        id: 'band',
        state: 'placed' as const,
        title: 'Bandprobe',
        audience: 'Alle',
        age_range: '12–99 Jahre',
        leaders: '1 Leitung',
        capacity_label: '5/8 Plätze',
      },
    ],
  },
] as const

export const fullChoiceAnswers = [
  {
    id: 'alex',
    name: 'Alex Morgan',
    age_label: '9 Jahre',
    status: 'Rangfolge',
    ranks: ['Keramik', 'Zirkus', 'Waldexpedition', 'Spielewerkstatt', 'Trommeln'],
  },
  {
    id: 'mira',
    name: 'Mira Stein',
    age_label: '11 Jahre',
    status: 'Rangfolge',
    ranks: ['Bogenschießen', 'Kletterwand', 'Keramik', 'Kochwerkstatt', 'Geocaching'],
  },
  {
    id: 'lena',
    name: 'Lena Bauer',
    age_label: '4 Jahre',
    status: 'Keine Antwort',
    status_tone: 'attention' as const,
    ranks: [],
  },
  {
    id: 'noah',
    name: 'Noah Fischer',
    age_label: '10 Jahre',
    status: 'Keine Präferenz',
    status_tone: 'neutral' as const,
    ranks: [],
  },
]

export const fullDemandRows = mapWorkshopFixtures((workshop, index) => ({
  id: workshop.id,
  title: workshop.title,
  audience: workshop.audience,
  slot:
    ['Fr 09:00–11:00', 'Fr 11:30–13:30', 'Sa 09:00–11:00', 'Sa 17:30–19:30'][index % 4] ??
    'noch offen',
  capacity: workshop.capacity,
  first_choices: [14, 12, 10, 8, 9, 7, 11, 3][index] ?? 0,
  ranked_count: [38, 31, 29, 18, 9, 15, 27, 3][index] ?? 0,
  placement_label: workshop.placement.label,
}))

export const fullTraceStages = [
  {
    id: 'answers',
    label: 'Wünsche abgegeben',
    description: 'von 92 Personen',
    fulfilled: 0,
    capacity: 0,
    overlap: 0,
    leader: 0,
    unscheduled: 0,
    open: 320,
  },
  {
    id: 'round-1',
    label: 'Runde 1',
    description: 'Erstwünsche',
    fulfilled: 62,
    capacity: 8,
    overlap: 4,
    leader: 2,
    unscheduled: 0,
    open: 244,
    details: 'Keramik: 14 Erstwahlen, 10 Plätze',
  },
  {
    id: 'round-2',
    label: 'Runde 2',
    description: 'Zweitwünsche',
    fulfilled: 18,
    capacity: 3,
    overlap: 2,
    leader: 1,
    unscheduled: 1,
    open: 220,
    details: 'Schmieden: kein passender Raum',
  },
  {
    id: 'repair',
    label: 'Reparatur',
    description: 'Konflikte und Kapazität',
    fulfilled: 9,
    capacity: 2,
    overlap: 1,
    leader: 0,
    unscheduled: 1,
    open: 211,
    details: '1 Person bleibt zur Prüfung offen',
  },
]
