# Workshop attendance

Module id `workshop-assignment` · factory `workshopAssignment`

Workshop attendance assigns eligible people to directly identified, placed
workshops. It does not create workshops or slots.

## 1. Parameters

```ts
type WorkshopAssignmentParams = {
  top_n: number
  rank_weights: readonly number[]
  minimum_workshops: number
  fairness_targets: Readonly<Record<string, number>>
  fill_unassigned: boolean
  max_repair_passes: number
}
```

All values are supplied by the active profile/module configuration. The UI
renders the active values and never assumes fixed prototype constants.

## 2. Eligibility and modes

Assigned mode enters deterministic allocation. Sign-up mode exposes a live
capacity-limited list. Interest mode records a named organiser-visible list;
family sharing remains a separate privacy-scoped decision. Self-organized mode
is deferred and is not selected by the active profile.

Eligibility includes withdrawal, audience and age, slot availability,
capacity, reservation, exclusion, separation, cancellation, and resolver-backed
requirements. A required organiser decision that cannot be honoured is a
diagnostic, never a silent bypass.

## 3. Deterministic allocation

The stage follows D4:

1. retain valid prior assignments;
2. apply feasible fixed attendance decisions;
3. process ranked choices with configured fairness and rank weights;
4. fill eligible people when configured;
5. perform bounded deterministic repair and explain every movement.

The output assigns at most one workshop to a person per overlapping slot,
respects workshop capacity, records unassigned reasons, and emits traces for
capacity, overlap, leader, eligibility, cancellation, and unscheduled cases.

The domain supports fixed person-to-workshop attendance decisions even when the
initial UI exposes only automatic allocation.

<a id="4-assignment-policy"></a>
## 4. Capacity and review

A capacity reduction that would exceed current attendance is rejected outright,
per [D30](../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces).
No preservation, displacement, or configurable reduction policy is inferred.

Reviewed/frozen allocation output is derived from the reviewed event-log input
sequence. New rankings or planning edits remain prospective until explicit
recalculation/review.

## 5. Tests

- Deterministic allocation, retention, fairness, rank weighting, minimum
  targets, fill behavior, bounded repair, and stable traces.
- Fixed attendance decisions and diagnostic precedence.
- Capacity, cancellation, eligibility, overlap, leader, and unscheduled cases.
- Capacity-reduction blocking and reviewed-input stability.
