# UI-12 — Workshops

## Audience, purpose, and route

Organisers inspect slot capacity, rankings, assignments, and fairness signals.
Route: `/organiser/workshops`. Governing specs: [workshops](../20.4-workshops.md), [workshop rankings](../20.5-workshop-rankings.md), and [workshop assignment](../20.6-workshop-assignment.md).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Workshops                                  [Saturday morning ▼]           │
│ 24 people · 4 workshops · 2 places remain                                │
├──────────────────────────────────────────────────────────────────────────┤
│ Workshop       Capacity   Filled   Top choice   Warnings                  │
│ Pottery        8          8        6            ✓                         │
│ Hiking         10         9        5            —                         │
│ Archery        6          5        2            ⚠ 1 no top-two choice     │
├──────────────────────────────────────────────────────────────────────────┤
│ PREFERENCE HEATMAP                                                        │
│                   1st choice  2nd choice  3rd choice  assigned            │
│ Alex Morgan       Pottery      Hiking       —           Pottery             │
│ Jamie Morgan      Hiking       Archery      Pottery     Hiking             │
└──────────────────────────────────────────────────────────────────────────┘
```

Slot selection changes the view only. Capacity warnings link to affected
people; the screen does not let an organiser assign directly. Empty and
unranked states distinguish “no response” from “no workshop available”.

An Add organiser decision action opens the shared [decision form](13-constraints.md)
with the selected workshop and slot context. It can add matching, exclusion,
grouping, separation, or eligibility labels through the fixed resolver. It uses
the existing pending/apply flow and offers one optional note; applied labels show
the existing event author and timestamp. The derived assignment and findings
update through the ordinary solver.

The heatmap has a text table alternative and does not use color alone. On
On narrow screens, show one workshop card at a time followed by the ranking list.

## Neobrutalist redesign and components

Use `Sidebar`, a `Select` for slot choice, `Card` for workshop summaries, and
`Table` for the accessible heatmap. `Badge` marks capacity and ranking status;
`Tabs` switches between summary and heatmap without changing the selected slot.
Warnings use `Alert` with a glyph and sentence, never saturated color alone.
