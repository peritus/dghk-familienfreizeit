import type { Meta, StoryObj } from '@storybook/react-vite'
import { activeProfilePresentation } from '../active-profile.js'
import { OrganiserLanding } from './organiser-landing.js'

const meta = {
  title: 'Screens/Public/Organiser landing',
  component: OrganiserLanding,
  parameters: {
    docs: {
      description: {
        component:
          'The public landing screen presents the organiser workspace without exposing organiser navigation.',
      },
    },
  },
} satisfies Meta<typeof OrganiserLanding>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { profile: activeProfilePresentation },
}
