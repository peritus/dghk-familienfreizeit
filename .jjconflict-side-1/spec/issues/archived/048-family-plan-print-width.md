---
id: "048"
title: Family workshop plans can exceed printable page width
status: resolved
severity: gap
category: ui
source: review of lists-print-fallback against main
related_decisions: [D21]
related_milestones: [M11, M13]
opened: 2026-10-06
---

# Family workshop plans can exceed printable page width

## Problem

The family plan table creates one column per family member, and each member
value cell has a minimum width of `8em`. See
[`FamilyPlanTable`](../../../src/app/organiser/components/workshop/reports.tsx#L298-L316).
Workshop lists print on A4 portrait pages with 12 mm margins
([page rule](../../../src/app/globals.css#L801-L804)); the family table uses
`0.9em` text against the print stylesheet's 10 pt base
([family table rule](../../../src/app/globals.css#L942-L944)
and [font rule](../../../src/app/globals.css#L827-L833)). This leaves 186 mm of
page width. Eight member columns at 8em each need about 203 mm before the
required Slot column, so the table cannot fit that page. Seven member columns
already use about 178 mm, leaving only about 8 mm for the Slot column, borders,
and spacing.

For larger families, browser printing can therefore overflow the printable
area, clip columns, or shrink the table until its names and workshop values are
hard to read. This falls short of the [reports print contract](../../application/reports.md),
which requires legible browser output on common A4 paper in portrait or
landscape as appropriate.

## Resolution

Family plan print output now uses the existing labelled slot cards on A4
portrait paper, while the screen keeps its responsive table/card behavior. Each
slot card is kept together across printed pages. A browser fixture with eight
family members verifies the wide-screen table, print card layout, all member
names and slot content, and a generated PDF. See the [browser print test](../../../test/browser/workshop-family-plan-print.spec.ts)
and [frontend guidance](../../../docs/ui/frontend.md).

## Related files

- [application/reports.md](../../application/reports.md)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
