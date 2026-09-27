import type { StatusLabel, StatusTone } from '../../../app/organiser/ui-types.js'

export type { StatusLabel, StatusTone }

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
}

export type BoardView = {
  buildings: readonly BuildingView[]
  unplaced: readonly FamilyView[]
  unplaced_reasons: Readonly<Record<string, string>>
  traces: Readonly<Record<string, readonly TraceView[]>>
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
