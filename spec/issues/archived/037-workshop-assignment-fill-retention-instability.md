---
id: "037"
title: Fill-origin workshop assignments are not stable across a retention cycle
status: resolved
severity: contract-contradiction
category: module:workshop-assignment
source: full-scale prototype-dataset resolver check (test/solver/workshop-assignment-prototype-dataset.test.ts)
related_decisions: [D4, D31]
related_milestones: [M8]
opened: 2026-09-30
---

# Fill-origin workshop assignments are not stable across a retention cycle

## Problem

D4 ("stable sorted greedy with bounded repair") and its stability contract
(closed by [issue 006](../archived/006-solver-stability-repair-underspecified.md))
require retaining a valid previous assignment unless coverage or repair
justifies a move. The implementation also had a fill path that assigned
unchosen workshops to reach the configured assignment target. That path contradicted
[D31](../../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops),
which requires every automatic assignment to come from the person's current
ranking. Re-deriving the exact same event log could also change a fill-origin
person's workshop assignment to a different, still-valid one, so the path was
both outside the attendance contract and unstable.

## Evidence

- [`src/modules/workshop-assignment/index.ts`](../../../src/modules/workshop-assignment/index.ts),
  retention step (step 2): for each prior assignment, it required
  `stillRanked` — `rankingByPerson.get(person.id)?.choices.some(choice =>
  choice.workshop_id === prior.workshop_id && choice.rank !== null)` — before
  attempting to retain it. A fill-origin assignment was, by construction, for
  a workshop the person did *not* rank, so this check almost always failed
  and the prior placement was dropped with reason `hard.no-longer-ranked`,
  then reprocessed through the ordinary fill loop.
- The fill loop's candidate order depended on `counts.get(a.id)` (how full
  each workshop already was) at the moment it ran for that person. A fresh
  run interleaved each person's ranked-then-fill processing; a retained run
  front-loaded *all* ranked-retentions in one pass before any fill ran at
  all. Same inputs, different intermediate occupancy state, different fill
  outcome.
- Reproduced at full scale in
  [`test/solver/workshop-assignment-prototype-dataset.test.ts`](../../../test/solver/workshop-assignment-prototype-dataset.test.ts)
  (140 people, 33 workshops, ported from
  [the workshops prototype](../../html-prototypes/workshops-prototype-v16.html)):
  solving the same derived world twice with the second run's previous plan
  set to the first run's result changed dozens of fill placements, and a
  handful of ranked placements as a knock-on effect. All hard constraints
  (capacity, one-slot-per-person, audience, leader-conflict) still held in
  both runs — this was a stability defect, not a correctness defect.

## Resolution

The fill path was removed from the solver, prototype, and projection surfaces.
`workshops_per_person` now caps automatic assignments. Bounded repair likewise
uses only current ranked choices for both
the person being seated and the person being moved. People without a feasible
chosen workshop remain unassigned, for both children and adults.

## Related files

- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [decisions.md#d4](../../../decisions.md#d4--stable-sorted-greedy-with-bounded-repair-not-integer-programming)
- [decisions.md#d31](../../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops)
- [issue 006 (archived)](../archived/006-solver-stability-repair-underspecified.md)
- [test/solver/workshop-assignment-prototype-dataset.test.ts](../../../test/solver/workshop-assignment-prototype-dataset.test.ts)
