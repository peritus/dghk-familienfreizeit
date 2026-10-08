# Workshop attendance

Module id `workshop-assignment` · factory `workshopAssignment`

## 1. Purpose and boundary

Workshop attendance assigns eligible people to directly identified, placed
workshops. Automatic attendance is choice-bound: a person may be assigned only
to a workshop in the person's current-cycle ranking. It does not create
workshops (owned by
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
  workshops_per_person: number
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
`workshop-scheduling.placement` and `workshop-rankings.demand`. It follows the
round-based attendance specialization of D4 in two steps:

1. apply feasible fixed attendance decisions first — they always take
   precedence over every automatic outcome, so they claim capacity and slot
   occupancy before anything else runs;
2. process every configured ranked choice in Wahlrunde order, respecting the
   per-person assignment target. An earlier-round assignment
   is never displaced by a later round; a person without a feasible ranked
   choice remains unassigned.

Every configured ranked choice is considered in order. `workshops_per_person`
limits automatic assignments but never creates an assignment outside the
person's ranking. An eligible person with no feasible ranked choice remains
unassigned.

The output assigns at most one workshop to a person per slot, respects
workshop capacity, records unassigned reasons, and emits traces for capacity,
overlap, leader-conflict, eligibility, cancellation, and unscheduled cases. A
later round never moves an earlier assignment or creates an unchosen assignment.

## 8. Rules and scoring

Hard constraints (cancellation, participation mode, leader conflict,
eligibility, capacity, and same-slot overlap) are evaluated inline by the
stage rather than declared as a separate `Rule[]`; every rejection carries one
of the `hard.*` reason codes used in traces and violations. Ranked choices are
processed in ascending Wahlrunde order with stable person-id order inside each
round; fixed and ranked placements are the only assignment origins. There is no
fill score, fill assignment, or post-round repair.

## 9. Preflight checks

None declared separately. An infeasible fixed attendance decision is reported
by the stage itself as a `workshop-assignment.fixed-invalid` diagnostic
(severity `warning`), never a thrown error or a silently dropped decision.

## 10. Output and diff

```ts
type WorkshopAssignmentSection = {
  initial_assignments: readonly WorkshopAssignment[]
  rounds: readonly {
    rank: number
    decisions: readonly {
      person_id: string
      workshop_id: string
      rank: number
      outcome: 'assigned' | 'fixed' | 'rejected' | 'not-needed'
      reason: string
      competing_workshop_id: string | null
    }[]
    assignments: readonly WorkshopAssignment[]
  }[]
  assignments: readonly {
    person_id: string
    workshop_id: string
    slot_id: string
    rank: number | null
    reason: 'fixed' | 'ranked'
  }[]
  unassigned: readonly { person_id: string; workshop_id: string | null; reason: string }[]
  automatic_assignments: readonly {
    person_id: string
    workshop_id: string
    slot_id: string
    rank: number | null
    reason: 'fixed' | 'ranked'
  }[]
  automatic_unassigned: readonly { person_id: string; workshop_id: string | null; reason: string }[]
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
the ones that could not be honoured this cycle and why. Review surfaces explain
fixed-over-automatic precedence by showing the fixed-aware result beside the
automatic-only result. Both are derived in memory and do not add a workshop
state store.

## 11. Screens, controls, reports, and emails

No screens or controls. Reports: `workshop-roster`, `workshop-person-plan`,
`workshop-family-plan`, `workshop-space-plan`. No emails.

## 12. Tests

- Deterministic allocation on the current derived input, repeated-solve
  stability, Wahlrunde ordering, per-person targets without implicit assignment,
  strict round snapshots, and stable traces.
- No automatic assignment targets a workshop outside the person's current
  ranking, for either children or adults.
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

- Finding and open-case review surfaces for current and prospective attendance
  remain in [M8](../roadmap.md#m8--workshop-planning-completion). Build them on
  the derived attendance results, delivered participation matrix, and traces
  without adding a second workshop state store.
