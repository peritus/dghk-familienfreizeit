# UI-12 — Workshops

## Audience, purpose, and route

Organisers inspect slot capacity, rankings, assignments, and fairness signals.
Route: `/admin/workshops`. Governing spec: [workshop assignment](../06-workshop-assignment.md).

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

The heatmap has a text table alternative and does not use color alone. On
narrow screens, show one workshop card at a time followed by the ranking list.
