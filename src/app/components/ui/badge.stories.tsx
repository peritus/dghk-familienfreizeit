import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge.js'

const meta = {
  title: 'UI/Badge',
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
      <Badge tone="success">Platziert</Badge>
      <Badge tone="attention">Prüfen</Badge>
      <Badge tone="danger">Blockiert</Badge>
      <Badge tone="draft">Entwurf</Badge>
      <Badge tone="held">Zurückgehalten</Badge>
    </div>
  ),
}
