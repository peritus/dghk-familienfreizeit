---
id: "018"
title: M7 organiser surfaces depend on later milestones
status: resolved
severity: contract-contradiction
category: process
source: milestone-feasibility-review
related_decisions: [D14, D16, D24]
related_milestones: [M7, M8, M9, M10, M14]
opened: 2026-09-21
---

# M7 organiser surfaces depend on later milestones

## Problem

M7 was scheduled before family preferences, workshops, release control, and
notifications even though its organiser-screen contracts appeared to require
all of them. Its acceptance boundary was therefore too broad.

## Resolution

M7 is now the organiser-controls milestone. It delivers profile-driven controls,
organiser family-detail editing, ordinary event drafts, local derivation,
authorization, and fixtures. Family access is deferred to M10, workshop
surfaces are delivered by M8/M9, release status by M10, and hosted reminders by
M14. The organiser controls remain equivalent to the later family controls
without claiming that family access already exists.

## Related files

- [roadmap.md](../../roadmap.md)
- [organiser view](../../application/organiser-view.md)
- [organiser dashboard](../../ui/screens/organiser-dashboard.md)
- [family preferences](../../modules/family-preferences.md)
