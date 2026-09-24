import { createContext, useContext, type Dispatch } from 'react'
import type { KernelWorld } from '../../events/fold.js'
import type { EventDraft } from '../../events/types.js'
import type { OrganiserAction, OrganiserState } from './state.js'

export type OrganiserContextValue = {
  state: OrganiserState
  world: KernelWorld | null
  dispatch: Dispatch<OrganiserAction>
  stage: (events: readonly EventDraft[]) => void
  apply: () => Promise<void>
}

export const OrganiserContext = createContext<OrganiserContextValue | null>(null)

export function useOrganiser(): OrganiserContextValue {
  const value = useContext(OrganiserContext)
  if (!value) throw new Error('useOrganiser must be used inside OrganiserContext')
  return value
}

export function stageEvent(
  stage: (events: readonly EventDraft[]) => void,
  event: EventDraft,
): void {
  stage([event])
}
