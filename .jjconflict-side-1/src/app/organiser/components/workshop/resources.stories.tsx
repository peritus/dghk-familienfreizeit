import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../components/ui/button.js'
import { SlotDayGroup, SpaceRow, SpaceSlotToggle } from './resources.js'

const meta = {
  title: 'Components/Organiser/Workshop/Resources',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Semantic workshop-space and time-slot pieces. Capabilities and availability remain data passed in by the selected profile.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Spaces: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-3 bg-background p-6">
      <SpaceRow
        space={{
          id: 'atelier',
          name: 'Atelier',
          location: 'Haupthaus',
          capacity: 12,
          capabilities: ['Tische', 'Brennofen'],
          blocked_slots: ['Sa 11:30–13:30'],
        }}
        action={
          <Button size="sm" variant="neutral">
            Bearbeiten
          </Button>
        }
      />
      <SpaceRow
        space={{ id: 'wiese', name: 'Wiese', capabilities: ['draußen'], blocked_slots: [] }}
      />
    </div>
  ),
}

export const Slots: Story = {
  render: () => (
    <div className="grid gap-6 bg-background p-6">
      <SlotDayGroup
        day_label="Freitag, 14. Mai"
        slots={[
          { id: 'fr-1', day_label: 'Freitag', time_label: '09:00–11:00', workshop_count: 3 },
          {
            id: 'fr-2',
            day_label: 'Freitag',
            time_label: '11:30–13:30',
            workshop_count: 2,
            conflict: 'Überschneidet sich',
          },
        ]}
        action={() => (
          <Button size="sm" variant="neutral">
            Bearbeiten
          </Button>
        )}
      />
      <div className="flex gap-2">
        <SpaceSlotToggle blocked={false} onChange={() => undefined} />
        <SpaceSlotToggle blocked onChange={() => undefined} />
      </div>
    </div>
  ),
}
