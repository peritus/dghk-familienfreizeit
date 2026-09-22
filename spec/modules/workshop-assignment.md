# Workshop attendance

Module id `workshop-assignment` · factory `workshopAssignment`

Workshop attendance assigns eligible people to scheduled workshop offerings from
their pre-schedule rankings. It does not create the schedule.

## 1. Dependencies and boundary

Requires [workshop rankings](workshop-rankings.md) and
[workshop scheduling](workshop-scheduling.md). It consumes the schedule output,
ranking input, person facts, reservations, and resolved organiser decisions.

Self-organised sessions are not attendance candidates.

## 2. Parameters

```ts
type WorkshopAssignmentParams = {
  top_n: number
  rank_weights: readonly number[]
  fill_unassigned: boolean
  max_repair_passes: number
}
```

Defaults remain `top_n = 2`, rank weights `[3, 2, 1]`, and the profile's existing
fill and bounded-repair policy.

## 3. Eligibility

```text
eligible(person, offering) :=
  person is not withdrawn
  and offering.session is official and active
  and person can attend the offering's slot
  and person meets audience, age, capacity, reservation, exclusion,
      separation, and required resolver decisions
```

Eligibility and capacity apply to retained assignments, required placements,
ranked allocation, repair, and fill. A required decision that cannot be honoured
is a conflict, never a silent bypass.

## 4. Assignment policy

The stage uses D4's stable sorted greedy policy with bounded repair:

1. retain valid previous assignments where the offering and all constraints remain valid;
2. apply feasible required decisions in deterministic source order;
3. process ranked choices in rank order, using balanced opportunity and available
   alternatives to resolve capacity contests;
4. fill remaining eligible people only when configured;
5. perform capped pairwise repair and record every movement reason.

The final result assigns at most one offering to a person per overlapping time
period. A schedule change recomputes attendance from the unchanged ranking facts;
it does not rewrite or require a new ranking round.

## 5. Output and trace

```ts
type WorkshopAttendanceSection = {
  assignments: readonly {
    person_id: string
    session_id: string
    offering_id: string
    slot_id: string
    space_id: string
  }[]
  unassigned: readonly { person_id: string, round_id: string, reason: string }[]
  conflicts: readonly { constraint_key: string, reason: string }[]
  stats: readonly {
    slot_id: string
    assigned: number
    first_choice: number
    top_n: number
    unassigned: number
  }[]
}
```

Every assignment, retention, displacement, rejection, and unassigned result has
a human-readable deterministic trace. Diff output attributes movements to
capacity, eligibility, schedule changes, fixed decisions, fairness, or ranking.

## 6. Release and screens

The module contributes per-slot workshop-allocation release scopes, attendance
diffs, roster reports, and the assignment portion of UI-12. Attendance release
requires a compatible reviewed schedule.

## 7. Tests

- Assignment never occurs before scheduling output exists.
- At most one offering is assigned per person and overlapping period.
- Valid previous assignments are retained where possible.
- Capacity, eligibility, reservations, exclusions, separation, cancellation, and
  fixed decisions hold through every path.
- Fairness and rank priorities are deterministic and shuffle-invariant.
- Schedule changes recompute from unchanged rankings and explain movements.
- Unassigned reasons, conflicts, and traces are stable and complete.
