import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './skeleton'

const meta = {
  title: 'Shared/Primitives/Skeleton',
  component: Skeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Use Skeleton only while content is loading. Preserve the approximate shape of the content that will replace it.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Page: Story = {
  render: () => (
    <div className="max-w-xl space-y-4 bg-background p-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  ),
}
