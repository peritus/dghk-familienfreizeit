# Workshop attendance

Module id `workshop-assignment` · factory `workshopAssignment`

## 1. Purpose and boundary

Workshop attendance assigns eligible people to directly identified, placed
workshops. It does not create workshops (owned by
[official workshops](official-workshops.md)), slots or spaces (owned by
[workshop scheduling](workshop-scheduling.md) and
[workshop space](workshop-space.md)), or rankings (owned by
[workshop rankings](workshop-rankings.md)). It decides only who attends which
already-scheduled workshop, and how an organiser's fixed decision relates to
that automatic outcome.

## 2. Dependencies

Requires `official-workshops`, `workshop-rankings`, and `workshop-scheduling`.

## 3. Parameters

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

## 4. Entity kinds

None. Attendance is decided over the `person` and `workshop` entities owned by
the kernel and by [official workshops](official-workshops.md); it introduces
no identity of its own.

## 5. Events

None. A fixed attendance decision is authored through `WorkshopAttendanceFixed`,
owned and authoritatively specified by
[official workshops](official-workshops.md) §2, because it writes that
module's `workshop-attendance` label. This module only reads the resolved
label.

## 6. Labels and trait roles

Consumes the person-scoped `workshop-attendance` label (owned by
[official workshops](official-workshops.md)): each value is a workshop id the
person is fixed into for the current cycle. No trait roles.

<a id="4-assignment-policy"></a>

## 7. Solver input and stages

One stage, `workshop-assignment.attendance`, reading
`workshop-scheduling.placement` and `workshop-rankings.demand`. It follows D4
in five steps:

1. apply feasible fixed attendance decisions first — they always take
   precedence over every automatic outcome, so they claim capacity and slot
   occupancy before anything else runs;
2. retain a still-feasible prior assignment (from the previous derived plan)
   for anyone with no fixed decision this cycle;
3. process ranked choices with configured fairness and rank weights;
4. fill eligible people up to `minimum_workshops` when `fill_unassigned` is set;
5. perform bounded deterministic repair (up to `max_repair_passes`), moving at
   most one non-fixed occupant per repair to seat a still-unassigned person,
   and explaining every movement in the trace.

The output assigns at most one workshop to a person per slot, respects
workshop capacity, records unassigned reasons, and emits traces for capacity,
overlap, leader-conflict, eligibility, cancellation, and unscheduled cases. A
repair pass never moves a `'fixed'` assignment.

## 8. Rules and scoring

Hard constraints (cancellation, participation mode, leader conflict,
eligibility, capacity, and same-slot overlap) are evaluated inline by the
stage rather than declared as a separate `Rule[]`; every rejection carries one
of the `hard.*` reason codes used in traces and violations. Ranked choices
score by `rank_weights`; fixed, retained, filled, and repaired placements
carry no rank score.

## 9. Preflight checks

None declared separately. An infeasible fixed attendance decision is reported
by the stage itself as a `workshop-assignment.fixed-invalid` diagnostic
(severity `warning`), never a thrown error or a silently dropped decision.

## 10. Output and diff

```ts
type WorkshopAssignmentSection = {
  assignments: readonly {
    person_id: string
    workshop_id: string
    slot_id: string
    rank: number | null
    reason: 'fixed' | 'retained' | 'ranked' | 'fill' | 'repaired'
  }[]
  unassigned: readonly { person_id: string; workshop_id: string | null; reason: string }[]
  signups: readonly { person_id: string; workshop_id: string }[]
  interests: readonly { person_id: string; workshop_id: string }[]
  fixed: readonly { person_id: string; workshop_id: string }[]
  fixed_violations: readonly {
    person_id: string
    workshop_id: string
    reasons: readonly string[]
  }[]
}
```

`fixed` lists every declared fixed decision verbatim; `fixed_violations` names
the ones that could not be honoured this cycle and why. Diff/review surfaces
that explain fixed-over-automatic precedence to organisers remain outstanding
(§13).

## 11. Screens, controls, reports, and emails

No screens or controls. Reports: `workshop-roster`, `workshop-person-plan`,
`workshop-family-plan`, `workshop-space-plan`. No emails.

## 12. Tests

- Deterministic allocation, retention across a stable re-derive, fairness,
  rank weighting, minimum targets, fill behavior, bounded repair, and stable
  traces.
- A fixed attendance decision takes precedence over a ranked choice for the
  same workshop.
- Conflicting fixed decisions (capacity, cancellation, eligibility, or
  overlap) surface as `fixed_violations` and a diagnostic, never a thrown
  error.
- Capacity, cancellation, eligibility, overlap, leader-conflict, and
  unscheduled cases.
- Capacity-reduction blocking ([D30](../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces))
  and reviewed-input stability.

## 13. When not selected

An unselected `workshop-assignment` contributes no stage, plan section, or
report. Sign-up and interest lists (owned by
[official workshops](official-workshops.md)) are unaffected — they were never
converted into automatic assignments in the first place.

## Outstanding

- Review/precedence-explanation UI: an organiser-facing surface that shows a
  fixed decision alongside the automatic outcome it overrides, and explains
  why. The data model above already carries everything such a surface would
  need (`fixed`, `fixed_violations`, and each assignment's `reason`).
- Organiser review surfaces for current and prospective attendance (part of
  [M8](../roadmap.md#m8--workshop-planning-completion)); released/effective
  attendance belongs to M10 release control.
- Roster, heatmap, and finding views without a second workshop state store
  (part of M8).
- Fixed *placement* decisions (which slot a workshop runs in) are a separate,
  still-outstanding mechanism owned by
  [workshop scheduling](workshop-scheduling.md); this module only covers who
  attends, not where a workshop is scheduled.
