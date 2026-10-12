# Room assignment

The selected `room-assignment` module is implemented. Its current solver,
organiser board, fixed-assignment workflow, browser-print output, diagnostics, and
verification are documented in [room assignment](../../docs/modules/room-assignment.md).
The event log remains the only persisted domain state.

## Remaining scope

- Plan inspection and comparison are accepted but deferred in
  [plan inspection and comparison](../deferred-ideas/plan-inspection-and-comparison.md).
- Family and shared report projections from closed accommodation results remain
  in the [family access](../roadmap.md#m10--family-access-and-release-control)
  and [report host](../roadmap.md#m11--reports-and-browser-printing-host)
  milestones. Accommodation closing, reopening, review, and the organiser track
  are already implemented; see [phases](../architecture/phases.md).

## Separate placement models

<a id="1-purpose-and-boundary"></a>

Sleeping parties and child rooms remain separate deferred modules:

- [Sleeping parties](../deferred-ideas/sleeping-parties.md)
- [Child rooms](../deferred-ideas/child-rooms.md)

Selecting either module changes the placement input and requires a coordinated
profile, solver, board, report, and fixture update.
