import type { World } from '../events/fold.js'
import type { Event, EventPayloadSchemas, JsonValue } from '../events/types.js'

export type ScreenDescriptor = {
  id: string
  route: string
  label: string
  audience: 'organiser'
  host: 'kernel' | 'module'
}

export type OrganiserLogResponse = {
  events: readonly Event[]
  head_seq: number
  build_revision: string
  compatibility_revision: number
  screen_registry: readonly ScreenDescriptor[]
}

export type OrganiserEventDraft = {
  type: string
  subject: string | null
  payload: JsonValue
}

export type OrganiserApplyRequest = {
  input_seq: number
  events: readonly OrganiserEventDraft[]
  build_revision: string
  compatibility_revision: number
}

export type OrganiserApplyResponse = {
  events: readonly Event[]
  head_seq: number
  world: World
  build_revision: string
  compatibility_revision: number
}

export type OrganiserStaleResponse = {
  error: 'stale_head'
  expected_head: number
  actual_head: number
  events: readonly Event[]
}

export type OrganiserRevisionResponse = {
  error: 'stale_build'
  build_revision: string
  compatibility_revision: number
}

export type OrganiserProtocolConfig = {
  event_payload_schemas?: EventPayloadSchemas
}
