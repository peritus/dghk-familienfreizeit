import { assertAppendableWorld, derive, type KernelConfig } from './fold.js'
import { eventPayloadSchemas, parseEvent, type Event } from './types.js'
import type { EventDraft } from './types.js'

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
  const schemas = eventPayloadSchemas(config)
  const expectedHead = committed.length
  const events = drafts.map((draft, index) =>
    parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
  )
  assertAppendableWorld(derive([...committed, ...events], config))
  return events
}
