import type {
  AssignmentPrintView,
  BoardView,
  CommunicationEntryView,
  CommunicationReviewView,
  DecisionScreenView,
  FamilyView,
  FindingView,
  PlanDiffView,
  PlanView,
  ReleaseScopeView,
  RoomView,
} from './types.js'

const seidel: FamilyView = {
  id: 'family-seidel',
  name: 'Familie Seidel',
  people: [
    { id: 'person-seidel-1', name: 'Mara Seidel', role: 'adult' },
    { id: 'person-seidel-2', name: 'Jonas Seidel', role: 'adult' },
    { id: 'person-seidel-3', name: 'Lina Seidel', role: 'child' },
    { id: 'person-seidel-4', name: 'Emil Seidel', role: 'child' },
    { id: 'person-seidel-5', name: 'Noa Seidel', role: 'child' },
  ],
  requirements: ['5 Schlafplätze', 'ruhiger Bereich'],
  status: { label: 'Kein passendes Zimmer', tone: 'danger' },
}

const morgan: FamilyView = {
  id: 'family-morgan',
  name: 'Familie Morgan',
  people: [
    { id: 'person-morgan-1', name: 'Alex Morgan', role: 'adult' },
    { id: 'person-morgan-2', name: 'Jamie Morgan', role: 'child' },
  ],
  requirements: ['Nähe zum Eingang'],
  status: { label: 'Platziert', tone: 'success' },
}

const rivera: FamilyView = {
  id: 'family-rivera',
  name: 'Familie Rivera',
  people: [
    { id: 'person-rivera-1', name: 'Sam Rivera', role: 'adult' },
    { id: 'person-rivera-2', name: 'Kim Rivera', role: 'adult' },
    { id: 'person-rivera-3', name: 'Toni Rivera', role: 'child' },
  ],
  requirements: ['Eigenes Bad bevorzugt'],
  status: { label: 'Platziert', tone: 'success' },
}

const lang: FamilyView = {
  id: 'family-lang',
  name: 'Familie Lang',
  people: [{ id: 'person-lang-1', name: 'Robin Lang', role: 'adult' }],
  requirements: ['Einzelzimmer'],
  status: { label: 'Prüfung erforderlich', tone: 'attention' },
}

const room12: RoomView = {
  id: 'room-12',
  name: 'Zimmer 12',
  building: 'Haupthaus',
  floor: '1. Stock',
  capacity: 4,
  occupied: 2,
  occupants: [morgan],
  capabilities: ['Eigenes Bad', 'Eingangsnähe'],
  state: 'occupied',
  soft_notes: ['Exakter Sitzplatz-Fit für Familie Morgan'],
}

const room14: RoomView = {
  id: 'room-14',
  name: 'Zimmer 14',
  building: 'Haupthaus',
  floor: '1. Stock',
  capacity: 6,
  occupied: 0,
  occupants: [],
  capabilities: ['Gemeinschaftsbad', 'Ruhiger Flur'],
  state: 'available',
  soft_notes: ['Zwei freie Plätze nach geplanter Belegung'],
}

const room16: RoomView = {
  id: 'room-16',
  name: 'Zimmer 16',
  building: 'Haupthaus',
  floor: '1. Stock',
  capacity: 3,
  occupied: 3,
  occupants: [rivera],
  capabilities: ['Gemeinschaftsbad'],
  state: 'occupied',
}

const garden3: RoomView = {
  id: 'room-garden-3',
  name: 'Zimmer 3',
  building: 'Gartenhaus',
  floor: 'Erdgeschoss',
  capacity: 2,
  occupied: 0,
  occupants: [],
  capabilities: ['Barrierearm', 'Eigenes Bad'],
  state: 'infeasible',
  reasons: ['Für die angefragte Familiengröße fehlen drei Schlafplätze.'],
}

const findingCapacity: FindingView = {
  id: 'finding-capacity',
  severity: 'warning',
  title: 'Familie Seidel ist noch nicht platziert',
  description: 'Kein verfügbares Zimmer erfüllt gleichzeitig Größe und Anforderungen.',
  subjects: ['Familie Seidel', 'Zimmer 14'],
  action: 'Auf dem Belegungsboard prüfen',
}

const findingRequirement: FindingView = {
  id: 'finding-requirement',
  severity: 'error',
  title: 'Anforderung ohne passende Ressource',
  description: 'Für eine bevorzugte Lage sind aktuell keine passenden Plätze verfügbar.',
  subjects: ['Familie Lang', 'Nähe zum Eingang'],
  action: 'Entscheidung prüfen',
}

