import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrganiserDecisions } from './decisions.js'

const meta = {
  title: 'Screens/Organiser/Placement decisions',
  component: OrganiserDecisions,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The decision screen makes resolver findings actionable while keeping mechanism, strength, note, author, and time visible to organisers.',
      },
    },
  },
} satisfies Meta<typeof OrganiserDecisions>

export default meta
type Story = StoryObj<typeof meta>

export const FindingsAndDecisions: Story = {}

export const AddDecision: Story = {
  play: async ({ canvas }) => {
    await canvas.getByRole('button', { name: 'Entscheidung hinzufügen' }).first().click()
  },
}

