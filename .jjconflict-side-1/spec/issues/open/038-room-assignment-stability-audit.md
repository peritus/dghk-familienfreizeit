---
id: "038"
title: Room assignment has no permanent regression coverage for retention stability
status: open
severity: gap
category: module:room-assignment
source: full-scale prototype-dataset resolver check (see sibling issue 037)
related_decisions: [D4]
related_milestones: []
opened: 2026-09-30
---

# Room assignment has no permanent regression coverage for retention stability

## Problem

While investigating [issue 037](037-workshop-assignment-fill-retention-instability.md)
(workshop-assignment's fill placements are not stable across a retention
cycle), the same question was asked of `room-assignment`, which implements
the analogous D4 stability contract closed by
[issue 006](../archived/006-solver-stability-repair-underspecified.md). Ad
hoc checks against `runRoomAssignment` directly (basic greedy placement
across multiple rooms, and a tight-capacity scenario) did not reproduce an
equivalent instability — retention there has no "still wanted" rejection
analogous to workshop-assignment's rank check, so a previously greedy- or
forced-placed family is retained whenever it is still feasible, regardless
of how it was originally placed. This structurally avoids the specific
mechanism behind issue 037. However:

- This was verified only ad hoc, with two hand-built scenarios, not as a
  permanent test.
- The bounded-repair swap path (`runRoomAssignment`'s pairwise-swap loop)
  was not exercised under a genuine repair-triggering scenario during this
  check — the scenarios tried were resolved by greedy placement alone
  before repair ever ran.
- There is no fixture-driven, realistic-scale dataset for room-assignment
  analogous to the workshop one (a large family/room dataset run twice,
  asserting identical output), so a future change could silently
  reintroduce an equivalent instability without any test catching it.

## Evidence

- [`src/modules/room-assignment/index.ts`](../../../src/modules/room-assignment/index.ts),
  retention step: `if (retainedRoom && input.rooms.some(...)) { const
  current = roomById(...); if (current && feasible(family, current,
  placements, input, params, rules).length === 0) place(family, current,
  'retain') }` — feasibility-only, no rank/preference-style rejection.
- Ad hoc verification (not committed) called `runRoomAssignment` directly
  with: (a) six single-person families across three two-bed rooms, greedy
  placement only; (b) a tight-capacity scenario forcing two families to
  stay unplaced. Both reproduced identical assignments across a fresh run
  and a run retaining against the first as `previous`.
- No scenario constructed during this check actually forced the bounded
  repair swap path to execute (the sort in `compareFamily` — priority, then
  candidate count, then bed demand — placed the scenario's larger family
  first via ordinary greedy, before repair was ever needed).

## Recommendation

Add a permanent regression test mirroring
[`test/solver/workshop-assignment-prototype-dataset.test.ts`](../../../test/solver/workshop-assignment-prototype-dataset.test.ts):
a realistic-scale room/family dataset, solved twice with the second run's
previous plan set to the first run's result, asserting the placement set is
identical. Specifically construct at least one scenario that forces the
bounded-repair swap path to execute on the first run, and confirm the
second (retained) run reproduces the same swapped outcome rather than
re-deriving a different one — this is the closest structural analogue to
what went wrong in issue 037, and it was not exercised here.

## Related files

- [modules/room-assignment.md](../../modules/room-assignment.md)
- [decisions.md#d4](../../../decisions.md#d4--stable-sorted-greedy-with-bounded-repair-not-integer-programming)
- [issue 006 (archived)](../archived/006-solver-stability-repair-underspecified.md)
- [issue 037](037-workshop-assignment-fill-retention-instability.md)
