import type { Meta, StoryObj } from '@storybook/react-vite'
import { WorkflowStepper } from './workflow-stepper.js'

const meta = {
  title: 'Shared/Primitives/WorkflowStepper',
  component: WorkflowStepper,
  args: {
    aria_label: 'Ablauf der Workshopwahl',
    steps: [
      { id: 'create', label: 'Workshops anlegen', state: 'complete' },
      { id: 'open', label: 'Wahl öffnen', state: 'current' },
      { id: 'review', label: 'Zuordnung prüfen', state: 'upcoming' },
      { id: 'fixed', label: 'Festgelegt', state: 'upcoming' },
    ],
  },
  parameters: {
    docs: {
      description: {
        component:
          'Use WorkflowStepper to report progress through a short ordered workflow. It is not navigation and does not own workflow state.',
      },
    },
  },
} satisfies Meta<typeof WorkflowStepper>

export default meta
type Story = StoryObj<typeof meta>

export const WorkshopChoice: Story = {}

export const Accommodation: Story = {
  args: {
    aria_label: 'Ablauf der Unterbringung',
    steps: [
      {
        id: 'inventory',
        label: 'Unterkunft anlegen',
        description: 'Gebäude, Zimmer und Schlafplätze erfassen',
        state: 'complete',
      },
      {
        id: 'review',
        label: 'Belegung prüfen',
        description: 'Bedarf und passende Zimmer kontrollieren',
        state: 'current',
      },
      { id: 'fixed', label: 'Festgelegt', description: 'Plan kommunizieren', state: 'upcoming' },
    ],
  },
}
