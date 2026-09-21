---
id: "019"
title: Module delivery needs an explicit surface-staging rule
status: open
severity: gap
category: process
source: milestone-feasibility-review
related_decisions: []
opened: 2026-09-21
---

# Module delivery needs an explicit surface-staging rule

## Problem

Several domain milestones claim user-visible screens or reports before the shared
organiser application and report framework milestones. The roadmap does not say
whether those earlier milestones deliver a renderable surface, a module
contribution, or only a domain contract.

## Evidence

- [M4](../../roadmap.md) includes the organiser inventory screen and inventory
  report contribution, while organiser application work is M7 and report routes
  and printing are M13.
- [Room inventory](../../modules/room-inventory.md) declares both the inventory
  route and a capacity report as module contributions.
- [Room assignment](../../modules/room-assignment.md) owns the assignment board
  in M6, while the organiser application is introduced in M7.
- M9 and M11 similarly name organiser/family surfaces and reports before M13;
  their module contracts describe those outputs as contributions.

## Recommendation

Define one roadmap-wide staging rule. A module milestone should either deliver its
domain behavior plus declarative surface contributions only, with the shared host
mounting them in M7, M8, or M13; or move each user-visible screen/report acceptance
criterion to the milestone that provides its host.

## Related files

- [roadmap.md](../../roadmap.md)
- [module contract](../../modules/contract.md)
- [room inventory](../../modules/room-inventory.md)
- [room assignment](../../modules/room-assignment.md)
- [reports](../../application/reports.md)
