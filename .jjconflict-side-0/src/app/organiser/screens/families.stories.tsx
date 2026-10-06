import type { Meta, StoryObj } from '@storybook/react-vite'
import { Families } from './families.js'
import { FixtureProvider } from '../../stories/organiser-fixtures.js'

const meta = {
  title: 'Screens/Organiser/Families',
  component: Families,
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
          'The families screen combines the invite form with the current derived family list. Inviting is the primary action; opening a family is a row-level action.',
      },
    },
  },
} satisfies Meta<typeof Families>

export default meta
type Story = StoryObj<typeof meta>

export const WithFamilies: Story = {}
