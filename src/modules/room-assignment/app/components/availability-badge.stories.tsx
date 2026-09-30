import type { Meta, StoryObj } from '@storybook/react-vite'
import { AvailabilityBadge } from './availability-badge.js'

const meta = {
  title: 'UI/Availability badge',
  component: AvailabilityBadge,
  parameters: {
    docs: {
      description: {
        component:
          'Use the dashed, bordered badge for available sleeping places. Availability is a capacity status; room features use Tag instead.',
      },
    },
  },
} satisfies Meta<typeof AvailabilityBadge>

export default meta
type Story = StoryObj<typeof meta>

export const OnePlace: Story = { args: { free: 1 } }

export const SeveralPlaces: Story = { args: { free: 2 } }
