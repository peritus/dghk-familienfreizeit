---
id: "019"
title: Module delivery needs an explicit surface-staging rule
status: open
severity: gap
category: process
source: milestone-feasibility-review
related_decisions: []
related_milestones: [M4, M6, M7, M8, M9, M11, M13]
opened: 2026-09-21
---

# Module delivery needs an explicit surface-staging rule

## Problem

Several domain milestones claim user-visible screens or reports before the shared
organiser application and report framework milestones. The module contract now
distinguishes a module-owned top-level screen from content contributed to a host
screen, but the roadmap still does not say when those contributions become
renderable or which milestone owns the host. It remains unclear whether the
earlier milestones deliver a renderable surface, a declarative contribution, or
only a domain contract.

## Evidence

- [M4](../../roadmap.md#m4--inventory-and-real-occasion-data) includes the organiser inventory screen and inventory
  report contribution, while organiser application work is M7 and report routes
  and printing are M13.
- [Room inventory](../../modules/room-inventory.md) declares both the inventory
  route and a capacity report as module contributions.
- [Room assignment](../../modules/room-assignment.md) owns the assignment board
  in M6, while the organiser application is introduced in M7.
- [M9](../../roadmap.md#m9--workshop-programme-and-live-participation) and
  [M11](../../roadmap.md#m11--food-and-materials-coordination) similarly name
  organiser/family surfaces and reports before M13;
  their module contracts describe those outputs as contributions.

The current [module contract](../../modules/contract.md) provides the vocabulary
needed for a staging rule: a `screens` contribution may own a route or target an
existing host screen, and unselected contributions do not exist in the build.
That composition boundary does not establish the roadmap order or acceptance
gate for mounting the host.

## Recommendation

Define one roadmap-wide staging rule. A module milestone should either deliver its
domain behavior plus declarative surface contributions only, with the shared host
mounting them in M7, M8, or M13, or move each user-visible screen/report
acceptance criterion to the milestone that provides its host. State the testable
boundary between registering a contribution and rendering it.

## Related files

- [roadmap.md](../../roadmap.md)
- [module contract](../../modules/contract.md)
- [room inventory](../../modules/room-inventory.md)
- [room assignment](../../modules/room-assignment.md)
- [reports](../../application/reports.md)
