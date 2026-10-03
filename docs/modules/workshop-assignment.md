# Workshop assignment

Attendance assignment consumes the derived current-cycle demand, one-placement
schedule, workshop modes, person roles, capacities, and profile configuration.
Under [D31](../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops),
automatic assigned-mode attendance is limited to a person's current ranked
choices; fixed, retained, ranked, and repaired assignments are the valid
origins. Sign-up and interest lists remain separate outputs and are not
converted into automatic assignments.

The active profile uses top two ranked choices, weights `[3, 2, 1]`, a minimum of
two workshops, configured child/adult fairness targets, and five repair passes.
The stage emits assignments, unassigned outcomes, sign-ups, interests, fixed
decisions, fixed violations, and explainable traces. The minimum is a ranked
choice target only; it does not authorize assigning an unchosen workshop.

## Verified business logic

- An organiser's `WorkshopAttendanceFixed` decision (written on
  [official workshops](official-workshops.md)'s `workshop-attendance` label)
  is applied first, ahead of every automatic outcome, so it always claims its
  capacity and slot occupancy before ranking or repair run.
- An infeasible fixed decision (cancelled or unknown workshop, wrong
  audience/role, leader conflict, full capacity, or a same-slot conflict with
  another fixed decision) never throws and is never silently dropped — it is
  recorded in `fixed_violations` with its reason and reported as a
  `workshop-assignment.fixed-invalid` diagnostic.
- Anyone without a fixed decision this cycle first retains their previous
  derived assignment if it is still feasible, before ranked choices run — a
  re-derive with no new events preserves the assignment origin as `retained`
  instead of recomputing it as `ranked`.
- Bounded repair (up to `max_repair_passes`) relocates at most one non-fixed
  occupant per repair to seat a still-unassigned person using current ranked
  choices only, and never moves a `'fixed'` assignment.

No review UI exists yet for a fixed decision's precedence over the automatic
outcome it overrides — the initial surface remains automatic-only, even though
the underlying data model and resolver mechanics above are fully event-backed.
