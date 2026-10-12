import type { Meta, StoryObj } from '@storybook/react-vite'
import { activeProfilePresentation } from '../active-profile.js'
import { OccasionLanding } from './occasion-landing.js'

const meta = {
  title: 'Screens/Public/Occasion landing',
  component: OccasionLanding,
  parameters: {
    docs: {
      description: {
        component:
          'A profile-branded public occasion landing with configured organiser and visitor actions.',
      },
    },
  },
} satisfies Meta<typeof OccasionLanding>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { profile: activeProfilePresentation },
}

export const MultipleActions: Story = {
  args: {
    profile: {
      ...activeProfilePresentation,
      meta: {
        ...activeProfilePresentation.meta,
        public_landing: {
          ...activeProfilePresentation.meta.public_landing,
          actions: [
            ...activeProfilePresentation.meta.public_landing.actions,
            {
              id: 'schedule',
              label: { de: 'Programm ansehen', en: 'View schedule' },
              emphasis: 'secondary',
              destination: { kind: 'external', href: 'https://example.org/schedule' },
            },
          ],
        },
      },
    },
  },
}
