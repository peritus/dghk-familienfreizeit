# UI-08 — Inventory

## Audience, purpose, and route

Organisers maintain buildings, rooms, beds, capacities, designations, and
capabilities. Route: `/admin/inventory`. Governing spec: [admin interface](../09-admin-interface.md) §5.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Inventory                                      [Add building] [Add room]   │
│ [All buildings] [General] [Child] [Staff] [Blocked]                     │
├──────────────────────────────────────────────────────────────────────────┤
│ MAIN HOUSE                                                               │
│ Room 12 · first floor · 4 places · 2 beds free · private bathroom [Edit] │
│ Room 14 · first floor · 6 places · 6 beds free · child room       [Edit] │
│                                                                          │
│ GARDEN HOUSE                                                             │
│ Room 35 · ground floor · 8 places · 8 beds free · two-family       [Edit]│
└──────────────────────────────────────────────────────────────────────────┘
```

Add/edit dialogs validate capacity and designation together. A blocked room
requires a reason. Confirm changes that affect a derived plan and show the
pending-change count rather than silently applying them.

Use table semantics for dense rows, explicit labels for capabilities, and a
non-color marker for blocked rooms. At narrow widths, buildings become stacked
sections and room rows become cards.

## Neobrutalist redesign and components

Use `Sidebar`, `Tabs` for building/designation filters, `Card` for each building,
and `Table` for room rows. Add/edit uses a `Dialog` with `Label`, `Input`,
`Select`, and `Checkbox`. Saving a change that affects the plan uses the
canonical `AlertDialog` pair of `AlertDialogCancel` and `AlertDialogAction`;
blocked rooms use an `Alert` plus a textual `Badge`.
