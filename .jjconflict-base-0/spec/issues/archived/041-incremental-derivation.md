---
id: "041"
title: Derivation cost above a few thousand events
status: resolved
severity: gap
category: kernel
source: derivation benchmark sweep
related_decisions: [D1, D2, D3]
related_milestones: []
opened: 2026-10-03
---

# Derivation cost above a few thousand events

## Problem

Complete event-log derivation and deterministic search needed measurement and
an explicit occasion population/latency envelope before family-access acceptance.
Event count alone did not describe the cost: large live populations increase
room candidate search, while repeated history can retain a small live world.

## Resolution

The accepted practical target is **100 families** in the normal and contention
occasion-lifecycle workloads, using **500 ms p95 calculation / 1,000 ms p95
per authenticated append route** as local lab budgets. The
[lifecycle capacity guide](../../../docs/engineering/lifecycle-capacity.md#accepted-100-family-envelope)
and [curated evidence](../../../docs/engineering/lifecycle-capacity-evidence.json)
record both scenarios on the same source and lab machine, seven samples after
one warmup, with complete allocations and real closing/reopening history.

Both contain 389 people. Normal has 6,862 events, calculation p95 236 ms,
organiser append 411 ms and family append 446 ms. Contention has 6,837 events,
calculation p95 192 ms, organiser append 377 ms and family append 424 ms.
The population decision is resolved by acceptance of this measured local
lifecycle envelope. Larger natural lifecycle and exact-size stress cases remain
measured controls; they do not define the accepted interactive target.

The tracking system preserves source/environment fingerprints, history,
allocation quality, deterministic work gates and portable drill-down traces.
The fold, uniqueness, inventory, room sweep and attention improvements are
covered by [performance tracking](../../../docs/engineering/performance-tracking.md)
and [stress evidence](../../../docs/engineering/performance-scale.md).

Hosted Worker/D1 limits, cold and concurrent requests, and representative
browser hardware remain operational verification under
[M15 launch hardening](../../roadmap.md#m15--deployment-security-and-launch-hardening).
The local envelope is not a hosted deployment or browser latency guarantee.

## Architectural constraints

D1/D2's event-only persistence and D3's deterministic complete-solver contract
remain binding. A future incremental computation must match a complete fresh
solve across edits, global constraints, forced placements and ordering
dependencies. Changes to search semantics or persisted world state require
review of the affected decisions. The
[cache proposal](../../deferred-ideas/re-introduce-caching.md) remains deferred
and requires its own review and scope approval.

## Related files

- [architecture/data-model.md](../../architecture/data-model.md)
- [architecture/events.md](../../architecture/events.md)
- [architecture/solver-contract.md](../../architecture/solver-contract.md)
- [deferred-ideas/re-introduce-caching.md](../../deferred-ideas/re-introduce-caching.md)
- [Historical metrics](040-historical-code-path-metrics.md)
