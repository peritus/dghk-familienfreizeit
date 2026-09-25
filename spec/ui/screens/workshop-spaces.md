# UI-14 — Workshop spaces

## Audience, purpose, and route

Organisers maintain the physical spaces that a future workshop schedule may
use. Route: `/organiser/workshop-spaces`. Governing spec: [workshop-space](../../modules/workshop-space.md)
§§5, 7, and 11 and [organiser view](../../application/organiser-view.md) §1.

This is an inventory screen, not schedule review. It never displays a family
location or implies that a space is part of the communicated programme.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Workshop spaces                              [Add workshop space]         │
│ [All] [Available now] [Retired]                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ Space              Capacity  Availability             Capabilities  Order  │
│ Main hall          24        Sat 08:00–18:00           accessible    1 [Edit]│
│ Garden studio      12        Sat 10:00–16:00           outdoor       2 [Edit]│
└──────────────────────────────────────────────────────────────────────────┘
```

Add and edit use full restatement fields: name, location description,
non-negative physical capacity, ordered non-overlapping availability windows,
and deterministic order. Capability labels use the existing resolver
`provides` mechanism and accept generic organiser values. Retiring a space
requires confirmation and a reason; history remains visible while the space is
removed from future scheduler input.

Changes use the ordinary local-first organiser pipeline; immediate mode applies them
automatically and drafting mode exposes them through the shared draft apply/discard flow.
Invalid capacity,
timestamps, ordering, overlap, and touching windows are shown inline and block
the event batch. The screen does not add a schedule assignment, choose a
workshop, or edit attendance.

At narrow widths the table becomes one labelled card per space. Availability
windows and capability values remain text-readable, and retired state uses a
text label in addition to any visual marker.

## Neobrutalist redesign and components

Use `Sidebar`, `Tabs` for live/retired filters, `Table` on wide screens, and
`Card` rows on narrow screens. Add/edit uses a `Dialog` with `Label`, `Input`,
`Textarea`, a repeatable availability-window row, and `Button`. Retirement uses
the canonical `AlertDialog` pair and keeps the reason visible in the history.
