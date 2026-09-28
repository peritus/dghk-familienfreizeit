import type { Meta, StoryObj } from '@storybook/react-vite'
import { FixtureProvider } from '../../../app/stories/organiser-fixtures.js'
import { AssignmentReportsScreen } from './reports.js'

const meta = {
  title: 'Screens/Organiser/Assignment report',
  component: AssignmentReportsScreen,
  decorators: [
    (story) => {
      const StoryComponent = story
      return (
        <FixtureProvider>
          <StoryComponent />
        </FixtureProvider>
      )
    },
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The assignment report is a readable, printable projection of the current placement view.',
      },
    },
  },
} satisfies Meta<typeof AssignmentReportsScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}

export const PopulatedWithSharedOrganiserState: Story = {
  render: () => (
    <FixtureProvider>
      <AssignmentReportsScreen />
    </FixtureProvider>
  ),
}
