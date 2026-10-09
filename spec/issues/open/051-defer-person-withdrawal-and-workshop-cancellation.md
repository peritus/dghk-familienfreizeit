---
id: "051"
title: Defer person withdrawal and workshop cancellation behavior
status: needs-decision
severity: gap
category: kernel
source: user scope review
related_decisions: [D24, D27]
related_milestones: [M8, M10]
opened: 2026-10-09
---

# Defer person withdrawal and workshop cancellation behavior

## Problem

Person withdrawal and workshop cancellation have runtime behavior even though
the requested product scope is to defer both. Removing their UI actions alone
would leave event, derivation, authorization, and solver behavior active.

`PersonWithdrawn` is a kernel event that removes a person and all their labels
from the live derived world. The organiser family-detail screen offers a
destructive “Person entfernen” action. Authorization also permits a family
principal to emit the event for its own person, though no family-screen action
was found. D24 names withdrawal as an active person-management action, and D27
uses `PersonWithdrawn` as an example of hard removal. M10 also asks for a
withdrawn-person fixture. See [the event contract](../../architecture/events.md#personwithdrawn),
[D24](../../decisions.md#d24--every-family-self-service-action-has-an-organiser-equivalent),
[D27](../../decisions.md#d27--entities-and-labels-are-hard-removed-on-retirementclear-history-is-re-derived-not-tombstoned),
and [M10](../../roadmap.md#m10--family-access-and-release-control).

`WorkshopCancelled` has no organiser authoring control. Its event and derived
state are active, however: cancelled workshops leave planning and family choice
lists, and attendance review reports cancellation findings. The existing
[deferred contract](../../deferred-ideas/workshop-cancellation.md) defers only
the authoring action and history view; it describes the event and solver
behavior as already active. See the [implemented workshop behavior](../../../docs/modules/official-workshops.md)
and [workshop attendance contract](../../modules/workshop-assignment.md).

M8's phrase “individual attendance cancellation” has no corresponding event or
implemented behavior in this code. It must not be silently equated with
`PersonWithdrawn` or `WorkshopCancelled` while deferring these two features.
See [the M8 reconciliation item](../../modules/workshop-assignment.md#m8--findings-open-cases-and-contract-reconciliation).

## Recommendation

Defer both capabilities and remove their active runtime behavior in one scoped
change:

1. Move person withdrawal requirements into a new accepted deferred idea. Remove
   the `PersonWithdrawn` event, authorization path, hard-removal fold behavior,
   and organiser action. Remove its active M10 fixture requirement. Review D24
   so it no longer requires withdrawal as an active family-authored action, and
   retain D27's general hard-removal principle without presenting
   `PersonWithdrawn` as an active event.
2. Expand the existing workshop-cancellation deferred contract to include the
   event-backed cancellation state and its derived effects. Remove
   `WorkshopCancelled` from active event handling, workshop projections,
   attendance checks, and family choice filtering. Keep `WorkshopRetired`
   behavior unchanged.
3. Leave M8's individual-attendance-cancellation term as a separate unresolved
   contract disposition; do not map it to either deferred feature.

This is a proposed scope change. The affected decisions and dependent documents
must be reviewed before changing them.

## Open questions

1. Should D24 be revised so person withdrawal is outside active family
   self-service until explicitly promoted? Recommendation: yes; retain the
   general organiser-equivalent rule for actions that remain active.
2. Should D27 retain its general hard-removal rule while dropping
   `PersonWithdrawn` as an active event example? Recommendation: yes; other
   retirement and label-clear behavior continues to use that rule.

## Related files

- [decisions.md](../../decisions.md)
- [architecture/events.md](../../architecture/events.md)
- [roadmap.md](../../roadmap.md)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [deferred workshop cancellation contract](../../deferred-ideas/workshop-cancellation.md)
- [deferred ideas index](../../deferred-ideas/README.md)
- [official workshops documentation](../../../docs/modules/official-workshops.md)
- [workshop attendance documentation](../../../docs/modules/workshop-assignment.md)
- [organiser view documentation](../../../docs/application/organiser-view.md)
