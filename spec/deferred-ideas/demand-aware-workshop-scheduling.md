# Demand-aware workshop scheduling

This accepted proposal is deferred from the active feature set. Active workshop
scheduling does not optimize placements from individual demand or co-selected
wishes. The ranking module's demand summaries are available for organiser review;
the current scheduler follows its deterministic first-feasible placement
contract. This document preserves a possible future design and is not active
implementation scope.

Promotion requires explicit user scope approval, review of affected binding
decisions including [D4](../../decisions.md#d4--stable-sorted-greedy-not-integer-programming)
and [D31](../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops),
and reinsertion into an active roadmap milestone before implementation.

## 1. Motivation

Placement and attendance are coupled in their effect on ranked wishes. The
current scheduler places each workshop before attendance allocation and selects
the first feasible slot/space candidate in stable order. Attendance then
processes ranked choices in strict rounds. If many eligible people choose two
workshops together, putting those workshops in the same slot can make the
person receive at most one of those wishes even when another feasible schedule
could separate them.

Individual demand alone does not describe that conflict. A future calculation
could consider per-rank demand together with eligible co-selection, workshop
capacity, audience, and the feasible slots and spaces. It would measure whether
the resulting schedule improves attendance without weakening hard constraints
or the rule that automatic attendance may use only a person's chosen workshops.

## 2. Candidate inputs and ownership

The candidate calculation would use derived current-cycle ranking information,
not raw event payloads. Possible inputs include:

- demand for each workshop by rank and eligible audience;
- eligible person pairs or groups that selected multiple workshops;
- workshop capacity and eligibility;
- feasible slots, spaces, capabilities, availability, leader constraints, and
  explicit blocks;
- fixed placement and fixed attendance decisions.

Demand and co-selection would remain derived summaries. They would not become
persisted domain state, a new workshop identity, or a second attendance store.
The ranking module would own the choice summary; scheduling would own placement;
attendance would continue to own person-to-workshop assignments.

## 3. Possible calculation shape

One candidate is a bounded, deterministic placement search:

1. Apply valid fixed placements first and preserve them. Reject candidates that
   violate hard placement constraints.
2. Order remaining workshops deterministically, taking constrained or
   high-impact workshops into account before stable identity tie-breaks.
3. Score each feasible slot/space candidate with explicit terms. Candidate
   terms could penalize frequently co-selected workshops sharing a slot,
   first-choice competition, and avoidable concentration of programme load.
4. Run the strict attendance rounds against the resulting schedule to measure
   the actual user-facing outcome. A schedule change triggers a fresh
   attendance calculation; attendance does not repair placements or displace an
   earlier-round assignment.
5. Explain selected placements and rejected alternatives with deterministic
   trace terms.

This is only a candidate shape. The final search boundary, movement budget, and
score terms remain open. Any profile parameters must be declarative data, never
runtime executable rules. An opaque ILP or CP-SAT objective is outside this
proposal's reviewability goal.

## 4. Candidate objective

An initial objective hypothesis is lexicographic rather than one opaque score:

1. satisfy hard placement and attendance constraints;
2. preserve fixed placement and attendance decisions;
3. maximize the number of people receiving at least one eligible assigned
   workshop;
4. maximize fulfilled ranked wishes, with higher-ranked choices ahead of lower
   ranks according to an agreed policy;
5. maximize the number of people reaching the configured
   `workshops_per_person` target;
6. use stable entity IDs to resolve remaining ties.

This ordering is a proposal, not a decision. Before promotion it must be
reconciled with the active [D4 allocation priority](../../decisions.md#d4--stable-sorted-greedy-not-integer-programming).
The active [D31 choice boundary](../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops)
continues to prohibit automatic assignments to unchosen workshops.

## 5. Evidence from the previous year's spreadsheet

The previous year's course plan was built by hand in a spreadsheet, analysed in
[Kurszuordnung_V2.xlsx](../prior-art/kurszuordnung-v2.md). Its wish data is the
[`kurszuordnung-v2.kdl` fixture](../../test/fixtures/workshop-assignment/kurszuordnung-v2.kdl):
66 children, 13 courses, three slots, and up to three ordered wishes each.
[`workshop-assignment-kurszuordnung-v2.test.ts`](../../test/solver/workshop-assignment-kurszuordnung-v2.test.ts)
runs it through the current stages without capacity limits and with two
courses per person:

| Placement | Children with two courses | Of those, first and second wish |
|---|---|---|
| First-feasible, thirteen spaces | 0 | 0 |
| First-feasible, five spaces | 59 | 39 |
| Hand-made spreadsheet plan, as fixed placements | 61 | 48 |
| Best plan from exhaustive search, as fixed placements | 64 | 55 |

Sixty-four is the ceiling: the other two children named a single course. The
same wishes therefore produce between 59 and 64 children with two courses
depending only on placement, and the attendance rounds cannot recover a
placement loss.

The evidence also bounds the objective. The spreadsheet scored plans by how many
of each child's three wishes fall in distinct slots. The plan that maximises that
score gives only 60 children two courses, because it optimises third courses
the two-course target never assigns. A placement objective must be derived from
the configured `workshops_per_person` and the attendance rules, not from wish
coverage alone.

Thirteen courses in three slots allow an exhaustive search of 531,441 plans. The
33-workshop prototype dataset does not, so a promoted search needs a bounded
heuristic. The spreadsheet's manual method suggests its seed: separate the most
frequently co-selected pairs and spread first-choice demand across slots, then
improve by evaluating the attendance outcome.

## 6. Single placement path

Demand-aware placement, if promoted, belongs in the existing
`workshop-scheduling.placement` stage. A separate suggestion path, such as a
button that computes an alternative plan outside the solver, is rejected: two
ways to arrive at a plan would give organisers and families two answers to why a
workshop runs in a slot. The derived plan is computed by the same stage in the
browser's prospective world and in the Worker when the area is closed, so a
single path also keeps those results identical.

Fixed placements remain the only organiser override of the stage's choice.

## 7. Plan score in the placement review

The spreadsheet's most effective feature was one score that changed as soon as
the plan changed. A promoted placement review should show, for the current
derived plan:

- the number of people who reach the configured `workshops_per_person` target;
- of those, the number assigned their highest-ranked choices;
- the number of co-selected pairs that share a slot, and the people affected;
- workshops whose demand is very low compared with the other workshops.

Co-selected pairs should be visible before placement as well, ordered by the
number of people who chose both, not only after they collide in a slot.

## 8. Work budget

Because the stage also runs in the Worker, a placement search needs a fixed,
deterministic work budget that does not depend on wall-clock time. The budget
should be enforced by the same kind of counted gate as the existing
[solver cost gates](../../docs/engineering/testing.md#solver-cost-gates), and the
search must return the same plan for the same input regardless of where it runs.

## 9. Preserved acceptance checks

If promoted, fixtures and review should demonstrate that:

- a case with at least two feasible slots and frequently co-selected workshops
  separates those workshops when that improves the agreed objective and keeps
  all hard constraints;
- a before/after calculation over the same event-log input shows the resulting
  change in fulfilled wishes, including rank quality;
- capacity, audience eligibility, one assignment per person per slot, leader
  conflicts, capabilities, availability, blocks, cancellation, and fixed
  placement/attendance precedence remain enforced;
- fixed decisions never move silently and any conflict remains explainable;
- repeated solves of the same derived input produce identical placements,
  attendance, objective values, traces, and tie-breaks;
- reviewed results remain stable when rankings change until the agreed explicit
  recalculation and review boundary;
- organisers can understand the demand/co-selection trade-offs and why a
  requested move was rejected.
- the [previous-year fixture](../../test/solver/workshop-assignment-kurszuordnung-v2.test.ts)
  reaches 64 people with two courses under automatic placement, at least the
  61 of the hand-made plan, with its first-feasible baseline updated in the
  same change;
- the placement search stays within its counted work budget for the
  33-workshop prototype dataset.

## 10. Open questions

1. Should the search optimize workshop placement only, or evaluate placement
   together with likely attendance outcomes?
   Evidence: on the previous-year data, the best placement-only score gives 60
   people two courses, against 64 when plans are compared by attendance outcome
   ([section 5](#5-evidence-from-the-previous-years-spreadsheet)).
2. Should demand include all configured ranks or only ranks that can contribute
   before a person's configured target is reached?
   Evidence: counting every rank toward distinct slots optimised third courses
   that a two-course target never assigns.
3. Are pairwise co-selection counts enough, or should larger frequently chosen
   groups be included?
   Evidence: pairwise counts were enough to reach the top five percent of plans
   by hand. The three children the hand-made plan missed chose three courses
   that share one slot, which an attendance-based evaluation detects without
   group counts.
4. How should workshop capacity affect placement priority when demand exceeds
   available seats?
5. What movement budget is permitted, and how does it fit the deterministic
   placement contract in D4?
6. Does a ranking edit invalidate the reviewed placement/attendance result, or
   should recalculation always be an explicit organiser action with a visible
   plan comparison?
7. Does this belong in a later workshop-planning milestone or a separate
   milestone because it changes the scheduling/attendance contract?
