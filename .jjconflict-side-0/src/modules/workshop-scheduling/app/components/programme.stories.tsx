import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../../app/components/shared/ui/button.js'
import { ProgrammeGrid, UnplacedWorkshopRow, WorkshopOverlapTable } from './programme.js'
import { fullProgrammeRows } from '../../../../app/stories/workshop-fixtures.js'

const meta = {
  title: 'Modules/workshop-scheduling/Components/Programme',
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

export const FullProgramme: Story = {
  render: () => (
    <div className="bg-background p-6">
      <ProgrammeGrid
        rooms={[
          { id: 'atelier', label: 'Atelier' },
          { id: 'wiese', label: 'Wiese' },
        ]}
        rows={fullProgrammeRows.map((row) => ({
          ...row,
          day_label: row.id.startsWith('fr') ? 'Freitag, 14.05.' : 'Samstag, 15.05.',
        }))}
      />
    </div>
  ),
}

/** Compatibility alias for the style guide's existing catalogue entry. */
export const Grid: Story = FullProgramme

export const ReviewRows: Story = {
  render: () => (
    <div className="grid gap-6 bg-background p-6">
      <ul className="overflow-hidden rounded-base border-2 border-border">
        <UnplacedWorkshopRow
          workshop={{
            id: 'schmieden',
            title: 'Schmieden',
            reason: 'Kein Raum hat „Esse“.',
            demand_label: '5× in einer Rangfolge',
          }}
          action={
            <Button size="sm" variant="neutral">
              Kurs bearbeiten
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
