import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs } from './tabs.js'

const meta = {
  title: 'Shared/Primitives/Tabs',
  component: Tabs,
  args: {
    label: 'Gebäude',
    value: 'main',
    options: [{ value: 'main', label: 'Haupthaus' }],
    onChange: () => undefined,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Use tabs when a small set of views shares one context and only one view is visible at a time.',
      },
    },
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Buildings: Story = {
  render: function Render() {
    const [value, setValue] = useState('main')
    return (
      <div className="max-w-2xl bg-background p-6">
        <Tabs
          label="Gebäude"
          value={value}
          onChange={setValue}
          options={[
            { value: 'main', label: 'Haupthaus', count: 3 },
            { value: 'garden', label: 'Gartenhaus', count: 1 },
          ]}
        />
      </div>
    )
  },
}
