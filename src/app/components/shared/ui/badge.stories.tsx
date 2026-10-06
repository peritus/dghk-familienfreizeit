import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge.js'

const meta = {
  title: 'Shared/Primitives/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: {
        component:
          'Use text badges for compact state labels. Color supports the text; it never replaces it.',
      },
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 bg-background p-6">
      <Badge>Frei</Badge>
      <Badge variant="free">2 frei</Badge>
      <Badge tone="success">Platziert</Badge>
      <Badge tone="attention">Prüfen</Badge>
      <Badge tone="danger">Blockiert</Badge>
      <Badge variant="pinned">Fest zugeordnet</Badge>
    </div>
  ),
}

/** Visual samples of the remaining tones; the labels name tones, not product states. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 bg-background p-6">
      <Badge tone="draft">Ton draft</Badge>
      <Badge tone="held">Ton held</Badge>
    </div>
  ),
}
