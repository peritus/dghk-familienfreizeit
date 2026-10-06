import { useState, type FormEvent } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ExternalLeaderEditorForm,
  SlotEditorForm,
  SpaceEditorForm,
  WorkshopConfirmationDialog,
  WorkshopEditorDialog,
  WorkshopEditorForm,
  WorkshopLeaderPicker,
} from './editors.js'

const meta = {
  title: 'Application/Organiser/Workshop/Editors',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function ConfirmationExample() {
  const [open, setOpen] = useState(false)
  return (
    <div className="grid gap-4">
      <button className="underline" type="button" onClick={() => setOpen(true)}>
        Dialog öffnen
      </button>
      <WorkshopConfirmationDialog
        open={open}
        on_open_change={setOpen}
        title="Eingaben verwerfen?"
        description="Die Eingaben in diesem Formular gehen verloren."
        confirm_label="Verwerfen"
        on_confirm={() => setOpen(false)}
      />
    </div>
  )
}

export const Forms: Story = {
  render: () => {
    const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault()
    return (
      <div className="grid gap-6">
        <WorkshopEditorForm
          on_submit={preventSubmit}
          default_values={{
            title: 'Waldentdecker',
            description: 'Draußen Spuren lesen und Pflanzen entdecken.',
            audience: 'children',
            capacity: 12,
            participation_mode: 'assigned',
            age_min: 7,
            age_max: 12,
            needs: 'Außenbereich, Erste Hilfe',
          }}
        />
        <WorkshopLeaderPicker
          leaders={[
            { id: 'internal-1', label: 'Mara Schmidt' },
            { id: 'external-1', label: 'Nina Baum', external: true },
          ]}
          selected_ids={['external-1']}
        />
        <ExternalLeaderEditorForm
          on_submit={preventSubmit}
          default_values={{
            name: 'Nina Baum',
            phone: '+49 170 123456',
            availability: ['Freitag 14:00–15:30'],
          }}
          slots={[{ value: 'Freitag 14:00–15:30', label: 'Freitag 14:00–15:30 Uhr' }]}
        />
        <SlotEditorForm
          on_submit={preventSubmit}
          default_values={{
            day: 'Freitag',
            starts_at: '2026-07-17T14:00',
            duration_minutes: 90,
          }}
        />
        <SpaceEditorForm
          on_submit={preventSubmit}
          default_values={{
            name: 'Werkraum',
            location: 'Haus 2',
            capacity: 14,
            availability_start: '2026-07-17T08:00',
            availability_end: '2026-07-19T18:00',
            default_capabilities: ['indoor', 'water'],
          }}
        />
      </div>
    )
  },
}

export const Confirmation: Story = {
  render: () => <ConfirmationExample />,
}

export const EditorDialog: Story = {
  render: () => {
    const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault()
    return (
      <WorkshopEditorDialog
        open
        on_open_change={() => undefined}
        on_submit={preventSubmit}
        default_values={{
          title: 'Waldentdecker',
          description: 'Draußen Spuren lesen und Pflanzen entdecken.',
          audience: 'children',
          capacity: 12,
          participation_mode: 'assigned',
          age_min: 7,
          age_max: 12,
          needs: 'Außenbereich, Erste Hilfe',
        }}
      >
        <WorkshopLeaderPicker
          leaders={[
            { id: 'internal-1', label: 'Mara Schmidt' },
            { id: 'external-1', label: 'Nina Baum', external: true },
          ]}
          selected_ids={['external-1']}
        />
      </WorkshopEditorDialog>
    )
  },
}
