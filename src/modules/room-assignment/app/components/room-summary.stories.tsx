import type { Meta, StoryObj } from '@storybook/react-vite'
import { organiserPaths } from '../../../organiser/routes.js'
import { RoomSummary } from './room-summary.js'

const meta = {
  title: 'Modules/room-assignment/Components/Room summary',
  component: RoomSummary,
  args: {
    name: 'Zimmer 203',
    building: 'Haupthaus',
    floor: 'Ohne Etage',
    href: organiserPaths.inventory(),
    capacity: 5,
    free: 2,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Use the same room summary in room cards and overview rows so room identity, location, capacity, and availability stay visually consistent.',
      },
    },
  },
} satisfies Meta<typeof RoomSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {}

export const Full: Story = { args: { free: 0 } }
