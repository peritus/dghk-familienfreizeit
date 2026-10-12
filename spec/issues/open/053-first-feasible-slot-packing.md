---
id: "053"
title: First-feasible workshop placement packs the earliest slot
status: open
severity: gap
category: module:workshop-scheduling
source: analysis of the previous-year Kurszuordnung_V2.xlsx spreadsheet
related_decisions: [D4]
related_milestones: [M8]
opened: 2026-10-12
---

# First-feasible workshop placement packs the earliest slot

## Problem

Automatic placement visits workshops in stable order and gives each the first
feasible slot/space pair, trying every space in the earliest slot before moving
to the next slot. See the
[placement loop](../../../src/modules/workshop-scheduling/index.ts#L387-L400) and
the [implemented scheduling documentation](../../../docs/modules/workshop-scheduling.md).
The earliest slot therefore fills up to the number of usable spaces before any
later slot is used.

When there are at least as many usable spaces as workshops, every workshop lands
in the earliest slot. Each person can then attend at most one workshop, however
many slots exist, because the attendance rounds reject a second workshop in an
occupied slot. This is independent of whether placement reads wishes: spreading
workshops across slots helps any person who chose more than one, while packing
them into one slot helps nobody.

## Evidence

The [previous-year fixture test](../../../test/solver/workshop-assignment-kurszuordnung-v2.test.ts)
runs 66 children's wishes for 13 courses through automatic placement with three
slots and no capacity limits:

| Spaces | Courses per slot | Children with two courses |
|---|---|---|
| 5 | 5, 5, 3 | 59 |
| 13 | 13, 0, 0 | 0 |

With thirteen spaces every course runs in the first slot, and all 66 children
receive one course. The same wishes allow 64 children two courses under the
best plan.

## Recommendation

Choose one of these, as a decision under D4's deterministic placement contract:

1. Among feasible candidates, prefer the slot with the fewest placed workshops,
   then stable order. This is a deterministic tie-break that needs no wish data
   and keeps the trace explainable.
2. Leave first-feasible placement unchanged until
   [demand-aware scheduling](../../deferred-ideas/demand-aware-workshop-scheduling.md)
   is promoted, and document the packing behaviour as a known limitation.

Either choice updates the fixture's first-feasible baseline in the same change.

## Related files

- [docs/modules/workshop-scheduling.md](../../../docs/modules/workshop-scheduling.md)
- [src/modules/workshop-scheduling/index.ts](../../../src/modules/workshop-scheduling/index.ts)
- [Kurszuordnung_V2.xlsx analysis](../../prior-art/kurszuordnung-v2.md)
- [demand-aware workshop scheduling](../../deferred-ideas/demand-aware-workshop-scheduling.md)
- [decisions.md — D4](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming)
