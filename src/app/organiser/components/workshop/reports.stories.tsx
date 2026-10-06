import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  FamilyPlanCell,
  LeaderNames,
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
          'Printable workshop lists matching the prototype: roster, person, family and room plans with their print-only details.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const entries = [
  { id: 'alex', name: 'Mara Schmidt', age: '9', age_long: '9 Jahre', health: 'Hinweis A' },
  { id: 'jamie', name: 'Leni Schmidt', age: '12', age_long: '12 Jahre' },
  { id: 'mira', name: 'Nika Weber', age: '11', age_long: '11 Jahre', health: 'Hinweis B' },
  { id: 'noah', name: 'Toni Berger', age: '10', age_long: '10 Jahre' },
]

export const Roster: Story = {
  render: () => (
    <div className="bg-background p-6">
      <WorkshopRosterDocument
        title="Keramik"
        metadata={[
          'Freitag, 14. Mai 2027, 09:00–11:00 Uhr · Atelier',
          <>
            Leitung:{' '}
            <LeaderNames
              leaders={[
                { name: 'Robin Schmidt', external: false },
                { name: 'Paula König', external: true },
              ]}
            />
          </>,
          <>
            <strong>4 Personen</strong> von 10 Plätzen · Kinder, 5–14 Jahre · 2 Personen mit
            Gesundheitshinweis
          </>,
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
            status: 'assigned',
          },
          {
            id: 'two',
            slot: 'Fr 11:30–13:30',
            workshop: 'Waldexpedition',
            room: 'Wiese',
            role: 'nimmt teil (2. Wahl)',
            status: 'assigned',
          },
          { id: 'three', slot: 'Sa 09:00–11:00', status: 'free' },
          {
            id: 'four',
            slot: 'Sa 11:30–13:30',
            status: 'open',
            role: 'Alle passenden Workshops sind voll.',
          },
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
              {
                id: 'sam',
                name: 'Robin',
                detail: 'erwachsen',
                value: <FamilyPlanCell workshop="Keramik" room="Atelier" lead open={false} />,
              },
              {
                id: 'alex',
                name: 'Mara',
                detail: '9 Jahre',
                value: (
                  <FamilyPlanCell workshop="Keramik" room="Atelier" lead={false} open={false} />
                ),
              },
              {
                id: 'jamie',
                name: 'Leni',
                detail: '12 Jahre',
                value: <FamilyPlanCell workshop={null} room={null} lead={false} open />,
              },
            ],
          },
          {
            id: 'two',
            label: 'Fr 11:30–13:30',
            members: [
              {
                id: 'sam',
                name: 'Robin',
                detail: 'erwachsen',
                value: <FamilyPlanCell workshop={null} room={null} lead={false} open={false} />,
              },
              {
                id: 'alex',
                name: 'Mara',
                detail: '9 Jahre',
                value: (
                  <FamilyPlanCell
                    workshop="Waldexpedition"
                    room="Wiese"
                    lead={false}
                    open={false}
                  />
                ),
              },
              {
                id: 'jamie',
                name: 'Leni',
                detail: '12 Jahre',
                value: <FamilyPlanCell workshop={null} room={null} lead={false} open />,
              },
            ],
          },
        ]}
      />
      <WorkshopRoomPlanDocument
        title="Atelier"
        metadata={['2 Workshops in diesem Raum']}
        entries={[
          {
            id: 'one',
            time: 'Fr 09:00–11:00',
            workshop: 'Keramik',
            audience: 'Kinder, 5–14 Jahre',
            leaders: [
              { name: 'Robin Schmidt', external: false },
              { name: 'Paula König', external: false },
            ],
          },
          { id: 'two', time: 'Fr 11:30–13:30', leaders: [] },
          {
            id: 'three',
            time: 'Sa 11:30–13:30',
            workshop: 'Aquarell',
            audience: 'Erwachsene, ab 18 Jahren',
            leaders: [{ name: 'Nguyen', external: true }],
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
