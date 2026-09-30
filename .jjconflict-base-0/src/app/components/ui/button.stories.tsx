import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          'Use Button for an explicit action. Choose one primary action per group, use neutral for secondary actions, and reserve danger for consequential or destructive actions.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'noShadow', 'neutral', 'danger', 'reverse'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'Weiter' } }

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 bg-background p-6">
      <Button>Weiter</Button>
      <Button variant="noShadow">Kompakt</Button>
      <Button variant="neutral">Abbrechen</Button>
      <Button variant="danger">Löschen</Button>
      <Button variant="reverse">Zurück</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 bg-background p-6">
      <Button size="xs">Klein</Button>
      <Button size="sm">Normal</Button>
      <Button size="lg">Groß</Button>
      <Button size="icon" aria-label="Prüfen">
        ✓
      </Button>
      <Button size="icon-sm" aria-label="Mehr">
        ⋯
      </Button>
    </div>
  ),
}

export const DisabledAndBusy: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 bg-background p-6">
      <Button disabled>Deaktiviert</Button>
      <Button aria-busy="true">Wird gespeichert …</Button>
    </div>
  ),
}
