import { createContext, useContext, type Dispatch } from 'react'
import type { KernelWorld } from '../../events/fold.js'
import type { EventDraft } from '../../events/store.js'
import type { OrganiserAction, OrganiserState } from './state.js'

export type OrganiserContextValue = {
  state: OrganiserState
  world: KernelWorld | null
  dispatch: Dispatch<OrganiserAction>
  apply: () => Promise<void>
}

export const OrganiserContext = createContext<OrganiserContextValue | null>(null)

export function useOrganiser(): OrganiserContextValue {
  const value = useContext(OrganiserContext)
  if (!value) throw new Error('useOrganiser must be used inside OrganiserContext')
  return value
}

export function stageEvent(
  dispatch: Dispatch<OrganiserAction>,
  event: EventDraft,
): void {
  dispatch({ type: 'stage', events: [event] })
}
