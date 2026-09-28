import type { Meta, StoryObj } from '@storybook/react-vite'
import { Welcome } from './welcome.js'

const meta = {
  title: 'Screens/Family view/Welcome',
  component: Welcome,
  parameters: {
    docs: {
      description: {
        component:
          'The family-facing welcome screen explains the next step without exposing organiser navigation or internal event terminology.',
      },
    },
  },
} satisfies Meta<typeof Welcome>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
