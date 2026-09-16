# UI-11 — Plans, diff, and publishing

## Audience, purpose, and route

Organisers compare derived plans, inspect moves, and publish the reviewed plan.
Route: `/admin/plans`; diff route: `/admin/plans/:a/diff/:b`. Governing specs:
[admin interface](../09-admin-interface.md) §7 and [publication](../01-architecture.md).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Plans                                                     [Back to board]  │
│ ┌────────┬──────────────┬──────────┬───────────────────────────────────┐ │
│ │ Plan   │ Created       │ Status   │ Actions                           │ │
│ │ #8     │ 20 Sep 14:22  │ Draft    │ [Compare] [Publish]               │ │
│ │ #7     │ 17 Sep 09:10  │ Published│ [View]                            │ │
│ └────────┴──────────────┴──────────┴───────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

The diff groups unchanged, moved, unplaced, and newly affected people. Each
move names its reason in human terms. Publish opens a confirmation showing the
plan hash, affected count, and attendee visibility consequence; errors leave
the draft untouched. An already-published plan is read-only.

## Accessibility and mobile

Use a real table with row actions and a text summary above the diff. On narrow
screens, each plan becomes a card and diff groups stack vertically. Publishing
confirmation is a full-width dialog with focus returned to Publish on cancel.
