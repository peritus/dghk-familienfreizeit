# Official workshops

The active profile derives organiser-authored `workshop` entities from the event
log. The overview route `/organiser/workshops` creates and reviews full workshop
restatements, including audience, age range, capacity, participation mode,
resolver-backed needs, and typed internal or external leaders.

The supported modes are automatic assignment, sign-up, and organiser-visible
interest. The current choice cycle is independent of schedule placement. Cancelled
workshops leave active planning but remain available in labelled history. Retiring
a workshop is an event-backed removal from the live world; historical views replay
the earlier event prefix when needed.

Capacity reductions that would put live sign-ups or recorded attendance above the
new capacity are rejected and reference issue 036. No participant is silently
evicted by a workshop edit. External leader contact labels are restricted to
organiser projections.

The module exposes typed summaries to scheduling, rankings, attendance, reports,
and the organiser UI. It does not persist a folded summary or an independent
relationship table.
