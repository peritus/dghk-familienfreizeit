# UI-05 — Organiser dashboard

## Audience, purpose, and route

Organisers open this screen to answer “what needs attention today?” Route:
`/organiser`. Governing spec: [organiser view](../09-organiser-view.md) §2.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Organiser · Familienfreizeit   Dashboard  Families  Board  Plans  [Sign out]  │
├──────────────────────────────────────────────────────────────────────────┤
│ Dashboard                                      Last derived 14:22          │
│                                                                          │
│ PUBLISHED PLAN                                                          │
│ Plan at seq 1402 · published 3 days ago                                 │
│ 14 events since publication · 6 people would move   [Review changes →]  │
│                                                                          │
│ NEEDS ATTENTION                                                          │
│ ⚠ 19 ensuite beds required, 14 available                 [See families] │
│ ⚠ 2 constraint conflicts                                  [Inspect]      │
│ ⚠ 1 family cannot be placed                                [Open board]   │
│                                                                          │
│ CHASE LIST                                                               │
│ 8 families have not opened their invitation              [Send reminders]│
│ 5 families have not stated room preferences                             │
│                                                                          │
│ 11 active constraints                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

Warnings use text and glyphs as well as color. The empty state says “Nothing
needs attention” and still shows plan freshness and quality numbers.

## Interaction and accessibility

Cards link to the exact affected screen. Reminder sending requires confirmation
and reports a result. Keyboard users reach urgent items before quality numbers;
the heading for the attention region is announced when new findings appear.

## Neobrutalist redesign and components

Use a `Sidebar` for organiser navigation, `Card` for plan status and each urgent
group, `Badge` for plan freshness, and `Alert` for findings. Reminder sending
uses the canonical `AlertDialog` composition: `AlertDialogTrigger` + `Button`,
`AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`,
`AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, and
`AlertDialogAction`. The action description names the number of recipients.
