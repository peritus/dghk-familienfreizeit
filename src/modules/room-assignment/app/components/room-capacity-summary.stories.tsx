import type { Meta, StoryObj } from '@storybook/react-vite'
import { RoomCapacitySummary } from './room-capacity-summary.js'

const meta = {
  title: 'Modules/room-assignment/Components/Room capacity summary',
  component: RoomCapacitySummary,
  parameters: {
    docs: {
      description: {
        component:
          'Use this shared summary wherever a room shows total sleeping places and current availability.',
      },
    },
  },
} satisfies Meta<typeof RoomCapacitySummary>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = { args: { capacity: 5, free: 2 } }

export const Full: Story = { args: { capacity: 5, free: 0 } }

export const OverCapacity: Story = { args: { capacity: 5, free: -1 } }
