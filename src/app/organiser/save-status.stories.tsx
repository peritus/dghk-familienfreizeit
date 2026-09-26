import type { Meta, StoryObj } from '@storybook/react-vite'
import { SaveStatus } from './save-status.js'
import {
  FixtureProvider,
  stateWithDrafts,
  organiserPendingDraft,
} from '../stories/organiser-fixtures.js'

const meta = {
  title: 'Application/Save status',
  component: SaveStatus,
  parameters: {
    docs: {
      description: {
        component:
          'Save status communicates whether the event log is saved, whether drafting is empty, or how many changes are waiting to apply. It never relies on color alone.',
      },
    },
  },
} satisfies Meta<typeof SaveStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Saved: Story = {
  render: () => (
    <FixtureProvider>
      <SaveStatus />
    </FixtureProvider>
  ),
}

export const DraftingEmpty: Story = {
  render: () => (
    <FixtureProvider initialState={stateWithDrafts()}>
      <SaveStatus />
    </FixtureProvider>
  ),
}

export const DraftingPending: Story = {
  render: () => (
    <FixtureProvider initialState={stateWithDrafts([organiserPendingDraft])}>
      <SaveStatus />
    </FixtureProvider>
  ),
}

export const Failed: Story = {
  render: () => (
    <FixtureProvider
      initialState={{
        ...stateWithDrafts([organiserPendingDraft]),
        status: 'error',
        error: 'Speichern fehlgeschlagen.',
      }}
    >
      <SaveStatus />
    </FixtureProvider>
  ),
}
