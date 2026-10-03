---
id: "041"
title: Derivation and solve cost above a few thousand events
status: needs-decision
severity: gap
category: kernel
source: derivation benchmark sweep
related_decisions: [D1, D2, D3]
related_milestones: []
opened: 2026-10-03
---

# Derivation and solve cost above a few thousand events

## Problem

`derive` was quadratic in the length of the event log. Every module event
declares a `validate(payload, world)`, and `normalizeEvents` built a complete
derived world — a full label sort plus a full `resolve()` — before each one. A
log of *n* events therefore performed roughly *n* full resolves over a label
store that grows with *n*.

That is fixed: validators now receive a narrow `ValidationWorld` backed by
incrementally maintained indexes, and the log is folded once per `derive`. The
fold is close to linear and the measured improvement at 9 393 events is 307×.
See [derived world](../../../docs/architecture/derived-world.md#derivation-cost).

Two superlinear costs remain, and neither is addressed by caching, because a
cache cannot help the paths that matter here: a cold isolate, a new
`build_revision`, and `deriveTransition`, which solves two worlds per organiser
keystroke batch of which the draft one is novel by construction.

**1. Uniqueness validators are quadratic in their entity kind.**
`validateRoom` scans every live room to reject a duplicate number within a
building, and `validateBed` scans every live bed to reject a duplicate label
within a room, each candidate costing a label lookup. Cost tracks rooms² and
beds², not events². Measured growth exponent returns to 1.98 between 9 393 and
18 762 events, where beds reach 2 400.

**2. `solve` costs orders of magnitude more than `derive` and grows faster.**
At 2 367 events `derive` is 72 ms and `solve` is 23 442 ms. The stages are
greedy searches — families against rooms in `room-assignment.place`, workshops
against slots and spaces in `workshop-scheduling.placement` — so cost tracks the
product of those populations. This now dominates every other cost in the
pipeline by more than two orders of magnitude.

## Evidence

`npm run bench`, one machine, median of repeated runs, `familienfreizeit-2027`
profile. `derive` before and after the fold fixes:

| events | before | after | factor |
|---|---|---|---|
| 611 | 145.7 ms | 14.8 ms | 9.8× |
| 1 196 | 611.0 ms | 27.8 ms | 22× |
| 2 367 | 3 175.3 ms | 71.8 ms | 44× |
| 4 709 | 21 689.9 ms | 239.5 ms | 91× |
| 9 393 | 224 605.3 ms | 730.8 ms | 307× |
| 18 762 | not measurable | 2 875.6 ms | — |

Growth exponent, consecutive factors: before 2.13 → 2.41 → 3.39; after 0.94 →
1.39 → 1.62 → 1.98.

`solve` at the same sizes: 196.9 ms at 611 events, 1 922.1 ms at 1 196,
23 442.3 ms at 2 367. Unchanged by this work.

## Recommendation

Three independent pieces, in this order.

**Index the uniqueness validators.** Maintain the two uniqueness keys the fold
already enforces — room number within building, bed label within room — as
indexes beside the existing ones, so a duplicate check is a lookup. Contained
within `room-inventory` and the fold's state, no decision review needed.

**Treat `solve` as the real remaining bottleneck.** Measure which stage and
which rule dominates before changing an algorithm. A greedy search whose cost is
the product of two populations is not obviously wrong for an occasion of this
size; what is wrong is that nobody knows which part of it is expensive. This
needs its own investigation, not a cache: `deriveTransition` runs it twice per
organiser keystroke batch on a world that has never existed before.

**Snapshot and tail replay, if the fold still needs to be faster.** `derive` is
a prefix fold over an append-only log: persist a serialised world at seq *N*,
load it, and fold only the events after *N*. Cost becomes proportional to the
tail rather than the log, and a stale snapshot degrades to a longer tail rather
than a wrong answer.

This last one is why the issue is `needs-decision`. A snapshot stores folded
domain state, which [AGENTS.md](../../../AGENTS.md) forbids and which commit
`xsppsvly` deliberately removed when it dropped the `entity` and `label`
projection tables. The distinction worth reviewing is that those tables were
authoritative and needed a rebuild step that could fail or race, whereas a
snapshot keyed on `(seq, build_revision, compatibility_revision)` is derivable,
verifiable against a fresh fold, and discardable — deleting it makes the
application slow, never wrong. That is a D1/D2 revision and belongs in decision
review before any specification text changes.

## Open questions

1. Is a discardable, content-keyed world snapshot acceptable under the "no
   tables that store folded domain state" rule, or does that rule stand as
   written and the fold has to stay fully recomputed?
2. Should `solve` be investigated before the snapshot question is settled? It is
   currently more than two orders of magnitude more expensive than the fold, so
   making the fold faster still changes little end to end.

## Related files

- [architecture/data-model.md](../../architecture/data-model.md)
- [architecture/events.md](../../architecture/events.md)
- [architecture/solver-contract.md](../../architecture/solver-contract.md)
- [deferred-ideas/re-introduce-caching.md](../../deferred-ideas/re-introduce-caching.md)
- [issues/open/040-historical-code-path-metrics.md](040-historical-code-path-metrics.md)
