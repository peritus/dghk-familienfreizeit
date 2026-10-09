# Official workshops

The active profile derives organiser-authored `workshop` entities from the event
log. The overview route `/organiser/workshops` creates and reviews full workshop
restatements, including audience, age range, capacity, participation mode,
resolver-backed needs, and typed internal or external leaders.

Each active workshop row offers **Löschen** through the shared confirmation dialog.
Dismissal returns keyboard focus to that action; confirming deletion moves focus
to the page heading once the workshop row disappears.
Confirming stages `WorkshopRetired` through the ordinary organiser event pipeline.
The prospective workshop disappears immediately; discarding that draft restores
the committed view. Retirement removes the live workshop and its own labels under
[D27](../../decisions.md#d27--entities-and-labels-are-hard-removed-on-retirementclear-history-is-re-derived-not-tombstoned),
while the event log remains available for prefix replay. Existing wishes,
sign-ups, interests, and fixed attendance facts are retained. The solver reports
unassigned ranked people and invalid fixed attendance decisions for the removed
workshop. A surviving configured resolver constraint that references the workshop
causes the append boundary to reject retirement; the ordinary organiser apply
error path exposes that failure without persisting the removal.

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
labelled cancellation-history view; that organiser surface is
[accepted but deferred](../../spec/deferred-ideas/workshop-cancellation.md).
Retiring a workshop removes it from the live world; historical views replay the
earlier event prefix when needed.

Capacity reductions that would put live sign-ups or matched fixed-attendance
`needs`/`provides` pairs above the new capacity are rejected outright, per D30.
Attendance is counted by person, so a sign-up and fixed decision for the same
person do not count twice. No participant is silently evicted by a workshop edit.
Workshop capacity summaries use the unique union of assignments and sign-ups;
interest totals remain separate, while a fixed attendee consumes capacity in any
participation mode.
External leader contact labels are restricted to organiser projections.

Organisers author fixed person-to-workshop attendance on the allocation screen.
Each decision writes a required `needs` label on the person and a matching
`provides` label on the workshop, using a stable token scoped to that pair. The
resolver continues to treat these as generic labels; workshop assignment
interprets its tokens as fixed attendance. The same screen can clear both labels.
Age and audience rules still govern family choices and ranked assignment;
fixed attendance can override those and other assignment checks. The solver
keeps the decision and reports its conflicts. A retired or cancelled workshop
or an active workshop without a scheduled placement cannot produce an attendance
assignment.

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
