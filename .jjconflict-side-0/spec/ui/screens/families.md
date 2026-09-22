# UI-06 — Families and import

## Audience, purpose, and route

Organisers inspect invitation progress, filter missing information, and import
families. Route: `/organiser/families`. Governing spec: [organiser view](../../application/organiser-view.md) §3.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Families · 55                                      [Import] [Invite family]│
│ [Search…] [No login] [No room preference] [Incomplete workshops]           │
├──────────────────────────────────────────────────────────────────────────┤
│ Family             Email              People  Room  Workshops  Last seen  │
│ Morgan             alex@example.com       4     ✓       ✓       14 Sep     │
│ Taylor             taylor@example.com     3     —       ⚠       never      │
│ Rivera             rivera@example.com     2     ✓       —       12 Sep     │
└──────────────────────────────────────────────────────────────────────────┘
```

Import opens a dialog with file upload or paste, expected columns, validation,
and a preview. The preview reports “52 ready, 2 problems” and names duplicate
addresses and malformed dates by row. Problem rows are excluded from the import;
the valid rows are appended in one batch, so a bad row costs that row, not the
import ([events](../../architecture/events.md), `FamilyInvited`). The empty table offers import
and manual invite actions.

## Accessibility and responsive behavior

The table has a caption, sortable headers, row links, and a non-color status
label. On narrow screens, filters wrap and each family becomes a labeled card;
the import preview may scroll horizontally inside its own region.

## Neobrutalist redesign and components

Use `Sidebar`, `Input`, `Badge`, `Button`, and `Table` for the main view. Import
is a `Dialog` containing `Tabs` for upload/paste, `Textarea` for pasted CSV,
and a preview `Table`. The final import action uses `AlertDialog` with
`AlertDialogTitle` naming the number of families to be invited and
`AlertDialogDescription` naming the rows that will be skipped.
