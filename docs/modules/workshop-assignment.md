# Workshop assignment

Attendance assignment consumes the derived current-cycle demand, one-placement
schedule, workshop modes, person roles, capacities, and profile configuration.
Under [D31](../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops),
automatic assigned-mode attendance is limited to a person's current ranked
choices and shared age/audience eligibility; fixed assignments are the explicit
organizer-authored exception. Sign-up and interest lists remain separate outputs
and are not converted into automatic assignments.

The active profile accepts three ranked choices and targets up to two automatic
workshops per person.
The stage emits assignments, unassigned outcomes, sign-ups, interests, fixed
decisions, fixed violations, automatic-only assignments and unassigned outcomes,
round snapshots, and explainable traces.

## Verified business logic

- Normal family choices and ranked assignment use the same eligibility helper:
  age bounds are inclusive, age must be known, infants are excluded, and role
  restrictions for child and adult audiences apply. An ineligible choice is
  unavailable in the family chooser and rejected by automatic assignment.
- A fixed person-to-workshop decision is represented by a required generic
  `needs` label on the person paired with a matching `provides` label on the
  workshop. The workshop-assignment module interprets its namespaced tokens and
  applies those decisions before ranked choices.
- A valid fixed decision remains assigned despite age or audience/role mismatch,
  participation mode, leader conflict, capacity, same-slot overlap, or the
  automatic per-person limit. It claims capacity and slot occupancy before
  ranking rounds run, and every conflict is retained in `fixed_violations` and
  reported as a `workshop-assignment.fixed-invalid` diagnostic.
- A missing, retired, or cancelled workshop, an unresolved label pair, or a
  workshop without a scheduled placement cannot produce attendance. The decision
  remains reviewable where its labels survive and receives a corresponding
  finding; fixed attendance does not restore removed entities.
- Each Wahlrunde processes the corresponding rank for every person in stable
  order. A successful earlier-round assignment is never displaced by a later
  round; a person without a feasible ranked choice remains unassigned.

The allocation screen lets organisers add and clear a fixed attendance pair.
Its review shows each fixed decision beside the automatic counterfactual
produced from the same current derived input. It labels decisions that are
unchanged, replace an automatic choice, have no automatic counterpart, or have
conflicts. The projection and conflict review recalculate for prospective
local-first organiser drafts.

## Closing the workshop area

The module owns the `workshop-assignment.review` phase, its readiness, and the
workshop area's closed result: `WorkshopsClosed` records placements,
attendance, and unassigned people as the Worker computes them, and
`WorkshopsReopened` opens the area again. See
[phases](../architecture/phases.md#organiser-decisions).

Under [D30](../../decisions.md#d30--workshop-capacity-is-solver-input-festlegen-snapshots-the-result),
capacity and other current inputs drive a fresh solver result on each derivation.
Solver-assigned attendance can move or become unassigned; sign-ups and
organiser-authored fixed attendance remain explicit inputs. `WorkshopsClosed`
stores the current result at its event prefix. Later input edits recompute the
current plan and its difference from the closed result without changing the
snapshot.

## Workshop list reports

The organiser workshop-list projection derives four read-only document views from
the organiser world and solver plan: a workshop roster, person plan, family plan,
and room plan. It reads placements, attendance with its fixed and unassigned
outcomes, sign-ups, and interests from the solver sections, and
includes external leaders in the person plans. The projection joins
typed workshop, person, family, slot, and space identities through the existing
module summaries and solver sections; it does not persist folded report state or
add a screen-local relationship store. The roster keeps assignments and sign-ups
separate from interest counts, while person and family plans preserve free slots.

While the workshop area is closed, the lists print its closed result with live
descriptors, and the print stamp names the closing time.

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
