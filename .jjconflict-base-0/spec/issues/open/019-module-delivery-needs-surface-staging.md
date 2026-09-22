---
id: "019"
title: Module delivery needs end-to-end milestone slices
status: open
severity: gap
category: process
source: milestone-feasibility-review
related_decisions: []
related_milestones: [M4, M5, M6, M7, M8, M9, M10, M11, M13]
opened: 2026-09-21
---

# Module delivery needs end-to-end milestone slices

## Problem

The roadmap separates domain modules from the organiser, family, and report
hosts that make them usable. A milestone can therefore claim a screen or report
without delivering a complete feature, leaving the implementation order and
acceptance boundary ambiguous. The module contract's distinction between
top-level screens and host contributions is useful for composition, but it must
not become a second delivery plan.

## Evidence

- [M4](../../roadmap.md#m4--organiser-application-shell) previously included the organiser inventory screen and
  inventory report contribution, while organiser application work was M7 and
  report routes and printing were M13.
- [Room inventory](../../modules/room-inventory.md) declares both the inventory
  route and a capacity report as module contributions.
- [Room assignment](../../modules/room-assignment.md) owns the assignment board
  in M6, while the organiser application is introduced in M7.
- The workshop and food/materials milestones similarly named organiser/family
  surfaces and reports before their hosts existed.

The current [module contract](../../modules/contract.md) provides the vocabulary
needed for composition: a `screens` contribution may own a route or target an
existing host screen, and unselected contributions do not exist in the build.
That composition boundary does not establish the roadmap order or acceptance
gate for mounting the host.

## Recommendation

Adopt one roadmap-wide vertical-slice rule: every active feature milestone must
deliver its domain model, derivation, authorisation, UI, report contribution,
fixtures, and tests as one usable feature. Shared hosts and report/print
infrastructure must precede the first feature that uses them. A contribution
registration is not accepted until a selected-profile fixture renders it through
the relevant host. A later reports milestone may add cross-feature catalogue and
print polish, but it may not be the first place a feature becomes usable.

## Related files

- [roadmap.md](../../roadmap.md)
- [module contract](../../modules/contract.md)
- [room inventory](../../modules/room-inventory.md)
- [room assignment](../../modules/room-assignment.md)
- [reports](../../application/reports.md)
