import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../components/ui/button.js'
import { ExternalLeaderRow, InternalLeaderRow, WorkshopSummaryRow } from './authoring.js'

const meta = {
  title: 'Components/Organiser/Workshop/Authoring',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Semantic authoring pieces for workshop rows, internal leaders, and external leaders. They accept already-derived labels and never perform domain lookups.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const workshop = {
  id: 'keramik',
  title: 'Keramik',
  description: 'Schalen und Figuren aus Ton, gebrannt bis Sonntag.',
  audience: 'Kinder',
  age_range: '5–14 Jahre',
  capacity: 10,
  participation_mode: 'Zugewiesen',
  leaders: ['Sam Morgan', 'Anna Albers'],
  requirement: 'Brennofen',
  placement: { label: 'Vorläufig: Fr 09:00–11:00 · Atelier', tone: 'success' as const },
}

export const WorkshopRows: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-3 bg-background p-6">
      <WorkshopSummaryRow
        workshop={workshop}
        action={
          <Button size="sm" variant="neutral">
            Bearbeiten
          </Button>
        }
      />
      <WorkshopSummaryRow
        workshop={{
          ...workshop,
          id: 'unplaced',
          title: 'Schmieden',
          placement: { label: 'Nicht eingeplant', tone: 'attention' },
          attention: 'Kein Raum hat „Esse“.',
        }}
        action={
          <Button size="sm" variant="neutral">
            Bearbeiten
          </Button>
        }
      />
    </div>
  ),
}

export const LeaderRows: Story = {
  render: () => (
    <div className="grid gap-6 bg-background p-6">
      <div className="overflow-x-auto rounded-base border-2 border-black bg-white">
        <table className="w-full min-w-[36rem] text-left">
          <caption className="sr-only">Leitungen aus der Veranstaltung</caption>
          <thead>
            <tr className="border-b-2 border-black">
              <th className="p-3">Person</th>
              <th className="p-3">Alter</th>
              <th className="p-3">Leitet</th>
              <th className="p-3 text-right">Nimmt teil an</th>
            </tr>
          </thead>
          <tbody>
            <InternalLeaderRow
              leader={{
                id: 'sam',
                name: 'Sam Morgan',
                age_label: '41 Jahre',
                leads: ['Keramik'],
                participation_count: 2,
              }}
            />
          </tbody>
        </table>
      </div>
      <ExternalLeaderRow
        leader={{
          id: 'pereira',
          name: 'Pereira',
          phone: '0151 555 0901',
          availability: ['Fr 09:00–11:00', 'Sa 11:30–13:30'],
          leads: ['Zirkus'],
        }}
        action={
          <Button size="sm" variant="neutral">
            Bearbeiten
          </Button>
        }
      />
    </div>
  ),
}
