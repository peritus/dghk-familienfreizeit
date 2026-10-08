import type { Meta, StoryObj } from '@storybook/react-vite'
import { Dashboard } from './dashboard.js'
import { FixtureProvider } from '../../stories/organiser-fixtures.js'

const meta = {
  title: 'Screens/Organiser/Dashboard',
  component: Dashboard,
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
          'The dashboard answers the organiser question “Was braucht heute Aufmerksamkeit?” before showing aggregate counts. Empty diagnostics are a deliberate success state.',
      },
    },
  },
} satisfies Meta<typeof Dashboard>

export default meta
type Story = StoryObj<typeof meta>

export const Healthy: Story = {}