export const accommodationBoardFixture: BoardView = {
  sequence: 1482,
  buildings: [
    { id: 'building-main', name: 'Haupthaus', rooms: [room12, room14, room16] },
    { id: 'building-garden', name: 'Gartenhaus', rooms: [garden3] },
  ],
  unplaced: [seidel, lang],
  unplaced_reasons: {
    'family-seidel':
      '5 Plätze benötigt; kein Zimmer mit ausreichender Kapazität und passender Ruhezone.',
    'family-lang': 'Einzelzimmer ist vorhanden, die gewünschte Nähe zum Eingang aber nicht.',
  },
  traces: {
    'family-morgan': [
      {
        step: 'Belegung behalten',
        subject: 'Familie Morgan',
        text: 'Zimmer 12 bleibt ein gültiger Platz.',
        score: 18,
        terms: [
          { label: 'Exakter Fit', value: 10 },
          { label: 'Eingangsnähe', value: 8 },
        ],
      },
    ],
    'family-seidel': [
      {
        step: 'Nicht platziert',
        subject: 'Familie Seidel',
        text: 'Alle geprüften Zimmer wurden wegen harter Regeln ausgeschlossen.',
        rejected: [
          { room: 'Zimmer 12', reason: 'Nur 2 freie Plätze' },
          { room: 'Zimmer 14', reason: 'Ruhezone nicht bestätigt' },
          { room: 'Zimmer 3', reason: 'Nur 2 Plätze' },
        ],
      },
    ],
  },
  draft_changes: [
    { id: 'draft-1', summary: 'Seidel → Zimmer 14', detail: 'Manuelle Platzierungsentscheidung' },
    { id: 'draft-2', summary: 'Zimmer 14: Ruhezone', detail: 'Zusätzliche Entscheidung' },
    { id: 'draft-3', summary: 'Lang → Prüfung', detail: 'Anforderung aktualisiert' },
  ],
}

export const decisionFixture: DecisionScreenView = {
  findings: [findingCapacity, findingRequirement],
  decisions: [
    {
      id: 'decision-1',
      holder: 'Familie Morgan',
      direction: 'needs',
      value: 'Nähe zum Eingang',
      strength: 'required',
      note: 'Kurzer Weg für Jamie.',
      author: 'Anna Keller',
      recorded_at: '15. September · 09:12',
    },
    {
      id: 'decision-2',
      holder: 'Zimmer 12',
      direction: 'provides',
      value: 'Nähe zum Eingang',
      strength: 'required',
      author: 'Systemprofil',
      recorded_at: '14. September · 16:40',
    },
    {
      id: 'decision-3',
      holder: 'Familie Rivera',
      direction: 'separates',
      value: 'Familie Morgan',
      strength: 'preferred',
      note: 'Wunsch der Familien, kein harter Ausschluss.',
      author: 'Anna Keller',
      recorded_at: '14. September · 14:22',
    },
  ],
}

const currentPlan = {
  id: 'plan-current',
  label: 'Aktueller Belegungsplan',
  sequence: 1482,
  created_at: 'Heute · 10:42',
  placements: 3,
  unplaced: 2,
  findings: 2,
  status: { label: 'Prüfung erforderlich', tone: 'attention' as const },
  summary: 'Drei Familien platziert, zwei Familien benötigen eine Entscheidung.',
}

const reviewPlan = {
  id: 'plan-review',
  label: 'Vorschlag nach Entscheidungen',
  sequence: 1474,
  created_at: 'Heute · 09:18',
  placements: 4,
  unplaced: 1,
  findings: 1,
  status: { label: 'Bereit zur Prüfung', tone: 'success' as const },
  summary: 'Die manuelle Entscheidung bringt Familie Seidel in Zimmer 14.',
}

export const planFixture: PlanView = {
  summary: currentPlan,
  findings: [findingCapacity, findingRequirement],
  traces: [
    {
      step: 'Belegung behalten',
      subject: 'Familie Morgan',
      text: 'Die bisherige Belegung bleibt gültig und wird zuerst behalten.',
      score: 18,
      terms: [
        { label: 'Exakter Fit', value: 10 },
        { label: 'Eingangsnähe', value: 8 },
      ],
    },
    {
      step: 'Nicht platziert',
      subject: 'Familie Seidel',
      text: 'Kein Zimmer erfüllt alle harten Regeln.',
    },
  ],
}

export const planDiffFixture: PlanDiffView = {
  before: reviewPlan,
  after: currentPlan,
  changes: [
    {
      id: 'change-seidel',
      family: 'Familie Seidel',
      people: 'Mara, Jonas, Lina, Emil und Noa',
      kind: 'unplaced',
      before: 'Zimmer 14',
      after: 'Nicht platziert',
      reason: 'Die Ruhezone ist im aktuellen Plan nicht mehr bestätigt.',
      detail: 'Harte Anforderung blockiert die automatische Belegung.',
    },
    {
      id: 'change-lang',
      family: 'Familie Lang',
      people: 'Robin',
      kind: 'moved',
      before: 'Zimmer 3',
      after: 'Nicht platziert',
      reason: 'Die gewünschte Eingangsnähe ist nicht verfügbar.',
    },
    {
      id: 'change-morgan',
      family: 'Familie Morgan',
      people: 'Alex und Jamie',
      kind: 'unchanged',
      before: 'Zimmer 12',
      after: 'Zimmer 12',
      reason: 'Gültige Belegung behalten.',
    },
  ],
}

