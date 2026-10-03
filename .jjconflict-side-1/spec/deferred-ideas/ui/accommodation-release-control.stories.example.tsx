import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommunicationHistory, CommunicationReview, ReleaseControl } from './release-control.js'

const meta = {
  title: 'Screens/Organiser/Communication',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Communication surfaces separate current organiser review from what families can see, while keeping comparison data read-only and explicit.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Outstanding: Story = { render: () => <ReleaseControl /> }

export const Review: Story = { render: () => <CommunicationReview /> }

export const History: Story = { render: () => <CommunicationHistory /> }
