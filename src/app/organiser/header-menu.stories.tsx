import type { Meta, StoryObj } from '@storybook/react-vite'
import { useReducer } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { activeProfile } from '../../config/index.js'
import { luebben2027Branding } from '../../config/profiles/luebben-2027/branding.js'
import { OrganiserContext } from './context.js'
import { OrganiserFrame } from './organiser-frame.js'
import {
  organiserReducer,
  draftCount,
  materializeDraftEvents,
  type OrganiserState,
} from './state.js'
import {
  organiserFixtureState,
  organiserPendingDraft,
  stateWithDrafts,
} from '../stories/organiser-fixtures.js'
import { Button } from '../components/shared/ui/button.js'

const meta = {
  title: 'Application/Organiser/Header menu',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Below 48rem the persistent organiser frame combines save status and logout in one status pill. It composes the canonical modal dialog and shares the existing organiser state and save actions.',
      },
    },
  },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

type Kind = 'saved' | 'saving' | 'pending' | 'empty' | 'error'

function stateFor(kind: Kind): OrganiserState {
  const state =
    kind === 'pending' || kind === 'error'
      ? stateWithDrafts([organiserPendingDraft, organiserPendingDraft, organiserPendingDraft])
      : kind === 'empty'
        ? stateWithDrafts()
        : organiserFixtureState
  return {
    ...state,
    change_mode:
      kind === 'pending' || kind === 'empty' || kind === 'error' ? 'drafting' : 'immediate',
    last_saved_at: '2027-01-15T09:30:00.000Z',
    status: kind === 'saving' ? 'applying' : kind === 'error' ? 'error' : 'ready',
    error: kind === 'error' ? 'Die Änderungen konnten nicht gespeichert werden.' : null,
  }
}

function HeaderFixture({ kind, interactive = false }: { kind: Kind; interactive?: boolean }) {
  const [state, dispatch] = useReducer(organiserReducer, stateFor(kind))
  return (
    <OrganiserContext.Provider
      value={{
        state,
        dispatch,
        world: null,
        stage: (events) => dispatch({ type: 'stage', events }),
        apply: async () => {
          dispatch({
            type: 'applied',
            count: draftCount(state),
            events: materializeDraftEvents(state),
            saved_at: '2027-01-15T09:35:00.000Z',
          })
        },
      }}
    >
      <OrganiserFrame
        profile={{ meta: activeProfile.meta, branding: luebben2027Branding }}
        print_generated_at={new Date('2027-01-15T12:00:00Z')}
      >
        <h1 className="text-h1">Kurse</h1>
        {interactive ? (
          <Button onClick={() => dispatch({ type: 'stage', events: [organiserPendingDraft] })}>
            Beispieländerung
          </Button>
        ) : (
          <p className="mt-2 text-body text-muted">Kurse anlegen und bearbeiten.</p>
        )}
      </OrganiserFrame>
    </OrganiserContext.Provider>
  )
}

function closed(kind: Kind): Story {
  return { render: () => <HeaderFixture kind={kind} /> }
}

function opened(kind: Kind): Story {
  return {
    ...closed(kind),
    play: async ({ canvasElement }) => {
      await userEvent.click(
        within(canvasElement).getByRole('button', { name: /^Menü \(Speichern, Abmelden\)/ }),
      )
      await expect(
        within(canvasElement.ownerDocument.body).getByRole('dialog', { name: 'Menü' }),
      ).toBeVisible()
    },
  }
}
export const Saved390 = closed('saved')

export const Saved640 = closed('saved')

export const Saving390 = closed('saving')

export const Saving640 = closed('saving')

export const Pending390 = closed('pending')

export const Pending640 = closed('pending')

export const Empty390 = closed('empty')

export const Empty640 = closed('empty')

export const Error390 = closed('error')

export const Error640 = closed('error')

export const SheetAutomatic = opened('saved')

export const SheetPending = opened('pending')

export const SheetEmpty = opened('empty')

export const SheetError = opened('error')

export const PopoverAutomatic = opened('saved')

export const PopoverPending = opened('pending')

export const PopoverEmpty = opened('empty')

export const PopoverError = opened('error')

export const Interaction: Story = {
  render: () => <HeaderFixture kind="saved" interactive />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole('button', { name: /^Menü \(Speichern, Abmelden\)/ }))
    await userEvent.click(body.getByRole('radio', { name: /^Entwurfsmodus/ }))
    await userEvent.keyboard('{Escape}')
    await expect(
      canvas.getByRole('button', { name: /^Menü \(Speichern, Abmelden\)/ }),
    ).toHaveFocus()
    await userEvent.click(canvas.getByRole('button', { name: 'Beispieländerung' }))
    const trigger = canvas.getByRole('button', { name: /^Menü \(Speichern, Abmelden\)/ })
    await userEvent.click(trigger)
    await userEvent.click(body.getByRole('button', { name: '1 Änderung speichern' }))
    await expect(body.getByRole('radio', { name: /^Automatisch speichern/ })).toBeChecked()
    await userEvent.keyboard('{Escape}')
    await expect(canvas.getByRole('button', { name: /alles gespeichert/ })).toHaveFocus()
  },
}
