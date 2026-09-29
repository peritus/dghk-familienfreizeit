---
id: "030"
title: Generic event append can misreport stale heads as invalid events
status: archived
severity: contract-contradiction
category: kernel
source: semantic-coherence-sweep-after-fix
related_decisions: []
related_milestones: [M1, M3]
opened: 2026-09-25
---

# Generic event append can misreport stale heads as invalid events

## Resolution

The generic event endpoint now compares `expected_head` with the stored head
before parsing or deriving the candidate batch. Lower and forward-moving heads
return the canonical `409 stale_head` response with the current event suffix.

The issue is resolved by the event handler and its lower/forward-head tests.

## Problem

`POST /api/events` accepts an `expected_head`, but it assigns event sequence
numbers from that caller-provided value and derives the candidate batch before
the storage compare-and-swap can report a stale head. When the caller's head is
behind or ahead of the current log, derivation can fail first with a sequence
gap or duplicate sequence, and the handler returns `400 invalid_event` instead
of the documented `409 stale_head` response.

Clients cannot reliably distinguish a retryable concurrent update from malformed
event data.

## Evidence

- [`worker/index.ts`](../../../src/worker/index.ts) lines 222–230 read the current
  log but assign parsed event sequences from the caller's `expected_head`.
- [`worker/index.ts`](../../../src/worker/index.ts) lines 238–245 derive before
  calling `appendEvents`.
- [`worker/index.ts`](../../../src/worker/index.ts) lines 249–254 handle
  `StaleHeadError` only after derivation succeeds; earlier failures become
  `invalid_event`.
- The event lifecycle contract requires validation against the log at the
  caller's head and documents stale-head rejection as a conflict response in
  [`authentication.md`](../../application/authentication.md) lines 37–41.

## Recommendation

Check the supplied head against the current stored head before constructing the
candidate sequence, returning the canonical `409 stale_head` body and current
events on mismatch. Preserve the existing authorization, schema, and append
validation paths for requests whose head is current. Add tests for both a stale
lower head and a forward-moving head.

## Open questions

None.

## Related files

- [src/worker/index.ts](../../../src/worker/index.ts)
- [application/authentication.md](../../application/authentication.md)
- [architecture/overview.md](../../architecture/overview.md)
- [test/worker/events.test.ts](../../../test/worker/events.test.ts)
