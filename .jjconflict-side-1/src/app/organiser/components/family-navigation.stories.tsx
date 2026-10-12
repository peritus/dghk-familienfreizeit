import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FamilyTopicNavigation } from './family-navigation.js'
import type { FamilyTopic } from '../../../organiser/routes.js'

const meta = {
  title: 'Application/Organiser/Family navigation',
  component: FamilyTopicNavigation,
  parameters: {
    docs: {
      description: {
        component:
          'Page-local family navigation for the four prototype topics. It preserves the organiser tertiary-navigation contract and keyboard behavior.',
      },
    },
  },
} satisfies Meta<typeof FamilyTopicNavigation>

export default meta
type Story = StoryObj<typeof meta>

function TopicStory() {
  const [topic, setTopic] = useState<FamilyTopic>('zimmer')
  return <FamilyTopicNavigation value={topic} onChange={setTopic} />
}

export const Topics: Story = {
  args: { value: 'zimmer', onChange: () => undefined },
  render: () => <TopicStory />,
}
