import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  WorkshopFamilyPlanDocument,
  WorkshopListKinds,
  WorkshopPersonPlanDocument,
  WorkshopRoomPlanDocument,
  WorkshopRosterDocument,
} from './reports.js'

const meta = {
  title: 'Application/Organiser/Workshop/Reports',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Printable workshop reports with explicit confidentiality, table semantics, and prototype-matched narrow card variants.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const entries = [
  {
    id: 'alex',
    name: 'Alex Morgan',
    age_label: '9 Jahre',
    health: 'Nussallergie (schwer)',
    emergency_contact: 'Sam Morgan · 0151 555 1000',
    attendance: true,
  },
  {
    id: 'jamie',
    name: 'Jamie Morgan',
    age_label: '12 Jahre',
    emergency_contact: 'Sam Morgan · 0151 555 1000',
    attendance: false,
  },
  {
    id: 'mira',
    name: 'Mira Stein',
    age_label: '11 Jahre',
    health: 'Asthma. Spray immer dabei.',
    emergency_contact: 'Eva Stein · 0151 555 1003',
    attendance: true,
  },
  {
    id: 'noah',
    name: 'Noah Fischer',
    age_label: '10 Jahre',
    emergency_contact: 'Tim Fischer · 0151 555 1004',
    attendance: false,
  },
]

export const Roster: Story = {
  render: () => (
    <div className="bg-background p-6">
      <WorkshopRosterDocument
        title="Keramik"
        status="Vorläufig, nicht endgültig"
        metadata={[
          'Freitag, 14. Mai 2027 · 09:00–11:00 Uhr · Atelier',
          'Leitung: Sam Morgan, Anna Albers · 3 Personen von 10 Plätzen',
        ]}
        entries={entries}
      />
    </div>
  ),
}

export const Plans: Story = {
  render: () => (
    <div className="grid gap-8 bg-background p-6">
      <WorkshopPersonPlanDocument
        title="Alex Morgan"
        metadata={['9 Jahre · Familie Morgan', '2 Workshops']}
        entries={[
          {
            id: 'one',
            slot: 'Fr 09:00–11:00',
            workshop: 'Keramik',
            room: 'Atelier',
            role: 'nimmt teil (1. Wahl)',
          },
          {
            id: 'two',
            slot: 'Fr 11:30–13:30',
            workshop: 'Waldexpedition',
            room: 'Wiese',
            role: 'nimmt teil (2. Wahl)',
          },
          { id: 'three', slot: 'Sa 09:00–11:00', status: 'open' },
        ]}
      />
      <WorkshopFamilyPlanDocument
        title="Familie Morgan"
        metadata={['Sam, Alex, Jamie']}
        slots={[
          {
            id: 'one',
            label: 'Fr 09:00–11:00',
            members: [
              { id: 'sam', name: 'Sam', value: 'leitet Keramik' },
              { id: 'alex', name: 'Alex', value: 'Keramik' },
              { id: 'jamie', name: 'Jamie', value: 'frei' },
            ],
          },
          {
            id: 'two',
            label: 'Fr 11:30–13:30',
            members: [
              { id: 'sam', name: 'Sam', value: 'frei' },
              { id: 'alex', name: 'Alex', value: 'Waldexpedition' },
              { id: 'jamie', name: 'Jamie', value: 'Waldexpedition' },
            ],
          },
        ]}
      />
      <WorkshopRoomPlanDocument
        title="Atelier"
        metadata={['2 Workshops in diesem Raum', 'Haupthaus · 12 Plätze · Brennofen']}
        entries={[
          {
            id: 'one',
            time: 'Fr 09:00–11:00',
            workshop: 'Keramik',
            audience: 'Kinder, 5–14 Jahre',
            leaders: 'Sam Morgan, Anna Albers',
          },
          {
            id: 'two',
            time: 'Sa 11:30–13:30',
            workshop: 'Aquarell',
            audience: 'Erwachsene, 18–99 Jahre',
            leaders: 'Katrin Conrad',
          },
        ]}
      />
    </div>
  ),
}

export const ListNavigation: Story = {
  render: () => (
    <div className="space-y-6 bg-background p-6">
      <WorkshopListKinds value="workshop" onChange={() => undefined} />
      <p className="text-muted">Die ausgewählte Listenart steuert den folgenden Dokumenttyp.</p>
    </div>
  ),
}
