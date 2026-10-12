---
id: "054"
title: Workshop attendance has no opportunity priority for capacity contests
status: needs-decision
severity: contract-contradiction
category: module:workshop-assignment
source: analysis of the previous-year Kurszuordnung_V2.xlsx spreadsheet
related_decisions: [D4, D31]
related_milestones: [M8]
opened: 2026-10-12
---

# Workshop attendance has no opportunity priority for capacity contests

## Problem

[D4](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming)
orders allocation as: satisfy hard constraints, maximise assigned people, "apply
the configured opportunity priority to unresolved contests", prefer
higher-ranked choices, and break remaining ties by stable entity ids. No
specification, profile parameter, or implementation defines an opportunity
priority for workshop attendance.

The attendance stage sorts people by id once and processes every Wahlrunde in
that order. See the
[person order](../../../src/modules/workshop-assignment/index.ts#L106) and the
[round loop](../../../src/modules/workshop-assignment/index.ts#L342-L344). When a
workshop has fewer places than people asking for it in a round, the people with
the lowest ids win the places, and the same people win again in every later
round. Organiser-created person ids end in
[random hex characters](../../../src/app/organiser/ids.ts), so the contest
outcome is a lottery drawn once, when a person is created, and repeated for every
contest.

## Evidence

The [previous-year fixture test](../../../test/solver/workshop-assignment-kurszuordnung-v2.test.ts)
runs 66 children's wishes under the previous year's hand-made slot plan with a
capacity of 12 per course and two courses per child:

| Person-id order | Children with 0, 1, 2 courses |
|---|---|
| As recorded (`per_kind_01` first) | 0, 22, 44 |
| Reversed (`per_kind_66` first) | 1, 19, 46 |

In the recorded order, 16 of the 22 children with fewer than two courses are in
the second half of the id order. Reversing only the ids changes the courses of
21 children, and in the reversed order one child who named a single course
receives none.

## Recommendation

Decide the opportunity priority for workshop attendance, then reconcile D4 and
the [attendance documentation](../../../docs/modules/workshop-assignment.md):

1. **Fewer assignments first.** Within each round, process people with fewer
   assignments so far before others, then by id. This favours people who lost an
   earlier contest and keeps rounds deterministic and explainable.
2. **Rotating order.** Shift the starting person by one position each round, so
   no fixed set of ids wins every round. This is simpler but does not target
   people who lost a contest.
3. **Keep id order.** Record in D4 that workshop attendance has no opportunity
   priority and resolves contests by person id, and document the lottery effect.

Options 1 and 2 keep D31's choice boundary unchanged: they reorder contests among
chosen workshops only. Any option updates the fixture's capacity expectations in
the same change.

## Open questions

1. Should the opportunity priority favour people who lost an earlier contest
   (option 1), spread wins evenly (option 2), or remain id order (option 3)?

## Related files

- [decisions.md — D4](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming)
- [decisions.md — D31](../../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops)
- [docs/modules/workshop-assignment.md](../../../docs/modules/workshop-assignment.md)
- [src/modules/workshop-assignment/index.ts](../../../src/modules/workshop-assignment/index.ts)
- [Kurszuordnung_V2.xlsx analysis](../../prior-art/kurszuordnung-v2.md)
