import type { StatusTone } from '../../../app/organiser/ui-types.js'

export type RequirementStrength = 'required' | 'preferred'

export type RequirementView = {
  key: string
  label: string
  strength: RequirementStrength
  capability_key: string | null
  kind: 'profile-requirement' | 'generic-needs' | 'relation' | 'structural'
  structural: string | null
  met?: boolean
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
  bed_demand: number
  requirements: readonly RequirementView[]
  status?: StatusLabel
  room_id?: string
  fixed?: boolean
  fixed_room_name?: string
  fixed_invalid?: boolean
}

export type BedView = {
  bed_type: string
  count: number
  sleeps: number
}

export type RoomView = {
  id: string
  name: string
  building: string
  floor: string
  capacity: number
  occupied: number
  free: number
  occupants: readonly FamilyView[]
  features: readonly string[]
  feature_keys: readonly string[]
  beds: readonly BedView[]
  fixed_family_ids: readonly string[]
  fixed_invalid_family_ids: readonly string[]
  fit_hints: readonly FamilyView[]
}

export type BuildingView = {
  id: string
  name: string
  rooms: readonly RoomView[]
  family_count: number
  requirement_issues: number
  wish_issues: number
}

export type BoardStats = {
  families: number
  without_room: number
  without_match: number
  fixed: number
  free_places: number
}

export type BoardView = {
  stats: BoardStats
  buildings: readonly BuildingView[]
  unplaced: readonly FamilyView[]
  without_match: readonly FamilyView[]
  free_rooms: readonly RoomView[]
  partial_rooms: readonly RoomView[]
  unplaced_reasons: Readonly<Record<string, string>>
}

export type FindingView = {
  id: string
  severity: 'error' | 'warning' | 'info'
  title: string
  description: string
  subjects: readonly string[]
  action?: string
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
  total_families: number
  placed_families: number
  unplaced_families: number
  rooms: readonly ReportRoomView[]
  unplaced: readonly { family: string; people: string; reason: string }[]
  findings: readonly FindingView[]
}

export type StatusLabel = {
  label: string
  tone: StatusTone
}
