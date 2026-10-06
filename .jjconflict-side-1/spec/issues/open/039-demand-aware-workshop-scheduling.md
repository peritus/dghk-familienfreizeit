---
id: "039"
title: Demand-aware workshop scheduling should optimize co-selected wishes
status: needs-decision
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

## Recommendation

Add a deterministic, demand-aware placement calculation that evaluates workshop
placements together with their likely attendance consequences. Keep it within
the repository's reviewable bounded-greedy model rather than introducing an
opaque integer-programming or CP-SAT dependency.

The recommended shape is:

1. Build a demand input from current-cycle rankings, including at least each
   workshop's demand by rank and the eligible co-selection pairs or groups.
2. Preserve organiser-fixed placements and reject candidate placements that
   violate hard constraints.
3. Place the remaining workshops in a deterministic priority order, such as
   fixed decisions first, then constrained/high-impact workshops, then stable
   ids.
4. Score each feasible candidate slot/space using explicit profile terms. The
   score should penalize:
   - placing frequently co-selected workshops in the same slot;
   - placing high-demand workshops in a slot that makes many first choices
     compete with one another;
   - avoidable leader conflicts or concentration of programme load, where those
     are not already hard constraints.
5. After placement, run the strict Wahlrunde attendance allocation and calculate
   the resulting objective. A placement change requires a fresh allocation from
   the current schedule; attendance does not perform a post-round repair pass.
6. Emit trace terms that explain why a workshop was assigned to its slot and
   which demand/co-selection trade-offs were considered.

The objective should be explicit and lexicographic rather than a single opaque
number. A proposed initial ordering is:

1. satisfy hard placement and attendance constraints;
2. preserve fixed placement and attendance decisions;
3. maximize the number of people receiving at least one eligible assigned
   workshop;
4. maximize the number of fulfilled ranked wishes, with first choices ahead of
   second and later choices according to configured weights;
5. maximize the number of people reaching the configured
   `workshops_per_person` target;
6. use stable ids to resolve all remaining ties.

The final choice of objective ordering, score weights, movement policy, and review
boundary must be recorded as an accepted decision before implementation. The
active profile should own those parameters; they should not be supplied as
runtime executable rules.

## Acceptance criteria

- A solver fixture contains at least two feasible slots and a set of workshops
  with a deliberately high co-selection rate. The demand-aware result places
  the co-selected workshops in different slots when that increases the
  objective and does not violate hard constraints.
- The resolver can demonstrate, in a before/after comparison over the same
  event-log input, that demand-aware placement fulfills more ranked wishes than
  stable first-feasible placement for the fixture.
- The objective counts rank quality explicitly: a plan with more first choices
  wins over one with only more lower-ranked choices when the configured
  lexicographic policy says so.
- Workshop capacity, audience eligibility, one assignment per person per slot,
  leader conflicts, room capabilities, availability, blocks, cancellation,
  and fixed placement/attendance precedence remain enforced.
- Fixed placement decisions and fixed attendance decisions are never moved by
  demand-aware reassignment. Their conflicts remain explainable diagnostics.
- Re-solving the same derived input is deterministic, including placement,
  attendance, objective values, traces, and tie-breaking.
- A result families see remains stable when rankings change until an organiser
  closes the workshop area again, consistent with the closed-result boundary in
  [phases](../../architecture/phases.md).
- The plan and trace expose enough information for an organiser to understand
  why a high-demand or frequently co-selected workshop was placed where it was,
  and why a requested move was rejected.
- A regression fixture covers the case where demand-aware placement improves
  fulfilled wishes but must not displace a fixed workshop or fixed attendee.
- Documentation distinguishes demand used for scheduling from demand merely
  displayed in a summary, and records the measurable objective and its limits.

## Open questions

1. Should the first implementation optimize only workshop placement, or should
   it jointly search placement and attendance outcomes? Placement-only scoring
   is simpler, while joint evaluation measures the actual user-facing result
   but has a larger search space.
2. Should demand include all configured ranks or only ranks that can still
   produce an assignment before a person's configured target is reached? The
   attendance solver processes every configured rank, but placement may still
   choose a narrower demand horizon.
3. Should pairwise co-selection be enough, or should the calculation include
   larger frequently selected groups? Pairwise scoring is easier to explain and
   bound; larger groups may better represent real preference patterns.
4. How should capacity affect placement priority? A high-demand workshop whose
   capacity is already sufficient may matter less than a smaller workshop with
   severe demand pressure.
5. What movement budget is permitted for a future demand-aware placement search,
   and how is it reconciled with D4's deterministic placement contract?
6. Does a ranking edit invalidate the current reviewed placement/attendance
   calculation, or should demand-aware recalculation always be an explicit
   organiser action with a visible plan diff?
7. Is this work part of M8's workshop planning completion, or should the
   demand-aware calculation become a separately scoped milestone because it
   changes the scheduling/attendance contract?

## Related files

- [modules/workshop-scheduling.md](../../modules/workshop-scheduling.md)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [modules/workshop-rankings.md](../../modules/workshop-rankings.md)
- [roadmap.md — M8](../../roadmap.md#m8--organiser-authored-workshop-programme)
- [decisions.md — D4](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming)
- [issue 037](../archived/037-workshop-assignment-fill-retention-instability.md)
- [docs/modules/workshop-scheduling.md](../../../docs/modules/workshop-scheduling.md)
- [docs/modules/workshop-assignment.md](../../../docs/modules/workshop-assignment.md)
