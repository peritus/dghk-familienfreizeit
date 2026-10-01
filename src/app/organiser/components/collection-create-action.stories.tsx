import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CollectionCreateAction } from './collection-create-action.js'

const meta = {
  title: 'Application/Organiser/Collection create action',
  component: CollectionCreateAction,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof CollectionCreateAction>

export default meta
type Story = StoryObj

function Example({ error }: { error?: string }) {
  const [open, setOpen] = useState(true)
  return (
    <CollectionCreateAction
      label="Workshop hinzufügen"
      title="Workshop hinzufügen"
      description="Lege Titel, Zielgruppe und Leitung fest."
      submit_label="Workshop anlegen"
      open={open}
      on_open_change={setOpen}
      on_submit={(event) => event.preventDefault()}
      error={error}
    >
      <label className="grid gap-1">
        <span className="font-bold">Titel</span>
        <input required className="min-h-11 rounded-base border-2 border-black px-3" />
      </label>
    </CollectionCreateAction>
  )
}

export const Default: Story = { render: () => <Example /> }

export const ValidationError: Story = { render: () => <Example error="Gib einen Titel an." /> }
