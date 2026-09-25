---
id: "032"
title: Retirement specifications contradict D27 hard removal
status: needs-decision
severity: contract-contradiction
category: kernel
source: semantic-coherence-sweep-after-fix
related_decisions: [D27]
related_milestones: [M1, M5]
opened: 2026-09-25
---

# Retirement specifications contradict D27 hard removal

## Problem

The binding D27 decision and current fold remove withdrawn people, cleared
labels, and retired entities from live derived collections. Several documents
still describe the rejected tombstone model or preserve withdrawn identity in
the live world.

This leaves future module authors and documentation readers with incompatible
retirement contracts: one path expects history to be reconstructed by re-folding
an event prefix, while another expects `retired_seq` fields or retained retired
entities.

## Evidence

- D27 explicitly rejects `retired_seq`/`cleared_seq` tombstones and requires hard
  removal; see [`decisions.md`](../../../decisions.md) lines 628–639.
- [`docs/architecture/events.md`](../../../docs/architecture/events.md) line 28
  previously described withdrawn people as retaining identity and historical
  labels while marked retired; the implemented documentation is being corrected
  in this change, but the underlying specification conflict remains.
- [`room-inventory.md`](../../modules/room-inventory.md) lines 57 and 62–63 say
  `BedRemoved` sets `retired_seq` and retires a place using that lifecycle field.
- [`fold.ts`](../../../src/events/fold.ts) lines 353–359 hard-remove withdrawn
  people and their labels, matching D27.
- [`derived-world.test.ts`](../../../test/events/derived-world.test.ts) lines
  93–124 asserts hard removal.

## Recommendation

Reconcile future module lifecycle specifications with D27: describe retirement
as hard removal from the live world and historical reconstruction through event
prefix derivation. If any module needs a historical retirement marker for a
public view, propose a deliberate revision to D27 and update every dependent
document together; do not reintroduce per-entity tombstone fields locally.

## Open questions

1. Should any future module expose a separate derived historical-lifecycle view,
   or is event-prefix re-derivation sufficient for all planned consumers?

## Related files

- [decisions.md](../../../decisions.md)
- [architecture/events.md](../../architecture/events.md)
- [modules/room-inventory.md](../../modules/room-inventory.md)
- [architecture/data-model.md](../../architecture/data-model.md)
- [src/events/fold.ts](../../../src/events/fold.ts)
- [test/events/derived-world.test.ts](../../../test/events/derived-world.test.ts)
