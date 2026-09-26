export type StatusTone = 'neutral' | 'success' | 'attention' | 'danger' | 'draft' | 'held'

export type StatusLabel = {
  label: string
  tone: StatusTone
}

export type PersonView = {
  id: string
  name: string
  role: 'adult' | 'child'
}

export type FamilyView = {
  id: string
  name: string
  people: readonly PersonView[]
  requirements: readonly string[]
  status?: StatusLabel
}

export type RoomView = {
  id: string
  name: string
  building: string
  floor: string
  capacity: number
  occupied: number
  occupants: readonly FamilyView[]
  capabilities: readonly string[]
  state: 'available' | 'occupied' | 'infeasible'
  reasons?: readonly string[]
  soft_notes?: readonly string[]
}

export type BuildingView = {
  id: string
  name: string
  rooms: readonly RoomView[]
}

export type FindingView = {
  id: string
  severity: 'error' | 'warning' | 'info'
  title: string
  description: string
  subjects: readonly string[]
  action?: string
}

export type TraceView = {
  step: string
  subject: string
  text: string
  score?: number
  terms?: readonly { label: string; value: number }[]
  rejected?: readonly { room: string; reason: string }[]
}

export type DraftChangeView = {
  id: string
  summary: string
  detail: string
}

export type BoardView = {
  sequence: number
  buildings: readonly BuildingView[]
  unplaced: readonly FamilyView[]
  unplaced_reasons: Readonly<Record<string, string>>
  traces: Readonly<Record<string, readonly TraceView[]>>
  draft_changes: readonly DraftChangeView[]
}

export type DecisionView = {
  id: string
  holder: string
  direction: 'needs' | 'provides' | 'separates'
  value: string
  strength: 'required' | 'preferred'
  note?: string
  author: string
  recorded_at: string
}

export type DecisionScreenView = {
  findings: readonly FindingView[]
  decisions: readonly DecisionView[]
}

export type PlanSummaryView = {
  id: string
  label: string
  sequence: number
  created_at: string
  placements: number
  unplaced: number
  findings: number
  status: StatusLabel
  summary: string
}

export type PlanView = {
  summary: PlanSummaryView
  findings: readonly FindingView[]
  traces: readonly TraceView[]
}

export type PlanChangeView = {
  id: string
  family: string
  people: string
  kind: 'moved' | 'unplaced' | 'placed' | 'unchanged'
  before?: string
  after?: string
  reason: string
  detail?: string
}

export type PlanDiffView = {
  before: PlanSummaryView
  after: PlanSummaryView
  changes: readonly PlanChangeView[]
  unavailable_reason?: string
}

export type ReportRoomView = {
  room: string
  building: string
  occupants: string
  capacity: string
  status: StatusLabel
  notes: readonly string[]
}

export type AssignmentReportView = {
  generated_at: string
  sequence: number
  total_families: number
  placed_families: number
  unplaced_families: number
  rooms: readonly ReportRoomView[]
  unplaced: readonly { family: string; people: string; reason: string }[]
  findings: readonly FindingView[]
}

export type ReleaseScopeView = {
  id: string
  title: string
  detail: string
  status: 'communicated' | 'changed' | 'never-communicated'
  last_communicated?: string
  affected_families: number
  change_summary: string
  blocking?: string
}

export type CommunicationDiffView = {
  label: string
  before: string
  after: string
  kind: 'changed' | 'added' | 'removed'
}

export type CommunicationReviewView = {
  scopes: readonly ReleaseScopeView[]
  selected_scope_ids: readonly string[]
  differences: readonly CommunicationDiffView[]
  affected_families: readonly string[]
  dependencies: readonly FindingView[]
  reviewed_sequence: number
  build_label: string
  notification_count: number
}

export type CommunicationEntryView = {
  id: string
  communicated_at: string
  actor: string
  sequence: number
  scopes: readonly string[]
  note?: string
  differences: readonly CommunicationDiffView[]
  unavailable_reason?: string
}
