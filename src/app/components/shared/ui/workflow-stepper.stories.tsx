import type { Meta, StoryObj } from '@storybook/react-vite'
import { WorkflowStepper } from './workflow-stepper.js'

const meta = {
  title: 'Shared/Primitives/WorkflowStepper',
  component: WorkflowStepper,
  args: {
    aria_label: 'Ablauf der Vorbereitung',
    steps: [
      { id: 'create', label: 'Vorbereiten', state: 'complete' },
      { id: 'open', label: 'Prüfen', state: 'current' },
      { id: 'review', label: 'Bestätigen', state: 'upcoming' },
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

export const WorkshopChoice: Story = { name: 'Example: Workshops', args: { aria_label: 'Ablauf der Workshopwahl', steps: [{ id: 'create', label: 'Workshops anlegen', state: 'complete' }, { id: 'open', label: 'Wahl öffnen', state: 'current' }, { id: 'review', label: 'Zuordnung prüfen', state: 'upcoming' }, { id: 'fixed', label: 'Festgelegt', state: 'upcoming' }] } }

export const Accommodation: Story = {
  name: 'Example: Unterbringung',
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

export const States: Story = {
  render: () => <div className="space-y-6 bg-background p-4">
    {[0, 1, 2].flatMap((current) => [false, true].map((expanded) =>
      <WorkflowStepper key={`${current}-${expanded}`} aria_label="Ablauf der Vorbereitung" expanded={expanded}
        steps={['Vorbereiten', 'Prüfen', 'Abgeschlossen'].map((label, index) => ({
          id: String(index), label, description: index === current ? 'Aktueller Stand' : 'Kurze Erklärung',
          state: current === 2 ? 'complete' : index < current ? 'complete' : index === current ? 'current' : 'upcoming',
        }))}
        panel={{ text: current === 2 ? 'Der Vorgang ist abgeschlossen.' : 'Prüfe die Angaben im Hauptbereich.', note: 'Die Ansicht zeigt den aktuellen Stand.' }} />,
    ))}
  </div>,
}
export const Print: Story = { ...States, parameters: { layout: 'fullscreen' } }
