---
id: "018"
title: M7 organiser surfaces depend on later milestones
status: needs-decision
severity: contract-contradiction
category: process
source: milestone-feasibility-review
related_decisions: [D14, D16, D24]
opened: 2026-09-21
---

# M7 organiser surfaces depend on later milestones

## Problem

M7 is scheduled before family preferences (M8), workshops (M9), release control
(M12), and notifications (M14), but its organiser-screen contracts require all
four. The M7 acceptance cannot therefore establish the screens as specified
without delivering later-milestone behavior early.

## Evidence

- [M7](../../roadmap.md) requires the dashboard and family detail. The
  [organiser view](../../application/organiser-view.md) requires family detail to
  render the same editable preferences and workshop self-service controls as the
  family view.
- The [dashboard](../../ui/screens/organiser-dashboard.md) requires shared release
  status, workshop warnings, and reminder sending. Release status is owned by M12,
  workshop data by M9, and operational reminder delivery by M14.
- [M8](../../roadmap.md) owns profile-driven family controls, [M9](../../roadmap.md)
  owns workshop participation, [M12](../../roadmap.md) owns communicated scope
  status, and [M14](../../roadmap.md) owns invitation and reminder delivery.

## Recommendation

Split M7 into an organiser foundation: navigation, identity management, event
history, pending batches, generic decisions, and inventory. Deliver feature cards
and family-detail controls with their owning modules, or move M7 after the latest
capability it must show.

## Open questions

1. Should M7 be a foundation-only milestone with later module contributions added
   incrementally, or should its delivery move after M14?
2. If M7 remains early, which later capability is the first permitted dashboard
   and family-detail extension: M8 controls, M9 workshop controls, M12 release
   status, or M14 reminders?

## Related files

- [roadmap.md](../../roadmap.md)
- [organiser view](../../application/organiser-view.md)
- [organiser dashboard](../../ui/screens/organiser-dashboard.md)
- [family preferences](../../modules/family-preferences.md)
