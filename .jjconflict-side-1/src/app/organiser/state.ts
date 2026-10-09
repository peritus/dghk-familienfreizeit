import type { AttentionItem } from '../../attention/types.js'
import { deriveDraftWorld } from '../../events/world.js'
import type { KernelConfig } from '../../events/fold.js'
import type { Event, EventDraft } from '../../events/types.js'
import type { FeatureOverride } from '../../derive/features.js'

export type DraftBatch = {
  id?: string
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
  | 'load_error'
  | 'error'

export type OrganiserState = {
  next_group_id?: number
  submitted_groups?: readonly string[]
  attention_errors?: readonly AttentionItem[]
  /** Browser-session UI metadata; absent until this session successfully saves. */
  last_saved_at?: string
  committed: readonly Event[]
  drafts: readonly DraftBatch[]
  change_mode: OrganiserChangeMode
  head_seq: number
  build_revision: string | null
  compatibility_revision: number | null
  /** The Worker's operational feature bindings this view derives with (features.md §6). */
  feature_overrides: readonly FeatureOverride[]
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
  feature_overrides: [],
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
      feature_overrides: readonly FeatureOverride[]
      principal_email: string
    }
  | { type: 'stage'; events: readonly EventDraft[] }
  | { type: 'discard-group'; group_id: string }
  | { type: 'replace-group'; group_id: string; events: readonly EventDraft[] }
  | { type: 'toggle_drafting' }
  | { type: 'discard' }
  | { type: 'applying' }
  | { type: 'applied'; count: number; events: readonly Event[]; saved_at?: string }
  | { type: 'rebased'; events: readonly Event[] }
  | {
      type: 'failed'
      status: Exclude<OrganiserStatus, 'loading' | 'ready' | 'applying'>
      error: string
      findings?: readonly AttentionItem[]
    }

export function organiserReducer(state: OrganiserState, action: OrganiserAction): OrganiserState {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        committed: action.events,
        last_saved_at: undefined,
        drafts: [],
        change_mode: 'immediate',
        head_seq: action.events.length,
        build_revision: action.build_revision,
        compatibility_revision: action.compatibility_revision,
        feature_overrides: action.feature_overrides,
        principal_email: action.principal_email,
        status: 'ready',
        error: null,
      }
    case 'stage':
      return { ...state, next_group_id:(state.next_group_id??1)+1, drafts: [...state.drafts, { id:`group-${state.next_group_id??1}`, events: action.events }], error: null, attention_errors:[] }
    case 'discard-group':
    case 'replace-group': {
      if(state.submitted_groups?.includes(action.group_id))return state
      const drafts=state.drafts.flatMap(group=>group.id!==action.group_id?[group]:action.type==='replace-group'?[{...group,events:action.events}]:[])
      return {...state,drafts,change_mode:drafts.length?'drafting':'immediate',error:null,attention_errors:[]}
    }
    case 'toggle_drafting':
      if (state.change_mode === 'drafting') {
        return draftCount(state) === 0 ? { ...state, change_mode: 'immediate' } : state
      }
      return { ...state, change_mode: 'drafting' }
    case 'discard':
      return state.status==='applying' ? state : { ...state, drafts: [], change_mode: 'immediate', error: null, attention_errors:[] }
    case 'applying':
      return { ...state, status: 'applying', error: null, submitted_groups:state.drafts.flatMap(g=>g.id?[g.id]:[]) }
    case 'applied': {
      const drafts = removeDraftEvents(state.drafts, action.count)
      return {
        ...state,
        committed: [...state.committed, ...action.events],
        last_saved_at: action.saved_at ?? state.last_saved_at,
        drafts,
        change_mode: drafts.length === 0 ? 'immediate' : 'drafting',
        head_seq: state.head_seq + action.events.length,
        status: 'ready',
        error: null,
        submitted_groups:[],
        attention_errors:[],
      }
    }
    case 'rebased':
      return {
        ...state,
        committed: [...state.committed, ...action.events],
        head_seq: state.head_seq + action.events.length,
        change_mode: 'drafting',
        status: 'stale_head',
        error: 'Die gemeinsamen Daten haben sich geändert. Prüfe Deine Änderungsentwürfe.',
      }
    case 'failed':
      return {
        ...state,
        change_mode: 'drafting',
        status: action.status,
        submitted_groups:[],
        attention_errors:action.findings??[],
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

export function deriveWorld(state: OrganiserState, config: KernelConfig = {}) {
  return deriveDraftWorld(state.committed, materializeDraftEvents(state), config)
}

export function draftCount(state: OrganiserState): number {
  return state.drafts.reduce((count, action) => count + action.events.length, 0)
}

export type SaveStatusView =
  | { kind: 'saved' }
  | { kind: 'saving' }
  | { kind: 'draft-empty' }
  | { kind: 'draft-pending'; count: number }
  | { kind: 'failed' }

/**
 * The save-status button has no reachable "offline" look yet: nothing in
 * `OrganiserStatus` currently detects a lost connection. `unauthorized`,
 * `stale_build`, and `load_error` never reach this view either — OrganiserApp
 * short-circuits to a plain alert for those before the frame (and this
 * button) mounts. `error` here means an apply/save failure specifically, so
 * "failed" only ever reflects a save problem, never a load problem.
 */
export function saveStatusView(state: OrganiserState): SaveStatusView {
  if (state.status === 'applying') return {kind:'saving'}
  if (draftCount(state)>0 && state.change_mode==='immediate')return {kind:'draft-pending',count:draftCount(state)}
  if (state.status === 'error' || state.status === 'stale_head') return { kind: 'failed' }
  if (state.change_mode === 'drafting') {
    const count = draftCount(state)
    return count > 0 ? { kind: 'draft-pending', count } : { kind: 'draft-empty' }
  }
  return { kind: 'saved' }
}

function removeDraftEvents(drafts: readonly DraftBatch[], count: number): readonly DraftBatch[] {
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
    result.push({ ...action, events: action.events.slice(remaining) })
    remaining = 0
  }
  return result
}
