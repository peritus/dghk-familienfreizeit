import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './alert-dialog'

const meta = {
  title: 'UI/AlertDialog',
  parameters: {
    docs: {
      description: {
        component: 'Use AlertDialog before destructive or consequential actions. Explain the consequence and keep the safe action available.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const DestructiveConfirmation: Story = {
  render: () => (
    <div className="bg-background p-6">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="danger" />}>Zimmer entfernen</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zimmer 101 entfernen?</AlertDialogTitle>
            <AlertDialogDescription>Das Zimmer ist leer. Diese Änderung kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Behalten</AlertDialogCancel>
            <AlertDialogAction>Ja, entfernen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
}
