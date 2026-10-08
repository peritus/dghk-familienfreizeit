import { createContext, useContext, type Dispatch } from 'react'
import type { World } from '../../events/fold.js'
import type { EventDraft } from '../../events/types.js'
import type { OrganiserAction, OrganiserState } from './state.js'
import type { Plan } from '../../solver/types.js'
import type { PhaseView } from '../../derive/phases.js'

export type OrganiserContextValue = {
  state: OrganiserState
  world: World | null
  dispatch: Dispatch<OrganiserAction>
  stage: (events: readonly EventDraft[]) => void
  apply: () => Promise<void>
  current_plan?: Plan | null
  /** Effective organiser features (spec/architecture/features.md §4); absent means all built. */
  effective_features?: ReadonlySet<string>
  /** The derived phase view at browser time (spec/architecture/phases.md §3). */
  phases?: readonly PhaseView[]
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
