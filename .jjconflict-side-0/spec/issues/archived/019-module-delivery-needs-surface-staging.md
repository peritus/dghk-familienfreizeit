---
id: "019"
title: Module delivery needs end-to-end milestone slices
status: resolved
severity: gap
category: process
source: milestone-feasibility-review
related_decisions: []
related_milestones: [M5, M6, M7, M8, M9, M10, M11, M13]
opened: 2026-09-21
---

# Module delivery needs end-to-end milestone slices

## Problem

The roadmap separated domain modules from the organiser, family, and report
hosts that make them usable. A milestone could therefore claim a screen or
report without delivering a complete feature, leaving its acceptance boundary
ambiguous.

## Resolution

The roadmap now defines vertical delivery by intended audience. Every feature
milestone delivers its domain behavior, derived views, authorization, UI,
fixtures, and tests together. M5 and M6 are complete organiser-facing slices;
M7 is a complete organiser-controls slice; M8 and M9 remain organiser-only; M10
delivers family access and release control; and M11 owns the shared report host.
Reports are not required for earlier milestones and are not the first place a
domain feature becomes usable by its intended audience.

## Related files

- [roadmap.md](../../roadmap.md)
- [module contract](../../modules/contract.md)
- [room inventory](../../modules/room-inventory.md)
- [room assignment](../../modules/room-assignment.md)
- [reports](../../application/reports.md)
