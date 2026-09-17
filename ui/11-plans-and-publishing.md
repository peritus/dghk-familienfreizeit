# UI-11 — Plans, diff, and publishing

## Audience, purpose, and route

Organisers compare derived plans, inspect moves, and publish the reviewed plan. A
plan has no id: it is identified by the input sequence it was derived at, together
with `config_hash` and `code_revision` ([architecture](../01-architecture.md)).
Route: `/organiser/plans`; diff route: `/organiser/plans/:a/diff/:b`, where `:a`
and `:b` are input sequences. Governing specs:
[organiser view](../09-organiser-view.md) §1 and [publication](../01-architecture.md).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Plans                                                     [Back to board]  │
│ ┌──────────┬───────────────┬────────────┬───────────────────────────────┐│
│ │ Input seq│ Latest event   │ State      │ Actions                       ││
│ │ 1482     │ 20 Sep 14:22   │ Current    │ [Compare] [Publish]           ││
│ │ 1402     │ 17 Sep 09:10   │ Published  │ [View]                        ││
│ └──────────┴───────────────┴────────────┴───────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

The rows are the current plan and the publication history, not stored records: each
one re-derives from its input sequence. The diff groups unchanged, moved, unplaced,
and newly affected people, and each move names its reason in human terms. Publish
opens a confirmation showing the plan hash, the affected count, any error findings
that must be acknowledged, and the family visibility consequence. A refused publish
changes nothing.

## Accessibility and mobile

Use a real table with row actions and a text summary above the diff. On narrow
screens, each plan becomes a card and diff groups stack vertically. The publish
confirmation is a full-width dialog with focus returned to Publish on cancel.

## Neobrutalist redesign and components

Use `Sidebar`, `Table`, `Card`, `Badge`, and `Button` for plan navigation and
rows. Diff categories use `Tabs` and `Alert` summaries with text labels, and error
findings to acknowledge appear as `Checkbox` rows in the publish dialog.
Publish uses the canonical Alert Dialog component family:
`AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`,
`AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`,
`AlertDialogCancel`, and `AlertDialogAction`; the description includes plan
hash and affected count.
