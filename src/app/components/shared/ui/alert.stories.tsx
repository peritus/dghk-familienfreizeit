import type { Meta, StoryObj } from '@storybook/react-vite'
import { Alert, AlertDescription, AlertTitle } from './alert'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          'Use Alert for important status or recovery information. Include direct text; color alone must never carry the meaning.',
      },
    },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Informational: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Alles gespeichert</AlertTitle>
      <AlertDescription>Die Änderung ist für das ganze Team sichtbar.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>Speichern fehlgeschlagen</AlertTitle>
      <AlertDescription>Prüfe die Verbindung und versuche es erneut.</AlertDescription>
    </Alert>
  ),
}
