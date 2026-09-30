---
id: "037"
title: Fill-origin workshop assignments are not stable across a retention cycle
status: needs-decision
severity: contract-contradiction
category: module:workshop-assignment
source: full-scale prototype-dataset resolver check (test/solver/workshop-assignment-prototype-dataset.test.ts)
related_decisions: [D4]
related_milestones: [M8]
opened: 2026-09-30
---

# Fill-origin workshop assignments are not stable across a retention cycle

## Problem

D4 ("stable sorted greedy with bounded repair") and its stability contract
(closed by [issue 006](../archived/006-solver-stability-repair-underspecified.md))
require retaining a valid previous assignment unless coverage or repair
justifies a move. `workshop-assignment`'s retention step honours this for
*ranked*-choice placements, but not for *fill* placements — the automatic
top-up used to reach `minimum_workshops` for someone with no ranked choice
left. Re-deriving the exact same event log twice in a row (no new events at
all) can change a fill-origin person's workshop assignment to a different,
still-valid one. Because ranked and fill placements compete for the same
per-slot/per-workshop capacity, the instability can cascade: a shuffled
fill placement can free or consume capacity that changes which *ranked*
choice succeeds for an unrelated person too.

## Evidence

- [`src/modules/workshop-assignment/index.ts`](../../../src/modules/workshop-assignment/index.ts),
  retention step (step 2): for each prior assignment, it requires
  `stillRanked` — `rankingByPerson.get(person.id)?.choices.some(choice =>
  choice.workshop_id === prior.workshop_id && choice.rank !== null)` — before
  attempting to retain it. A fill-origin assignment is, by construction, for
  a workshop the person did *not* rank, so this check almost always fails
  and the prior placement is dropped with reason `hard.no-longer-ranked`,
  then reprocessed through the ordinary fill loop.
- The fill loop's candidate order depends on `counts.get(a.id)` (how full
  each workshop already is) at the moment it runs for that person. A fresh
  run interleaves each person's ranked-then-fill processing; a retained run
  front-loads *all* ranked-retentions in one pass before any fill runs at
  all. Same inputs, different intermediate occupancy state, different fill
  outcome.
- Reproduced at full scale in
  [`test/solver/workshop-assignment-prototype-dataset.test.ts`](../../../test/solver/workshop-assignment-prototype-dataset.test.ts)
  (140 people, 33 workshops, ported from
  [the workshops prototype](../../html-prototypes/workshops-prototype-v16.html)):
  solving the same derived world twice with the second run's previous plan
  set to the first run's result changes dozens of fill placements, and a
  handful of ranked placements as a knock-on effect. All hard constraints
  (capacity, one-slot-per-person, audience, leader-conflict) still hold in
  both runs — this is a stability defect, not a correctness defect.

## Recommendation

Extend retention (or redesign the fill step) so that a fill-origin
placement is retained whenever it is still feasible, the same way a
ranked-origin one is — without requiring the person to now rank that
workshop. The `hard.no-longer-ranked` check should apply only when the
person's *ranked* choice actually changed, not to fill placements that were
never rank-driven. Whatever the mechanism, the fill loop's own candidate
selection needs to stop depending on cross-person occupancy state that
differs between a fresh derive and a retained one, or fill needs its own
retention-aware phase parallel to the ranked one.

## Open questions

1. Should a retained fill placement be re-validated against
   `minimum_workshops`/`fairness_targets` each cycle, or does "still
   feasible" alone justify keeping it indefinitely (mirroring how a ranked
   retention is not re-scored against current rank weights)?
2. Is the cascading effect on ranked placements (a shuffled fill freeing or
   consuming capacity that changes an unrelated ranked outcome) acceptable
   as long as hard constraints hold, or does it need its own guard?

## Related files

- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [decisions.md#d4](../../../decisions.md#d4--stable-sorted-greedy-with-bounded-repair-not-integer-programming)
- [issue 006 (archived)](../archived/006-solver-stability-repair-underspecified.md)
- [test/solver/workshop-assignment-prototype-dataset.test.ts](../../../test/solver/workshop-assignment-prototype-dataset.test.ts)
