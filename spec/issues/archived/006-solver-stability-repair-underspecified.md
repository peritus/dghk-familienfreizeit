---
id: "006"
title: Room/workshop assignment don't fully realize D4's stability contract
status: resolved
severity: contract-contradiction
category: kernel
source: coherence-audit-2026-09-19, spec-review-2026-09-19
related_decisions: [D4]
opened: 2026-09-19
---

# Room/workshop assignment don't fully realize D4's stability contract

## Problem

D4 ([`decisions.md`](../../../decisions.md) — "stable sorted-greedy with bounded repair, not
integer programming") requires retaining feasible assignments unless
coverage or repair justifies a move. Room assignment
([`modules/room-assignment.md:103`](../../modules/room-assignment.md)) has no previous-placement retention phase.
Workshop assignment ([`modules/workshop-assignment.md:161`](../../modules/workshop-assignment.md)) retains assignments
but supplies no repair procedure for moving a flexible incumbent to
accommodate someone with only one eligible workshop. Stable sorting alone
does not guarantee stability when a new participant sorts before an existing
one, and the deterministic source of "the previous plan" also needs
definition for ordinary `derive(events, config)`.

## Recommendation

Define the deterministic event-prefix anchor for "previous", retention
phases, bounded repair limits and trace reasons in the solver and both
assignment contracts before M5/M6/M10. A mutable previous-plan cache is not
an acceptable shortcut — `derive(events, config)` remains authoritative. If
stability is to be weakened instead, explicitly revisit D4. Add fixtures for
a harmless arrival and a constrained arrival requiring a flexible incumbent
to move.

## Open questions

1. What is the deterministic anchor for "the previous plan" under
   `derive(events, config)`?
2. What are the bounded-repair limits, and should D4 be revisited if they
   turn out to be impractical?

## Resolution

1. The deterministic anchor already existed: `deriveTransition` (solver
   contract, [`spec/architecture/solver-contract.md:15-33`](../../architecture/solver-contract.md)) derives `before`
   from the committed event-log prefix and `after` from the prospective log —
   the event log remains the only persisted domain state, so no mutable
   previous-plan cache is introduced. Workshop assignment's Step 0 already
   consumed this correctly.

2. Room assignment was missing the previous-placement retention phase that
   workshop assignment already had. Added a new **Phase 0 — retain valid
   previous placements** to [`spec/modules/room-assignment.md`](../../modules/room-assignment.md), seeded from
   `deriveTransition`'s `before` plan exactly as workshop assignment's Step 0
   is, and renumbered the remaining phases (required decisions, forced
   placements, sorted greedy, bounded repair, unplaceable) to 1 through 5.
   Phase 1 (required decisions) now records a decision that supersedes a
   retained placement as a required move, and phase 4 (bounded repair)
   clarifies that a retained placement moves only when phase 1 or phase 4
   itself finds it necessary — stable sorting in phase 3 does not by itself
   justify displacing it. Added retention/repair test fixtures to the
   module's test list mirroring workshop assignment's ("unchanged prospective
   event set retains every valid prior placement", "capacity loss moves the
   minimum necessary set", "a new family does not displace an existing
   placement when a feasible alternative exists").

   Bounded-repair limits stay a per-profile numeric configuration
   (`max_repair_passes`), same as workshop assignment — the contract bounds
   the *mechanism* (deterministic pairwise swaps, capped passes, no size
   requirement), not a fixed number the spec pins outright. No evidence
   surfaced that this bound is impractical, so D4 does not need revisiting.

No D4 boundary was changed — this fully realizes D4's existing bounded-repair
requirement for room assignment rather than reopening it.

## Related files

- [modules/room-assignment.md](../../modules/room-assignment.md)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [architecture/solver-contract.md](../../architecture/solver-contract.md)
