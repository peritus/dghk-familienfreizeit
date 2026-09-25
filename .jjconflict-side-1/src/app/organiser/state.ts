import { deriveDraftWorld } from '../../events/world.js'
import type { KernelConfig } from '../../events/fold.js'
import type { Event, EventDraft } from '../../events/types.js'

export type DraftBatch = {
  events: readonly EventDraft[]
}

export type OrganiserChangeMode = 'immediate' | 'drafting'

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
  drafts: readonly DraftBatch[]
  change_mode: OrganiserChangeMode
  head_seq: number
  build_revision: string | null
  compatibility_revision: number | null
  principal_email: string | null
  status: OrganiserStatus
  error: string | null
}

export const initialOrganiserState: OrganiserState = {
  committed: [],
  drafts: [],
  change_mode: 'immediate',
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
  | { type: 'toggle_drafting' }
  | { type: 'discard' }
  | { type: 'applying' }
  | { type: 'applied'; count: number; events: readonly Event[] }
  | { type: 'rebased'; events: readonly Event[] }
  | {
      type: 'failed'
      status: Exclude<OrganiserStatus, 'loading' | 'ready' | 'applying'>
      error: string
    }

export function organiserReducer(state: OrganiserState, action: OrganiserAction): OrganiserState {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        committed: action.events,
        drafts: [],
        change_mode: 'immediate',
        head_seq: action.events.length,
        build_revision: action.build_revision,
        compatibility_revision: action.compatibility_revision,
        principal_email: action.principal_email,
        status: 'ready',
        error: null,
      }
    case 'stage':
      return { ...state, drafts: [...state.drafts, { events: action.events }], error: null }
    case 'toggle_drafting':
      if (state.change_mode === 'drafting') {
        return draftCount(state) === 0 ? { ...state, change_mode: 'immediate' } : state
      }
      return { ...state, change_mode: 'drafting' }
    case 'discard':
      return { ...state, drafts: [], change_mode: 'immediate', error: null }
    case 'applying':
      return { ...state, status: 'applying', error: null }
    case 'applied': {
      const drafts = removeDraftEvents(state.drafts, action.count)
      return {
        ...state,
        committed: [...state.committed, ...action.events],
        drafts,
        change_mode: drafts.length === 0 ? 'immediate' : 'drafting',
        head_seq: state.head_seq + action.events.length,
        status: 'ready',
        error: null,
      }
    }
    case 'rebased':
      return {
        ...state,
        committed: [...state.committed, ...action.events],
        head_seq: state.head_seq + action.events.length,
        change_mode: 'drafting',
        status: 'stale_head',
        error: 'Der Ereignisstand hat sich geändert. Prüfe Deine Änderungsentwürfe.',
      }
    case 'failed':
      return {
        ...state,
        change_mode: 'drafting',
        status: action.status,
        error: action.error,
      }
  }
}

export function materializeDraftEvents(state: OrganiserState): Event[] {
  return state.drafts
    .flatMap((action) => action.events)
    .map((event, index) => ({
      ...event,
      seq: state.head_seq + index + 1,
    }))
}

export function deriveOrganiserWorld(state: OrganiserState, config: KernelConfig = {}) {
  return deriveDraftWorld(state.committed, materializeDraftEvents(state), config)
}

export function draftCount(state: OrganiserState): number {
  return state.drafts.reduce((count, action) => count + action.events.length, 0)
}

function removeDraftEvents(
  drafts: readonly DraftBatch[],
  count: number,
): readonly DraftBatch[] {
  let remaining = count
  const result: DraftBatch[] = []
  for (const action of drafts) {
    if (remaining <= 0) {
      result.push(action)
      continue
    }
    if (action.events.length <= remaining) {
      remaining -= action.events.length
      continue
    }
    result.push({ events: action.events.slice(remaining) })
    remaining = 0
  }
  return result
}
