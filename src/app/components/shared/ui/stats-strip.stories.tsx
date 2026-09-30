import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatsStrip } from './stats-strip.js'

const meta = { title: 'Shared/Primitives/Stats strip', component: StatsStrip } satisfies Meta<
  typeof StatsStrip
>
export default meta
type Story = StoryObj<typeof meta>

export const DynamicColumns: Story = {
  args: { items: [] },
  render: () => (
    <div className="bg-background p-6">
      <StatsStrip
        items={[
          { value: 17, label: 'Familien' },
          { value: 2, label: 'Ohne Zimmer', tone: 'attention' },
          { value: 4, label: 'Fest zugeordnet' },
          { value: 12, label: 'Freie Plätze' },
        ]}
      />
    </div>
  ),
}
