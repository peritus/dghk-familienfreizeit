import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

const meta = {
  title: 'UI/Dialog',
  parameters: {
    docs: {
      description: {
        component:
          'Use Dialog for focused editing and selection flows. It manages focus, Escape, backdrop interaction, and responsive sheet behavior.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Selection: Story = {
  render: () => (
    <div className="bg-background p-6">
      <Dialog>
        <DialogTrigger render={<Button />}>Raum auswählen</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Familie Braun</DialogTitle>
            <DialogDescription>Wähle einen passenden Raum.</DialogDescription>
          </DialogHeader>
          <div className="mt-6 grid gap-2">
            <Button variant="neutral">Zimmer 12 · 2 Plätze frei</Button>
            <Button variant="neutral">Zimmer 14 · 6 Plätze frei</Button>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="neutral">Abbrechen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
}
