# Deferred ideas

This directory is the sole canonical home for accepted requirements that are
outside the active roadmap. They are not active implementation scope, and must
not be implemented until promoted. This status is distinct from a module that
is simply not selected by a particular profile.

Promotion requires explicit user scope approval, review of affected binding
decisions under [repository policy](../../AGENTS.md#documentation-and-specification),
and reinsertion into an active roadmap milestone before implementation. The
contract remains here until that promotion; it is not duplicated under an
active module path.

## Accepted but deferred module contracts

- [Call for papers](call-for-papers.md)
- [Change notifications](change-notifications.md)
- [Food preferences](food-preferences.md)
- [Materials](materials.md)
- [Self-organized sessions](self-organized-sessions.md)

## Other deferred designs

- [CSV export](csv-export.md)
- [Sleeping parties](sleeping-parties.md)
- [Child rooms](child-rooms.md)
- [Party review](party-review.md)
- [Room adjacency](room-adjacency.md)
- [Caching](re-introduce-caching.md)
- [Organiser placement overrides](organiser-placement-overrides.md)
- [Plan inspection and comparison](plan-inspection-and-comparison.md)
- [Feature availability UI](feature-availability-ui.md)
- [Demand-aware workshop scheduling](demand-aware-workshop-scheduling.md)
- [Workshop companion requests](workshop-companion-requests.md)
- [Preference and assignment progress statistics](attention-progress-statistics.md)
- [Workshop cancellation authoring and history](workshop-cancellation.md)

The `ui/` subdirectory contains non-executable TypeScript examples moved out of
the Storybook source tree. They are illustrative only and are not typechecked
or imported by the runtime.
