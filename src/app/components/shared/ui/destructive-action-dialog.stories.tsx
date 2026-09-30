import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button.js'
import { DestructiveActionDialog } from './destructive-action-dialog.js'

const meta = {
  title: 'UI/DestructiveActionDialog',
  parameters: {
    docs: {
      description: {
        component: 'The shared confirmation pattern for removing or retiring consequential data.',
      },
    },
  },
} satisfies Meta<typeof DestructiveActionDialog>

export default meta
type Story = StoryObj<typeof meta>

function InteractiveDialog() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Zimmer entfernen
      </Button>
      <DestructiveActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Zimmer 101 entfernen?"
        description="Das Zimmer kann nur entfernt werden, wenn es keine Betten mehr enthält."
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

export const Default: Story = {
  render: () => <InteractiveDialog />,
}
