# Workshop assignment

Attendance assignment consumes the derived current-cycle demand, one-placement
schedule, workshop modes, person roles, capacities, and profile configuration.
Under [D31](../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops),
automatic assigned-mode attendance is limited to a person's current ranked
choices; fixed and ranked assignments are the valid origins. Sign-up and
interest lists remain separate outputs and are not
converted into automatic assignments.

The active profile accepts three ranked choices and targets up to two automatic
workshops per person.
The stage emits assignments, unassigned outcomes, sign-ups, interests, fixed
decisions, fixed violations, automatic-only assignments and unassigned outcomes,
round snapshots, and explainable traces.

## Verified business logic

- An organiser's `WorkshopAttendanceFixed` decision (written on
  [official workshops](official-workshops.md)'s `workshop-attendance` label)
  is applied first, ahead of every automatic outcome, so it always claims its
  capacity and slot occupancy before ranking rounds run.
- An infeasible fixed decision (cancelled or unknown workshop, wrong
  audience/role, leader conflict, full capacity, or a same-slot conflict with
  another fixed decision) never throws and is never silently dropped — it is
  recorded in `fixed_violations` with its reason and reported as a
  `workshop-assignment.fixed-invalid` diagnostic.
- Each Wahlrunde processes the corresponding rank for every person in stable
  order. A successful earlier-round assignment is never displaced by a later
  round; a person without a feasible ranked choice remains unassigned.

The allocation review shows each fixed attendance decision beside the automatic
counterfactual produced from the same current derived input. It labels decisions
that are unchanged, replace an automatic choice, have no automatic counterpart,
or are invalid. The projection is read-only and is recalculated for prospective
local-first organiser drafts.

## Attendance cost

Attendance is resolved in deterministic Wahlrunde order over each person's
ranked choices, so its cost tracks people times choices. Three lookups used to be
resolved inside that pass and are now resolved once per stage run:

- A person's `role`, which every eligibility check needs. It was read by
  scanning the whole label array, once per candidate pair.
- A person's ranked choices, filtered and ordered once for the round pass.

The measured effect was two orders of magnitude, and the stage is now linear in
the log: at 2 367 events it costs about 3 ms, against 383 ms before. See the
[solver cost gates](../engineering/testing.md#solver-cost-gates) for what keeps
it there.
