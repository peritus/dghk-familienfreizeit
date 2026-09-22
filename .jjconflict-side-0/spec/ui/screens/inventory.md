# UI-08 — Inventory

## Audience, purpose, and route

Organisers maintain buildings, rooms, beds, capacities, and capabilities. Route:
`/organiser/inventory`. Governing spec: [organiser view](../../application/organiser-view.md) §3.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Inventory                                      [Add building] [Add room]   │
│ [All buildings]                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ MAIN HOUSE                                                               │
│ Room 12 · first floor · 4 places · 2 free · private bathroom      [Edit] │
│ Room 14 · first floor · 6 places · 6 free                           [Edit]│
│                                                                          │
│ GARDEN HOUSE                                                             │
│ Room 35 · first floor · 8 places · 8 free · two-family             [Edit]│
└──────────────────────────────────────────────────────────────────────────┘
```

Add/edit dialogs validate room identity, capacity, and capabilities. Confirm
changes that affect a derived plan and show the pending-change count rather than
silently applying them.

Use table semantics for dense rows, explicit labels for capabilities, and a
At narrow widths, buildings become stacked sections and room rows become cards.

## Neobrutalist redesign and components

Use `Sidebar`, `Card` for each building,
and `Table` for room rows. Add/edit uses a `Dialog` with `Label`, `Input`,
`Select`, and `Checkbox`. Saving a change that affects the plan uses the
canonical `AlertDialog` pair of `AlertDialogCancel` and `AlertDialogAction`.
