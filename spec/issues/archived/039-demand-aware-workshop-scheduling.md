---
id: "039"
title: Demand-aware workshop scheduling should optimize co-selected wishes
status: resolved
severity: gap
category: module:workshop-scheduling
source: review of the workshop ranking, scheduling, and attendance solver pipeline
related_decisions: [D4, D31]
related_milestones: [M8]
opened: 2026-10-02
---

# Demand-aware workshop scheduling should optimize co-selected wishes

## Problem

Workshop placement and attendance allocation are currently treated as two
independent solver stages, even though they optimize one coupled outcome: how
many eligible people receive their ranked workshop wishes.

The scheduling stage places each workshop before attendance allocation runs. It
sorts workshops by `sort_key` and id, then assigns each workshop to the first
feasible slot/space pair. It considers hard placement constraints — space
occupancy and capacity, availability, blocks, capabilities, and leader
conflicts — but it does not read workshop rankings or demand. See the
[`workshop-scheduling.placement` stage](../../../src/modules/workshop-scheduling/index.ts#L200-L290).

The ranking module does calculate a demand count for every chosen workshop in
[`workshop-rankings.demand`](../../../src/modules/workshop-rankings/index.ts#L81-L107).
However, the attendance stage receives that output only to obtain `rankings`;
it does not consume the `demand` map. Its placement input is therefore already
fixed when it processes ranked choices. See the stage dependency and input
handling in [`workshop-assignment`](../../../src/modules/workshop-assignment/index.ts#L60-L90).

This can create avoidable conflicts. For example, if many people choose
workshops A and B together, placing A and B in the same slot means each person
can receive at most one of those wishes. If the same workshops could instead be
placed in different slots, the number of fulfilled wishes could increase
without changing any person's submitted ranking. The current allocator does
not rearrange rooms, workshops, or attendance after its deterministic passes,
so it cannot resolve a high-volume slot conflict.

The specification already describes demand and profile-defined scoring as
deterministic soft inputs to scheduling in
[`workshop-scheduling.md` §2](../../modules/workshop-scheduling.md#2-stages),
but the implemented scheduler does not yet consume those inputs. The current
implemented documentation correspondingly describes scheduling as independent
of attendance demand in
[`docs/modules/workshop-scheduling.md`](../../../docs/modules/workshop-scheduling.md)
and describes attendance as operating on an already placed schedule in
[`docs/modules/workshop-assignment.md`](../../../docs/modules/workshop-assignment.md).

## Why this matters

The current order can be locally valid while being globally poor:

- workshops with high demand can be assigned to the same slot even when other
  feasible slots exist;
- the scheduler does not account for pairs or groups of workshops frequently
  selected by the same people;
- a workshop's individual demand is not enough by itself, because the relevant
  signal is demand together with capacity, eligibility, and co-selection;
- attendance allocation can then report rejected or unassigned ranked choices
  caused by a placement decision that was made without seeing those choices;
- changing a slot assignment after attendance has been reviewed would affect
  the meaning of the existing attendance plan, so the calculation boundary and
  explicit recalculation/review behavior must be defined.

This is related to, but distinct from, the historical fill-origin instability
documented in [issue 037](../archived/037-workshop-assignment-fill-retention-instability.md).
The current attendance solver is stateless and recomputes from the current
derived input; this issue concerns whether the schedule itself uses the
available preference information to produce a better feasible plan.

## Evidence

- The current scheduler orders workshops by stable `sort_key` and id and chooses
  the first feasible slot/space pair; its trace reports a `stable-order` score,
  not demand or preference terms. See
  [`src/modules/workshop-scheduling/index.ts`](../../../src/modules/workshop-scheduling/index.ts#L210-L282).
- The ranking stage returns both `rankings` and `demand`, but attendance maps
  only `rankingOutput.rankings` and never reads `rankingOutput.demand`. See
  [`src/modules/workshop-assignment/index.ts`](../../../src/modules/workshop-assignment/index.ts#L66-L88)
  and [`src/modules/workshop-rankings/index.ts`](../../../src/modules/workshop-rankings/index.ts#L92-L100).
- The attendance algorithm processes ranked choices in stable Wahlrunde order
  from the current input and never displaces an earlier-round assignment.
  Under D31, none of those steps may introduce an unchosen workshop assignment,
  and none reschedules a workshop. See
  [`src/modules/workshop-assignment/index.ts`](../../../src/modules/workshop-assignment/index.ts#L174-L358).
- D4 requires hard constraints first, then maximum assigned coverage, configured
  opportunity priority, higher-ranked choices, and stable tie-breaking.
  A demand-aware scheduler would need to explain how placement scoring fits
  those priorities rather than silently changing them. See
  [`D4`](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming).
- The prototype calculation already sketches relevant signals: individual
  demand, overlap with other highly ranked workshops in a candidate slot,
  leader conflicts, and per-slot load. See the prototype's
  [`overlapScore` and placement scoring](../../html-prototypes/workshops-prototype-v16.html#L1001-L1024).

## Resolution

The agreed active feature set does not include co-selected-wish optimization.
Issue 039 is resolved as a scope correction: active scheduling uses deterministic
first-feasible placement, while ranking demand remains a derived summary for
organiser review. The detailed proposal, candidate objective, acceptance checks,
and unresolved design questions are preserved as the accepted but deferred
[demand-aware scheduling idea](../../deferred-ideas/demand-aware-workshop-scheduling.md).

No changes were made to [D4](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming)
or [D31](../../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops).

## Related files

- [modules/workshop-scheduling.md](../../modules/workshop-scheduling.md)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [modules/workshop-rankings.md](../../modules/workshop-rankings.md)
- [roadmap.md — M8](../../roadmap.md#m8--organiser-authored-workshop-programme)
- [decisions.md — D4](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming)
- [issue 037](../archived/037-workshop-assignment-fill-retention-instability.md)
- [docs/modules/workshop-scheduling.md](../../../docs/modules/workshop-scheduling.md)
- [docs/modules/workshop-assignment.md](../../../docs/modules/workshop-assignment.md)
