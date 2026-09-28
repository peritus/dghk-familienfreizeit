import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tag } from './tag.js'

const meta = { title: 'UI/Tag', component: Tag } satisfies Meta<typeof Tag>
export default meta
type Story = StoryObj<typeof meta>

export const Properties: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 bg-background p-6">
      <Tag>Eigenes Bad</Tag>
      <Tag>Barrierearm</Tag>
      <Tag>Erdgeschoss</Tag>
    </div>
  ),
}
