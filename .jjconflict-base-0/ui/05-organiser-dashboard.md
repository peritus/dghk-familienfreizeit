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
│ RELEASE CONTROL                                                          │
│ Accommodation communicated · 3 days ago                                 │
│ 3 scopes outstanding · 6 people affected       [Review changes →]  │
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
needs attention” and still shows outstanding release status and quality numbers.

The release-control card links to the authoritative outstanding-change report in
[UI-11](11-release-control.md). Show initial scopes, changed scopes and revision
mismatches distinctly. Programme-only changes count even when nobody moves. Live
material requests and over-capacity sign-ups appear in the attention region, not
as held arrangements. Compare content rather than counting events since an action.

## Interaction and accessibility

Cards link to the exact affected screen. Reminder sending requires confirmation
and reports a result. Keyboard users reach urgent items before quality numbers;
the heading for the attention region is read by assistive technology when new findings appear.

## Neobrutalist redesign and components

Use a `Sidebar` for organiser navigation, `Card` for plan status and each urgent
group, `Badge` for outstanding release status, and `Alert` for findings. Reminder sending
uses the canonical `AlertDialog` composition: `AlertDialogTrigger` + `Button`,
`AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`,
`AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, and
`AlertDialogAction`. The action description names the number of recipients.
