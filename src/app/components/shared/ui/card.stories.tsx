import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

const meta = {
  title: 'Shared/Primitives/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          'Use Card to group information that belongs together. Cards may contain a clear heading, supporting description, action, content, and footer; do not use them to hide primary page structure.',
      },
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Complete: Story = {
  render: () => (
    <div className="bg-background p-6">
      <Card className="mx-auto max-w-xl bg-white">
        <CardHeader>
          <CardTitle>Familie Weber</CardTitle>
          <CardDescription>Vier Personen · noch nicht veröffentlicht</CardDescription>
          <CardAction>
            <Button size="sm" variant="neutral">
              Öffnen
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Die Familie hat zwei Zimmerwünsche angegeben.</p>
        </CardContent>
        <CardFooter className="border-t-2 border-black">
          <span className="text-sm text-muted">Zuletzt geändert heute</span>
        </CardFooter>
      </Card>
    </div>
  ),
}

export const Compact: Story = {
  render: () => (
    <Card size="sm" className="max-w-sm bg-white p-4">
      <CardTitle>Kleine Zusammenfassung</CardTitle>
      <CardContent className="px-0 pt-3">Weniger Abstand für dichte Übersichten.</CardContent>
    </Card>
  ),
}
