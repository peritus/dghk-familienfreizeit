import type { Meta, StoryObj } from '@storybook/react-vite'
import { FixtureProvider } from '../../stories/organiser-fixtures.js'
import { Workshops, WorkshopProgramme, WorkshopSlots, WorkshopSpaces } from './workshops.js'

const meta = {
  title: 'Screens/Organiser/Workshops',
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
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = { render: () => <Workshops /> }

export const Programme: Story = { render: () => <WorkshopProgramme /> }

export const Slots: Story = { render: () => <WorkshopSlots /> }

export const Spaces: Story = { render: () => <WorkshopSpaces /> }
