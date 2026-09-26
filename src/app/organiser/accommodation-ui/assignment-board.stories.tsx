import type { Meta, StoryObj } from '@storybook/react-vite'
import { AssignmentBoard } from './assignment-board.js'

const meta = {
  title: 'Screens/Organiser/Assignment board',
  component: AssignmentBoard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The board keeps open families visible beside grouped rooms. Every room can explain its placement outcome, and touch users receive the same room picker as keyboard users.',
      },
    },
  },
} satisfies Meta<typeof AssignmentBoard>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}

export const MobileDecisionFlow: Story = {
  parameters: { viewport: { ['defaultViewport']: 'mobile1' } },
  play: async ({ canvas }) => {
    await canvas.getAllByRole('button', { name: 'Raum wählen' })[0]?.click()
  },
}
