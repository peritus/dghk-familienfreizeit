import { derivePending, type KernelConfig } from '../../events/world.js'
import type { EventDraft } from '../../events/store.js'
import type { Event } from '../../events/types.js'

export type PendingAction = {
  events: readonly EventDraft[]
}

export type OrganiserStatus =
  | 'loading'
  | 'ready'
  | 'applying'
  | 'stale_head'
  | 'stale_build'
  | 'unauthorized'
  | 'error'

export type OrganiserState = {
  committed: readonly Event[]
  pending: readonly PendingAction[]
  head_seq: number
  build_revision: string | null
  compatibility_revision: number | null
  principal_email: string | null
  status: OrganiserStatus
  error: string | null
}

export const initialOrganiserState: OrganiserState = {
  committed: [],
  pending: [],
  head_seq: 0,
  build_revision: null,
  compatibility_revision: null,
  principal_email: null,
  status: 'loading',
  error: null,
}

export type OrganiserAction =
  | {
      type: 'loaded'
      events: readonly Event[]
      build_revision: string
      compatibility_revision: number
      principal_email: string
    }
  | { type: 'stage'; events: readonly EventDraft[] }
  | { type: 'undo' }
  | { type: 'discard' }
  | { type: 'applying' }
  | { type: 'applied'; events: readonly Event[] }
  | { type: 'rebased'; events: readonly Event[] }
  | { type: 'failed'; status: Exclude<OrganiserStatus, 'loading' | 'ready' | 'applying'>; error: string }

export function organiserReducer(
  state: OrganiserState,
  action: OrganiserAction,
): OrganiserState {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        committed: action.events,
        pending: [],
        head_seq: action.events.length,
        build_revision: action.build_revision,
        compatibility_revision: action.compatibility_revision,
        principal_email: action.principal_email,
        status: 'ready',
        error: null,
      }
    case 'stage':
      return { ...state, pending: [...state.pending, { events: action.events }], error: null }
    case 'undo':
      return { ...state, pending: state.pending.slice(0, -1), error: null }
    case 'discard':
      return { ...state, pending: [], error: null }
    case 'applying':
      return { ...state, status: 'applying', error: null }
    case 'applied':
      return {
        ...state,
        committed: [...state.committed, ...action.events],
        pending: [],
        head_seq: state.head_seq + action.events.length,
        status: 'ready',
        error: null,
      }
    case 'rebased':
      return {
        ...state,
        committed: [...state.committed, ...action.events],
        head_seq: state.head_seq + action.events.length,
        status: 'stale_head',
        error: 'Der Ereignisstand hat sich geändert. Prüfe Deine offenen Änderungen.',
      }
    case 'failed':
      return { ...state, status: action.status, error: action.error }
  }
}

export function materializePendingEvents(state: OrganiserState): Event[] {
  return state.pending.flatMap((action) => action.events).map((event, index) => ({
    ...event,
    seq: state.head_seq + index + 1,
  }))
}

export function deriveOrganiserWorld(state: OrganiserState, config: KernelConfig = {}) {
  return derivePending(state.committed, materializePendingEvents(state), config)
}

export function pendingEventCount(state: OrganiserState): number {
  return state.pending.reduce((count, action) => count + action.events.length, 0)
}
