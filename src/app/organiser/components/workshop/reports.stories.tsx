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
    name: 'Mara Schmidt',
    age_label: '9 Jahre',
    health: 'Hinweis A',
    attendance: true,
  },
  {
    id: 'jamie',
    name: 'Leni Schmidt',
    age_label: '12 Jahre',
    attendance: false,
  },
  {
    id: 'mira',
    name: 'Nika Weber',
    age_label: '11 Jahre',
    health: 'Hinweis B',
    attendance: true,
  },
  {
    id: 'noah',
    name: 'Toni Berger',
    age_label: '10 Jahre',
    attendance: false,
  },
]

export const Roster: Story = {
  render: () => (
    <div className="bg-background p-6">
      <WorkshopRosterDocument
        title="Keramik"
        metadata={[
          'Freitag, 14. Mai 2027 · 09:00–11:00 Uhr · Atelier',
          'Leitung: Robin Schmidt, Paula König · 3 Personen von 10 Plätzen',
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
        title="Mara Schmidt"
        metadata={['9 Jahre · Familie Schmidt', '2 Workshops']}
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
        title="Familie Schmidt"
        metadata={['Robin, Mara, Leni']}
        slots={[
          {
            id: 'one',
            label: 'Fr 09:00–11:00',
            members: [
              { id: 'sam', name: 'Robin', value: 'leitet Keramik' },
              { id: 'alex', name: 'Mara', value: 'Keramik' },
              { id: 'jamie', name: 'Leni', value: 'frei' },
            ],
          },
          {
            id: 'two',
            label: 'Fr 11:30–13:30',
            members: [
              { id: 'sam', name: 'Robin', value: 'frei' },
              { id: 'alex', name: 'Mara', value: 'Waldexpedition' },
              { id: 'jamie', name: 'Leni', value: 'Waldexpedition' },
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
            leaders: 'Robin Schmidt, Paula König',
          },
          {
            id: 'two',
            time: 'Sa 11:30–13:30',
            workshop: 'Aquarell',
            audience: 'Erwachsene, 18–99 Jahre',
            leaders: 'Nika Weber',
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
