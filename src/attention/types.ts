import type { OccasionProfile, LocalizedText } from '../config/define.js'
import type { World } from '../events/fold.js'
import type { JsonValue } from '../events/types.js'
import type { Plan } from '../solver/types.js'

export type AttentionArea = 'accommodation' | 'workshops' | 'core' | 'operations'
export type AttentionScope = 'dashboard' | 'family' | 'workshop' | 'programme' | 'allocation' | 'accommodation' | 'closing' | 'print' | 'operation'
export type AttentionSubject = { kind: string; id: string; available: boolean }
export type AttentionSource =
  | { kind: 'label'; entity_id: string; key: string; value: JsonValue; seq: number }
  | { kind: 'resolver'; code: string }
  | { kind: 'stage'; stage: string }
  | { kind: 'field'; field: string; group_id: string | null }
  | { kind: 'operation'; id: string }
  | { kind: 'closing'; area: string; seq: number }
export type AttentionAction =
  | { kind: 'navigate'; destination: 'family' | 'workshop' | 'programme' | 'allocation' | 'accommodation'; entity_id: string | null }
  | { kind: 'clear-label'; entity_id: string; key: string; value: JsonValue; seq: number }
  | { kind: 'retry' | 'reload' | 'login' }
  | { kind: 'review-group'; group_id: string }
export type AttentionOperation = 'append' | 'close-accommodation' | 'close-workshops' | 'capacity-reduction'
export type AttentionFact = {
  key: readonly JsonValue[]
  subjects: readonly AttentionSubject[]
  evidence: Readonly<Record<string, JsonValue>>
  sources?: readonly AttentionSource[]
  severity?: 'error' | 'warning' | 'info'
  blocks?: readonly AttentionOperation[]
  acknowledge?: boolean
  actions?: readonly AttentionAction[]
}
export type AttentionCheck = {
  code: string
  owner: string
  areas: readonly AttentionArea[]
  scopes: readonly AttentionScope[]
  kind: 'problem' | 'review' | 'information' | 'status'
  severity: 'error' | 'warning' | 'info'
  requires: readonly ('world' | 'plan')[]
  title: LocalizedText
  detail: (fact: AttentionFact) => LocalizedText
  collect: (context: AttentionContext) => readonly AttentionFact[] | 'not-applicable'
}
export type AttentionContext = {
  domain: 'available' | 'loading' | 'failed' | 'invalid-proposal'
  world: World | null
  plan: Plan | null
  profile: OccasionProfile
  build_revision: string
  locale: string
  now: string
  audience: 'organiser' | 'family' | 'shared'
  effective_features?: ReadonlySet<string>
  basis?: { mode: 'committed' | 'prospective'; group_ids: readonly string[] }
  capacity_rejections?: readonly {workshop_id:string;capacity:number;attendance:number;attendance_changed:boolean}[]
  rejected_findings?: readonly AttentionItem[]
  operations?: readonly { id: string; code: 'loading' | 'saving' | 'drafts' | 'saved' | 'load-failed' | 'unauthorized' | 'stale-head' | 'stale-build' | 'apply-failed' | 'invalid-field' | 'confidential' | 'prospective' | 'route-failed'; field?: string; group_id?: string }[]
  closed_changes?: readonly { area: 'accommodation' | 'workshops'; seq: number; changes: readonly JsonValue[]; family_ids: readonly string[]; closed: boolean }[]
}
export type AttentionItem = {
  id: string
  code: string
  owner: string
  kind: AttentionCheck['kind']
  severity: AttentionCheck['severity']
  subjects: readonly AttentionSubject[]
  evidence: Readonly<Record<string, JsonValue>>
  source_refs: readonly AttentionSource[]
  basis: { head_seq: number | null; build_revision: string; mode: 'committed' | 'prospective'; group_ids: readonly string[] }
  wording: { title: string; detail: string; reasons: readonly string[] }
  areas: readonly AttentionArea[]
  display_scopes: readonly AttentionScope[]
  blocks: readonly AttentionOperation[]
  acknowledgement: { fingerprint: string } | null
  actions: readonly AttentionAction[]
}
export type AttentionResult = {
  items: readonly AttentionItem[]
  coverage: readonly { code: string; owner: string; state: 'evaluated' | 'not-applicable' | 'unavailable' }[]
}
