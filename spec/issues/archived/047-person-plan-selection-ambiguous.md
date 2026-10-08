---
id: "047"
title: Person plan selection is ambiguous for duplicate names
status: resolved
severity: gap
category: ui
source: review of lists-print-fallback against main
related_milestones: [M8]
opened: 2026-10-06
---

# Person plan selection is ambiguous for duplicate names

## Problem

The organiser people-plan picker uses each person's rendered name as its entire
label. See [`personOptions`](../../../src/app/organiser/screens/workshop-reports.tsx#L84-L89).
`ListSearchInput` commits the first option whose label exactly matches the
entered text, so people with the same rendered label cannot be distinguished and
selecting the later suggestion still resolves to the first matching person. See
[`ListSearchInput`](../../../src/app/components/shared/ui/entity-picker.tsx).

The allocation trace view has the same ambiguity: it resolves the selected
person's name before using the person ID from the query. A duplicate name can
therefore make the trace show the first matching person's result even when the
URL identifies a different person. See
[`selectedPerson`](../../../src/app/organiser/screens/workshop-allocation.tsx#L102-L104).

Each people-plan option already carries a stable person ID, but the visible
label and trace lookup can discard that identity. Organisers cannot reliably
open the individual plans of people with duplicate names, and a trace link can
display the wrong person's explanation. The organiser person and family plans
are part of the workshop list surface described in [UI-12](../../ui/screens/workshops.md)
and the [workshop attendance report contract](../../modules/workshop-assignment.md).

## Resolution

Person plan picker options and allocation trace controls now preserve stable
person IDs. Duplicate names include family display context; if names still
collide, a short stable ID suffix distinguishes them, with the full ID as a
final collision fallback. The trace uses the explicit `person` query ID before
any local fallback.

Regression coverage selects both people with the same name in their person
plans and verifies that a trace URL for the second ID keeps that identity in
the picker and selected trace heading. See [workshop list tests](../../../test/app/workshop-lists.test.tsx)
and [allocation query tests](../../../test/app/workshop-allocation-query.test.tsx).
The verified behavior is documented in [frontend guidance](../../../docs/ui/frontend.md).

## Related files

- [application/reports.md](../../application/reports.md)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
