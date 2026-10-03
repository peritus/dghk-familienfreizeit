import type { Meta, StoryObj } from '@storybook/react-vite'
import { BedIcon, BunkBedIcon, DoubleBedIcon, SingleBedIcon } from './bed-icons'

const meta = {
  title: 'Shared/Icons/Bed icons',
  parameters: {
    docs: {
      description: {
        component:
          'Use bed icons as supporting information next to a text label. Never rely on the glyph alone to communicate bed type.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 bg-background p-6">
      <figure className="grid justify-items-center gap-2">
        <SingleBedIcon className="size-16" />
        <figcaption>Einzelbett</figcaption>
      </figure>
      <figure className="grid justify-items-center gap-2">
        <DoubleBedIcon className="size-16" />
        <figcaption>Doppelbett</figcaption>
      </figure>
      <figure className="grid justify-items-center gap-2">
        <BunkBedIcon className="size-16" />
        <figcaption>Etagenbett</figcaption>
      </figure>
    </div>
  ),
}

export const SelectedByValue: Story = {
  render: () => (
    <div className="flex gap-6 bg-background p-6">
      {['single', 'double', 'bunk', 'unknown'].map((bedType) => (
        <BedIcon key={bedType} bed_type={bedType} aria-label={bedType} className="size-12" />
      ))}
    </div>
  ),
}
