import { derive, type KernelConfig } from './fold.js'
import { parseEvent, kernelPayloadSchemas, type Event } from './types.js'
import type { EventDraft } from './store.js'

/**
 * Parses and replays a complete prospective batch before it can reach storage.
 * The event log is only valid if the committed prefix and every new event fold
 * successfully together under the selected profile.
 */
export function prepareEventBatch(
  committed: readonly Event[],
  drafts: readonly EventDraft[],
  config: KernelConfig = {},
): Event[] {
  const schemas = { ...kernelPayloadSchemas, ...config.event_payload_schemas }
  const expectedHead = committed.length
  const events = drafts.map((draft, index) =>
    parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
  )
  derive([...committed, ...events], config)
  return events
}
