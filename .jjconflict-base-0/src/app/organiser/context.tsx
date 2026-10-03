import { createContext, useContext, type Dispatch } from 'react'
import type { World } from '../../events/fold.js'
import type { EventDraft } from '../../events/types.js'
import type { OrganiserAction, OrganiserState } from './state.js'
import type { Plan } from '../../solver/types.js'

export type OrganiserContextValue = {
  state: OrganiserState
  world: World | null
  dispatch: Dispatch<OrganiserAction>
  stage: (events: readonly EventDraft[]) => void
  apply: () => Promise<void>
  previous_plan?: Plan | null
  current_plan?: Plan | null
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
