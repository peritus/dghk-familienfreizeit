import { assertAppendableWorld, derive, type KernelConfig, type World } from './fold.js'
import { eventPayloadSchemas, parseEvent, type Event } from './types.js'
import type { EventDraft } from './types.js'

/**
 * Parses and replays a complete prospective batch before it can reach storage.
 * The event log is only valid if the committed prefix and every new event fold
 * successfully together under the selected profile.
 *
 * The folded world is returned rather than discarded. It is the world the batch
 * produces, so a caller that goes on to append the batch has no reason to fold
 * the same events a second time to describe the result.
 */
export function prepareEventBatch(
  committed: readonly Event[],
  drafts: readonly EventDraft[],
  config: KernelConfig = {},
): { events: Event[]; world: World } {
  const schemas = eventPayloadSchemas(config)
  const expectedHead = committed.length
  const events = drafts.map((draft, index) =>
    parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
  )
  const world = derive([...committed, ...events], config)
  assertAppendableWorld(world)
  return { events, world }
}
