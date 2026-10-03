---
id: "041"
title: Derivation cost above a few thousand events
status: needs-decision
severity: gap
category: kernel
source: derivation benchmark sweep
related_decisions: [D1, D2, D3]
related_milestones: []
opened: 2026-10-03
---

# Derivation cost above a few thousand events

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

**2. `solve` grows faster than the fold.** Addressed for the stage that
dominated it. `room-assignment.place` was rescanning families, rooms and
constraints inside its innermost loops; removing that took `solve` from
23 442 ms to 1 607 ms at 2 367 events, with the plan output unchanged. See
[room assignment](../../../docs/modules/room-assignment.md#placement-cost).

What remains in `solve` is the search itself — families times rooms, workshops
times slots times spaces — which is the algorithm rather than waste.
`workshop-assignment.attendance` is now its largest single term (424 ms of
1 607 ms at 2 367 events) and has not been examined; its five-step algorithm
with up to `max_repair_passes` relocation passes is the obvious place to look
next, and it should be measured before it is changed.

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

`solve`, before and after the placement work:

| events | before | after | factor |
|---|---|---|---|
| 611 | 195.9 ms | 52.8 ms | 3.7× |
| 1 196 | 1 926.3 ms | 276.3 ms | 7.0× |
| 2 367 | 23 442.3 ms | 1 607.3 ms | 14.6× |

Per stage at 2 367 events after the change: `room-assignment.place` 1 158 ms,
`workshop-assignment.attendance` 424 ms, `preflight` 12 ms,
`workshop-scheduling.placement` 0.7 ms, `workshop-rankings.demand` 0.1 ms.

## Recommendation

Three independent pieces, in this order.

**Index the uniqueness validators.** Maintain the two uniqueness keys the fold
already enforces — room number within building, bed label within room — as
indexes beside the existing ones, so a duplicate check is a lookup. Contained
within `room-inventory` and the fold's state, no decision review needed.

**Examine `workshop-assignment.attendance`**, now the largest term in `solve`.
As with placement, measure first: the per-stage benchmark isolates it, and the
question is whether its cost is the search or rescanning on top of the search.

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
2. `solve` is still an order of magnitude more expensive than the fold
   (1 607 ms against 74 ms at 2 367 events), so a faster fold changes little end
   to end. Does the snapshot question stay open until `solve` is addressed?

## Related files

- [architecture/data-model.md](../../architecture/data-model.md)
- [architecture/events.md](../../architecture/events.md)
- [architecture/solver-contract.md](../../architecture/solver-contract.md)
- [deferred-ideas/re-introduce-caching.md](../../deferred-ideas/re-introduce-caching.md)
- [issues/open/040-historical-code-path-metrics.md](040-historical-code-path-metrics.md)