export const printFixture: AssignmentPrintView = {
  generated_at: 'Heute · 10:42',
  sequence: 1482,
  total_families: 5,
  placed_families: 3,
  unplaced_families: 2,
  rooms: [
    {
      room: 'Zimmer 12',
      building: 'Haupthaus · 1. Stock',
      occupants: 'Familie Morgan',
      capacity: '2 / 4 Plätze',
      status: { label: 'Belegt', tone: 'success' },
      notes: ['Eigenes Bad', 'Nähe zum Eingang'],
    },
    {
      room: 'Zimmer 14',
      building: 'Haupthaus · 1. Stock',
      occupants: 'Leer',
      capacity: '0 / 6 Plätze',
      status: { label: 'Frei', tone: 'neutral' },
      notes: ['Gemeinschaftsbad', 'Ruhiger Flur'],
    },
    {
      room: 'Zimmer 16',
      building: 'Haupthaus · 1. Stock',
      occupants: 'Familie Rivera',
      capacity: '3 / 3 Plätze',
      status: { label: 'Voll', tone: 'attention' },
      notes: ['Gemeinschaftsbad'],
    },
  ],
  unplaced: [
    {
      family: 'Familie Seidel',
      people: '5 Personen',
      reason: 'Kein Zimmer mit ausreichender Kapazität und passender Ruhezone.',
    },
    { family: 'Familie Lang', people: '1 Person', reason: 'Eingangsnähe ist nicht verfügbar.' },
  ],
  findings: [findingCapacity, findingRequirement],
}

export const releaseScopesFixture: readonly ReleaseScopeView[] = [
  {
    id: 'scope-accommodation',
    title: 'Unterkunft',
    detail: 'Zimmer, Schlafplätze und nicht platzierte Familien',
    status: 'changed',
    last_communicated: '12. April · 15:40',
    affected_families: 3,
    change_summary: '3 Familien bewegen sich; 1 Familie ist neu nicht platziert.',
  },
  {
    id: 'scope-saturday',
    title: 'Samstagvormittag',
    detail: 'Workshop-Zeiten und Räume',
    status: 'never-communicated',
    affected_families: 0,
    change_summary: 'Erste Veröffentlichung steht aus.',
    blocking: 'Die Raumzuordnung für einen Workshop ist noch offen.',
  },
  {
    id: 'scope-pottery',
    title: 'Töpfern · Details',
    detail: 'Zeit, Raum und Beschreibung',
    status: 'communicated',
    last_communicated: '10. April · 11:20',
    affected_families: 0,
    change_summary: 'Keine neuen Änderungen.',
  },
]

export const communicationReviewFixture: CommunicationReviewView = {
  scopes: releaseScopesFixture,
  selected_scope_ids: ['scope-accommodation'],
  differences: [
    { label: 'Familie Morgan · Zimmer', before: 'Zimmer 12', after: 'Zimmer 14', kind: 'changed' },
    {
      label: 'Familie Seidel · Unterkunft',
      before: 'Zimmer 14',
      after: 'Nicht platziert',
      kind: 'changed',
    },
    {
      label: 'Jamie Morgan · Schlafplatz',
      before: 'Bett 12-B',
      after: 'Bett 14-A',
      kind: 'changed',
    },
  ],
  affected_families: ['Familie Morgan', 'Familie Seidel', 'Familie Lang'],
  dependencies: [],
  reviewed_sequence: 1482,
  build_label: 'Profilstand · bestätigt',
  notification_count: 3,
}

export const communicationHistoryFixture: readonly CommunicationEntryView[] = [
  {
    id: 'communication-1',
    communicated_at: '12. April · 15:40',
    actor: 'Anna Keller',
    sequence: 1398,
    scopes: ['Unterkunft'],
    note: 'Erste Unterkunftsmitteilung',
    differences: [
      {
        label: 'Familie Morgan · Zimmer',
        before: 'Nicht platziert',
        after: 'Zimmer 12',
        kind: 'changed',
      },
    ],
  },
  {
    id: 'communication-2',
    communicated_at: '10. April · 11:20',
    actor: 'Anna Keller',
    sequence: 1371,
    scopes: ['Töpfern · Details'],
    differences: [{ label: 'Raum', before: 'Werkraum', after: 'Atelier 2', kind: 'changed' }],
  },
]
