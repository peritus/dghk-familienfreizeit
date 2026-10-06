import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AttendanceMatrix,
  GroupSummaryTable,
  OpenParticipationCasesTable,
  ParticipationDistribution,
  UnrequestedAssignmentsTable,
  type GroupSummaryView,
  type OpenParticipationCaseView,
  type ParticipationPersonView,
  type UnrequestedAssignmentView,
} from './participation.js'

const people: readonly ParticipationPersonView[] = [
  {
    id: 'person-1',
    name: 'Mara Schmidt',
    age_label: '8 Jahre',
    group_label: 'Familie Schmidt',
    status: 'vollständig',
    status_tone: 'success',
    assignments: [
      {
        workshop_id: 'w-1',
        workshop_title: 'Waldentdecker',
        slot_label: 'Fr · 14:00',
        status: 'Wunsch 1',
        status_tone: 'success',
      },
      {
        workshop_id: 'w-2',
        workshop_title: 'Bastelwerkstatt',
        slot_label: 'Sa · 10:00',
        status: 'Wunsch 2',
        status_tone: 'neutral',
      },
    ],
  },
  {
    id: 'person-2',
    name: 'Jonas Weber',
    age_label: '11 Jahre',
    group_label: 'Familie Weber',
    status: 'ein Fall offen',
    status_tone: 'attention',
    assignments: [
      {
        workshop_id: 'w-3',
        workshop_title: 'Klettergarten',
        slot_label: 'Fr · 14:00',
        status: 'automatisch ergänzt',
        status_tone: 'attention',
      },
    ],
  },
  {
    id: 'person-3',
    name: 'Mira Stein',
    age_label: '11 Jahre',
    group_label: 'Familie Stein',
    status: 'vollständig',
    status_tone: 'success',
    assignments: [
      {
        workshop_id: 'w-4',
        workshop_title: 'Bogenschießen',
        slot_label: 'Sa · 09:00',
        status: 'Wunsch 1',
        status_tone: 'success',
      },
      {
        workshop_id: 'w-1',
        workshop_title: 'Keramik',
        slot_label: 'Fr · 09:00',
        status: 'Wunsch 3',
        status_tone: 'neutral',
      },
    ],
  },
  {
    id: 'person-4',
    name: 'Lena Bauer',
    age_label: '4 Jahre',
    group_label: 'Familie Bauer',
    status: 'nicht berücksichtigt',
    status_tone: 'attention',
    assignments: [],
  },
]

const groups: readonly GroupSummaryView[] = [
  {
    id: 'family-schmidt',
    label: 'Familie Schmidt',
    people: 4,
    assigned: 7,
    unassigned: 1,
    open_cases: 0,
  },
  {
    id: 'family-weber',
    label: 'Familie Weber',
    people: 3,
    assigned: 4,
    unassigned: 2,
    open_cases: 1,
  },
  {
    id: 'family-stein',
    label: 'Familie Stein',
    people: 3,
    assigned: 5,
    unassigned: 0,
    open_cases: 0,
  },
]

const unrequested: readonly UnrequestedAssignmentView[] = [
  {
    id: 'unrequested-1',
    person: 'Jonas Weber',
    age_label: '11 Jahre',
    workshop_title: 'Klettergarten',
    reason: 'Keine verfügbare Wahl im Slot',
    priority: 'prüfen',
    priority_tone: 'attention',
  },
  {
    id: 'unrequested-2',
    person: 'Lena Bauer',
    age_label: '4 Jahre',
    workshop_title: 'Keramik',
    reason: 'Keine Antwort für diesen Zeitraum',
    priority: 'beobachten',
    priority_tone: 'neutral',
  },
]

const cases: readonly OpenParticipationCaseView[] = [
  {
    id: 'case-1',
    person: 'Jonas Weber',
    kind: 'Kapazität',
    detail: 'Alle drei Wünsche sind voll.',
    action: 'Zuordnung prüfen',
    status: 'offen',
    status_tone: 'attention',
  },
  {
    id: 'case-2',
    person: 'Mara Schmidt',
    kind: 'Altersbereich',
    detail: 'Wunsch liegt außerhalb der Zielgruppe.',
    action: 'Zielgruppe prüfen',
    status: 'Hinweis',
    status_tone: 'neutral',
  },
  {
    id: 'case-3',
    person: 'Lena Bauer',
    kind: 'Keine Antwort',
    detail: 'Es liegt noch keine Rangfolge vor.',
    action: 'Rangfolge erfassen',
    status: 'offen',
    status_tone: 'attention',
  },
]

const meta = {
  title: 'Modules/workshop-assignment/Components/Participation',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Attendance: Story = {
  render: () => (
    <div className="grid gap-6">
      <ParticipationDistribution total={7} assigned={5} unassigned={2} open_cases={1} />
      <AttendanceMatrix people={people} slots={['Freitag · 14:00', 'Samstag · 10:00']} />
      <GroupSummaryTable groups={groups} />
    </div>
  ),
}

export const Cases: Story = {
  render: () => (
    <div className="grid gap-6">
      <UnrequestedAssignmentsTable assignments={unrequested} />
      <OpenParticipationCasesTable cases={cases} />
    </div>
  ),
}
