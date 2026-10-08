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

## Organiser review presentation

The overview uses the shared header, workflow card, metric tiles, route links, filters
and collection rows. Workshops with audience `all` contribute to both audience counts.
The unscheduled metric and checkbox share one filter; the live result count describes
the intersection with audience and advisory filters. Rows show exception participation
chips, profile-timezone placement text, open-ended age labels, leader names and a
separate attendance/capacity bar with all-ranked-choice demand. Missing leaders appear
as an unknown-person count with an advisory, never as a raw leader identity.

Audience/age mismatches are advisory: adult minimum age below 16 or child maximum age
above 17. The editor warns and still allows saving. Missing or unresolved leaders also
produce advisory notes. These checks feed row notes and the inline finalisation review.
More wishes than places is information and needs no acknowledgement. Existing solver
readiness findings remain blocking. Voting stays open until the existing closing action.

Before each Festlegen attempt, one organiser may acknowledge all current advisories
for the team. The inline review shows up to five linked notes, with access to the full
filtered collection. Opening or cancelling it stages nothing; keyboard focus enters its
heading and returns to the action. A consequential confirmation does not repeat the full
result. The server records acknowledgement and closing in one atomic batch; another
Festlegen attempt requires acknowledgement again. See [phase decisions](../architecture/phases.md).

The browser print view shows the actual view, audience and selected filters, result
count and current workflow. All workflow steps expand on paper; controls disappear.
Rows paginate naturally into a text and metric column, with a continuation title and
the shared footer. The fixture contains 33 workshops; no fake page breaks or fixture
statistics enter runtime rendering.
