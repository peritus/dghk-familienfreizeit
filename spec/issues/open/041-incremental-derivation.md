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

## Remaining problem

The event-log fold, scoped uniqueness checks, place synchronization and
inventory construction are indexed. Room placement shares evaluated sweeps
and placement-index construction. Attention checks group trace rejections,
assignments, membership and demand. Their implemented behavior and measurements
are in [performance tracking](../../../docs/engineering/performance-tracking.md)
and [scale evidence](../../../docs/engineering/performance-scale.md).

The remaining expensive operation is the complete deterministic room search
for a large simultaneously live population. At 50,000 events with 2,550
families and 2,125 rooms, the measured full solve is about 32 seconds and a
composed organiser edit about 37 seconds on the lab machine. Replay at the
same size is about 1.35 seconds. A 50,000-event history with 30 live families
has a composed edit around 0.35 seconds. Event count alone is not a useful
interactive solver budget.

The [M10 acceptance gate](../../roadmap.md#m10--family-access) still
requires this issue to be closed or explicitly accepted. Passing the lab cases
does not resolve that acceptance decision.

## Decision needed

Keep D1/D2's event-only persistence and D3's deterministic solver contract while
choosing the next step:

1. Accept an explicit live-population/latency envelope for the complete solver.
   Measure the intended occasion shape on representative client hardware and
   the hosted runtime, including cold requests and its CPU limits.
2. Approve further answer-preserving search/index work or incremental computation.
   An incremental result must be verified against a complete fresh solve across
   edits, global constraints, forced placements and ordering dependencies.
3. Review a changed candidate search or placement strategy under D3. Specify its
   expected behavior and equivalence/quality criteria before changing the solver.

A background calculation can improve responsiveness but does not remove CPU
cost and needs an explicit UI lifecycle contract. Persisted world snapshots
would require D1/D2 review and would not eliminate draft solver search cost.
These are decisions for review, not requirements silently adopted by tooling.

## Open questions

- What is the required maximum live population and acceptable organiser-edit latency?
- Which of the alternatives above should be pursued or explicitly accepted?
- Does the event-only persistence rule stand as written? Any snapshot proposal
  requires review of D1/D2 rather than a workaround.

## Related files

- [architecture/data-model.md](../../architecture/data-model.md)
- [architecture/events.md](../../architecture/events.md)
- [architecture/solver-contract.md](../../architecture/solver-contract.md)
- [deferred-ideas/re-introduce-caching.md](../../deferred-ideas/re-introduce-caching.md)
- [Historical metrics](../archived/040-historical-code-path-metrics.md)
