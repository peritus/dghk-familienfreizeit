# Official workshops

The active profile derives organiser-authored `workshop` entities from the event
log. The overview route `/organiser/workshops` creates and reviews full workshop
restatements, including audience, age range, capacity, participation mode,
resolver-backed needs, and typed internal or external leaders.

The `/organiser/workshops/external-leaders` view follows the workshop authoring
pattern for external leaders: it lists each external leader with an explicit external
badge, organiser-only phone metadata, linked workshops, and derived slot
availability. The add/edit dialog stages complete `ExternalLeaderAdded` or
`ExternalLeaderUpdated` restatements and requires at least one available slot.
External leaders can then be selected by typed identity in the workshop editor.

The supported modes are automatic assignment, sign-up, and organiser-visible
interest. The current choice cycle is independent of schedule placement. The
`WorkshopCancelled` event removes a workshop from active planning while preserving
its event history. The organiser UI currently has no cancellation action or
labelled cancellation-history view; both remain in [M8](../../spec/roadmap.md#m8--organiser-authored-workshop-programme).
Retiring a workshop removes it from the live world; historical views replay the
earlier event prefix when needed.

Capacity reductions that would put live sign-ups or recorded attendance above the
new capacity are rejected outright, per D30. No participant is silently
evicted by a workshop edit. External leader contact labels are restricted to
organiser projections.

The event model supports fixed person-to-workshop attendance through
`WorkshopAttendanceFixed`, a full restatement of the person's fixed workshop
set (an empty set clears it) that writes the person-scoped `workshop-attendance`
label. The current organiser UI reviews fixed attendance but provides no control
to author or clear it; whether that control is in scope is under
[investigation](../../spec/issues/open/050-workshop-fixed-decision-authoring.md).
Append validation only checks that the person and every workshop exist;
[workshop attendance](workshop-assignment.md) evaluates whether the decision is
actually feasible and reports an infeasible one as a solver diagnostic rather
than a rejected event.

The module exposes typed summaries to scheduling, rankings, attendance, reports,
and the organiser UI. It does not persist a folded summary or an independent
relationship table.
