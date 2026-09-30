import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../components/shared/ui/button.js'
import { SlotDayGroup, SpaceRow, SpaceSlotToggle } from './resources.js'
import { fullWorkshopSlots, fullWorkshopSpaces } from './story-fixtures.js'

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
      {fullWorkshopSpaces.map((space) => (
        <SpaceRow
          key={space.id}
          space={space}
          action={
            <Button size="sm" variant="neutral">
              Bearbeiten
            </Button>
          }
        />
      ))}
    </div>
  ),
}

export const Slots: Story = {
  render: () => (
    <div className="grid gap-6 bg-background p-6">
      <SlotDayGroup
        day_label="Freitag, 14. Mai"
        slots={fullWorkshopSlots.filter((slot) => slot.day_label.startsWith('Freitag'))}
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
