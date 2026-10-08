import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SegmentedControl } from './segmented-control'

const meta = {
  title: 'Shared/Primitives/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    docs: {
      description: {
        component:
          'Use SegmentedControl for four or fewer visible choices where comparing the options helps. It is not a general replacement for a select.',
      },
    },
  },
  args: {
    label: 'Bettart',
    value: 'single',
    onChange: () => undefined,
    options: [{ value: 'single', label: 'Einzelbett' }],
  },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: function Render() {
    const [value, setValue] = useState('single')
    return (
      <div className="max-w-md bg-background p-6">
        <SegmentedControl
          label="Bettart"
          value={value}
          onChange={setValue}
          options={[
            { value: 'single', label: 'Einzelbett' },
            { value: 'double', label: 'Doppelbett' },
            { value: 'bunk', label: 'Etagenbett' },
          ]}
        />
      </div>
    )
  },
}

export const Narrow: Story = {
  render: () => (
    <div className="max-w-xs bg-background p-6">
      <SegmentedControl
        label="Schlafraum"
        value="one"
        onChange={() => undefined}
        options={[
          { value: 'one', label: 'Einer' },
          { value: 'two', label: 'Zweiter' },
        ]}
      />
    </div>
  ),
}

export const Filter: Story = {
  args: { label: 'Kategorie', value: 'all', presentation: 'filter', options: [
    { value: 'all', label: 'Alle 24' }, { value: 'one', label: 'Kategorie A 12' }, { value: 'two', label: 'Kategorie B 16' },
  ] },
}
