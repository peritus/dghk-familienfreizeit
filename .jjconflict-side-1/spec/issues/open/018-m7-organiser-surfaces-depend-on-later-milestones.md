---
id: "018"
title: M7 organiser surfaces depend on later milestones
status: needs-decision
severity: contract-contradiction
category: process
source: milestone-feasibility-review
related_decisions: [D14, D16, D24]
related_milestones: [M7, M8, M9, M11, M14]
opened: 2026-09-21
---

# M7 organiser surfaces depend on later milestones

## Problem

M7 is scheduled before family preferences (M8), workshops (M9), release control
(M11), and notifications (M14), but its organiser-screen contracts require all
four. The M7 acceptance cannot therefore establish the screens as specified
without delivering later-milestone behavior early. The current organiser-view
and family-preferences contracts make the dependency explicit by requiring
family-detail controls and workshop self-service to be available to organisers;
they do not assign those later capabilities to M7.

## Evidence

- [M7](../../roadmap.md#m7--deterministic-room-assignment)
  requires the dashboard and family detail. The [organiser view](../../application/organiser-view.md)
  and [family preferences](../../modules/family-preferences.md) require family
  detail to render the same editable preferences and workshop self-service
  controls as the family view.
- The [dashboard](../../ui/screens/organiser-dashboard.md) requires shared release
  status, workshop warnings, and reminder sending. Release status is owned by M11,
  workshop data by M9, and operational reminder delivery by M14.
- [M8](../../roadmap.md#m8--family-authentication-and-preference-controls) owns
  profile-driven family controls, [M9](../../roadmap.md#m9--workshop-programme-and-live-participation)
  owns workshop participation, [M11](../../roadmap.md#m11--release-control-and-communicated-arrangements)
  owns communicated scope status, and [M14](../../roadmap.md#m14--authentication-delivery-and-operational-email)
  owns invitation and reminder delivery.

## Recommendation

Split M7 into an organiser foundation: navigation, identity management, event
history, draft batches, generic decisions, and inventory. Mount later module
contributions only when their owning milestones are delivered, or move M7 after
the latest capability it must show. The choice must preserve D24's organiser
equivalence without making M7 claim behavior it cannot yet implement.

## Open questions

1. Should M7 be a foundation-only milestone with later module contributions added
   incrementally, or should its delivery move after M14?
2. If M7 remains early, which later capability is the first permitted dashboard
   and family-detail extension: M8 controls, M9 workshop controls, M11 release
   status, or M14 reminders?

## Related files

- [roadmap.md](../../roadmap.md)
- [organiser view](../../application/organiser-view.md)
- [organiser dashboard](../../ui/screens/organiser-dashboard.md)
- [family preferences](../../modules/family-preferences.md)
