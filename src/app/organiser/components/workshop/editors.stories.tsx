import { useState, type FormEvent } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ExternalLeaderEditorForm,
  SlotEditorForm,
  SpaceEditorForm,
  WorkshopConfirmationDialog,
  WorkshopEditorForm,
} from './editors.js'

const meta = {
  title: 'Components/Organiser/Workshop/Editors',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function ConfirmationExample() {
  const [open, setOpen] = useState(true)
  return (
    <div className="grid gap-4">
      <button className="underline" type="button" onClick={() => setOpen(true)}>
        Dialog öffnen
      </button>
      <WorkshopConfirmationDialog
        open={open}
        on_open_change={setOpen}
        title="Wahlphase schließen?"
        description="Danach werden keine neuen Antworten mehr angenommen."
        confirm_label="Wahlphase schließen"
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
        <ExternalLeaderEditorForm
          on_submit={preventSubmit}
          default_values={{
            name: 'Nina Baum',
            email: 'nina@example.test',
            phone: '+49 170 123456',
          }}
        />
        <SlotEditorForm
          on_submit={preventSubmit}
          default_values={{ day: 'Freitag', starts_at: '14:00', ends_at: '15:30', capacity: 12 }}
        />
        <SpaceEditorForm
          on_submit={preventSubmit}
          default_values={{
            name: 'Werkraum',
            capacity: 14,
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
