import type { Meta, StoryObj } from '@storybook/react-vite'
import { AssignmentBoard } from './assignment-board.js'
import { WorkspaceShell } from './components.js'

const meta = {
  title: 'Application/Organiser accommodation workspace',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A focused workspace shell keeps the accommodation tools visible without duplicating the application save status or navigation.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const BoardContext: Story = {
  render: () => (
    <WorkspaceShell active="board">
      <AssignmentBoard />
    </WorkspaceShell>
  ),
}
