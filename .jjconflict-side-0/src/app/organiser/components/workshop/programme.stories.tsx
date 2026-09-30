import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../components/ui/button.js'
import { ProgrammeGrid, UnplacedWorkshopRow, WorkshopOverlapTable } from './programme.js'

const meta = {
  title: 'Components/Organiser/Workshop/Programme',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Semantic programme cells and review rows. Placement is supplied by the scheduler; the components only present its result and reasons.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Grid: Story = {
  render: () => (
    <div className="bg-background p-6">
      <ProgrammeGrid
        rooms={[
          { id: 'atelier', label: 'Atelier' },
          { id: 'wiese', label: 'Wiese' },
        ]}
        rows={[
          {
            id: 'fr-1',
            slot_label: '09:00–11:00',
            cells: [
              {
                id: 'keramik',
                state: 'placed',
                title: 'Keramik',
                audience: 'Kinder',
                age_range: '5–14 Jahre',
                leaders: 'Sam Morgan',
                capacity_label: '4 Plätze frei',
                on_open: () => undefined,
              },
              {
                id: 'wald',
                state: 'placed',
                title: 'Waldexpedition',
                audience: 'Kinder',
                age_range: '5–14 Jahre',
                leaders: 'Jens Brandt',
                capacity_label: 'Voll',
              },
            ],
          },
          {
            id: 'fr-2',
            slot_label: '11:30–13:30',
            cells: [
              { id: 'blocked', state: 'blocked' },
              { id: 'empty', state: 'empty' },
            ],
          },
        ]}
      />
    </div>
  ),
}

export const ReviewRows: Story = {
  render: () => (
    <div className="grid gap-6 bg-background p-6">
      <ul className="overflow-hidden rounded-base border-2 border-black">
        <UnplacedWorkshopRow
          workshop={{
            id: 'schmieden',
            title: 'Schmieden',
            reason: 'Kein Raum hat „Esse“.',
            demand_label: '5× in einer Rangfolge',
          }}
          action={
            <Button size="sm" variant="neutral">
              Workshop bearbeiten
            </Button>
          }
        />
      </ul>
      <WorkshopOverlapTable
        overlaps={[
          {
            id: 'overlap',
            workshops: 'Keramik + Zirkus',
            slot: 'Fr 09:00–11:00',
            people_count: 3,
            people: ['Alex Morgan', 'Jamie Morgan', 'Mira Stein'],
          },
        ]}
      />
    </div>
  ),
}
