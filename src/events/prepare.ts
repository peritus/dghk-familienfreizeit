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
  const events = parseDraftBatch(committed.length, drafts, config)
  const world = derive([...committed, ...events], config)
  assertAppendableWorld(world)
  return { events, world }
}

/** Pure parsing phase shared with the performance adapter. */
export function parseDraftBatch(
  expectedHead: number,
  drafts: readonly EventDraft[],
  config: KernelConfig = {},
): Event[] {
  const schemas = eventPayloadSchemas(config)
  return drafts.map((draft, index) =>
    parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
  )
}
