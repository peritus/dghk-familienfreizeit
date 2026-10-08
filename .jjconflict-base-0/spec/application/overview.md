# Product scope

## What this is

A small web application composed from reusable occasion modules. A deployment
selects one occasion profile, which may assign people to rooms, workshops, or both.
The active profile is `familienfreizeit-2027`.

Families state preferences and can join sign-up workshops. Solver allocations
remain derived rather than directly assigned. A deterministic
algorithm produces a complete proposal. Organisers review it, correct family or
room configuration where needed, and later close the area to fix the reviewed result for families. Exceptional
organiser decisions remain event-backed domain capabilities but their prominent UI is
deferred. Decisions are recorded with
an optional note so other organisers can understand them.

## The shape of the problem

Three things make this harder than a seating chart:

**The assignable unit needs deciding.** Two friendly families may want to share an
apartment, while grandparents travelling with a family may want a room of their
own. The initial scope keeps one family as one indivisible placement unit, which
keeps the result reviewable. Splitting and merging families is a separate problem
and belongs to the separate sleeping-parties and child-rooms module boundary (D5).

**Preferences conflict and the conflicts are not symmetrical.** Two families both
asking to room together is a merge. One family asking to room with another is a
wish. A family requiring an ensuite is a hard constraint. A family preferring one
is worth six points. The distinction has to live in the data model, not in
someone's head.

**The plan changes until the day before.** People register late, drop out, change
their minds about who they share with. Each change means a re-run. If the
re-run shuffles forty families who had no reason to move, the plan is useless and
the organisers will go back to a spreadsheet. Stability across runs is a feature, and
it is the reason the solver is a pure deterministic function and organiser decisions
are stored as constraints rather than as edits.
