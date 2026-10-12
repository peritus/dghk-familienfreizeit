import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SegmentedControl } from './segmented-control.js'
import { TertiaryNavigation } from './tertiary-navigation.js'

const meta = {
  title: 'Shared/Primitives/TertiaryNavigation',
  component: TertiaryNavigation,
  args: {
    aria_label: 'Kursansichten',
    value: 'workshops',
    items: [
      { value: 'workshops', label: 'Kurse' },
      { value: 'leaders', label: 'Leitungen' },
      { value: 'external', label: 'Extern' },
    ],
    onChange: () => undefined,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Use TertiaryNavigation for a small number of page-local sibling views. The optional controls slot holds related filtering, not another navigation level.',
      },
    },
  },
} satisfies Meta<typeof TertiaryNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const WorkshopViews: Story = {
  render: function Render() {
    const [view, setView] = useState('workshops')
    const [group, setGroup] = useState<'all' | 'children' | 'adults'>('all')
    return (
      <div className="max-w-3xl bg-background p-6">
        <TertiaryNavigation
          aria_label="Kursansichten"
          value={view}
          onChange={setView}
          items={[
            { value: 'workshops', label: 'Kurse' },
            { value: 'leaders', label: 'Leitungen' },
            { value: 'external', label: 'Extern' },
          ]}
          controls={
            <SegmentedControl
              label="Gruppe"
              value={group}
              onChange={setGroup}
              options={[
                { value: 'all', label: 'Alle' },
                { value: 'children', label: 'Kinder' },
                { value: 'adults', label: 'Erwachsene' },
              ]}
            />
          }
        />
        <p className="mt-6">Aktive Ansicht: {view}</p>
      </div>
    )
  },
}
