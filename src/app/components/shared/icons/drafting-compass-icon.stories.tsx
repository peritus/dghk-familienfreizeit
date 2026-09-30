import type { Meta, StoryObj } from '@storybook/react-vite'
import { DraftingCompassIcon } from './drafting-compass-icon'

const meta = {
  title: 'Shared/Icons/Drafting compass icon',
  component: DraftingCompassIcon,
  parameters: {
    docs: {
      description: {
        component:
          'Use the drafting compass as the family welcome illustration. It is decorative when paired with a visible heading.',
      },
    },
  },
} satisfies Meta<typeof DraftingCompassIcon>

export default meta
type Story = StoryObj<typeof meta>

export const WelcomeIllustration: Story = {
  render: () => (
    <div className="bg-background p-10">
      <DraftingCompassIcon aria-hidden="true" className="size-32 stroke-[1.5]" />
    </div>
  ),
}
