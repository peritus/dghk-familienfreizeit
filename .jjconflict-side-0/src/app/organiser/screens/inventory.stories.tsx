import type { Meta, StoryObj } from '@storybook/react-vite'
import { Inventory } from './inventory.js'
import { FixtureProvider } from '../../stories/organiser-fixtures.js'

const meta = {
  title: 'Screens/Organiser/Inventory',
  component: Inventory,
  decorators: [
    (story) => {
      const Story = story
      return (
        <FixtureProvider>
          <Story />
        </FixtureProvider>
      )
    },
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Inventory makes the accommodation hierarchy visible: buildings contain rooms, rooms contain beds, and summary numbers are derived from the same event world.',
      },
    },
  },
} satisfies Meta<typeof Inventory>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}
