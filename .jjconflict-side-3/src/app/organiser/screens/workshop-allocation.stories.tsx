import type { Meta, StoryObj } from '@storybook/react-vite'
import { FixtureProvider, organiserWorkshopFixtureState } from '../../stories/organiser-fixtures.js'
import { WorkshopAllocation } from './workshop-allocation.js'

const meta = {
  title: 'Screens/Organiser/Workshop allocation',
  decorators: [
    (story) => {
      const Story = story
      return (
        <FixtureProvider initialState={organiserWorkshopFixtureState} with_plan>
          <Story />
        </FixtureProvider>
      )
    },
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Answers: Story = { render: () => <WorkshopAllocation /> }
