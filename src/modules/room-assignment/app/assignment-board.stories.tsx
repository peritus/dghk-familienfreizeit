import type { Meta, StoryObj } from '@storybook/react-vite'
import { FixtureProvider } from '../../../app/stories/organiser-fixtures.js'
import { AssignmentBoardScreen } from './assignment-board.js'

const meta = {
  title: 'Screens/Organiser/Assignment board',
  component: AssignmentBoardScreen,
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
          'The board is a read-only projection of the current derived world and solver result. Configuration screens use the shared organiser draft pipeline.',
      },
    },
  },
} satisfies Meta<typeof AssignmentBoardScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}

export const MobileReviewState: Story = {
  parameters: { viewport: { ['defaultViewport']: 'mobile1' } },
  render: () => (
    <FixtureProvider>
      <AssignmentBoardScreen />
    </FixtureProvider>
  ),
}

export const PopulatedWithSharedOrganiserState: Story = {
  render: () => (
    <FixtureProvider>
      <AssignmentBoardScreen />
    </FixtureProvider>
  ),
}
