# UI-06 — Families and import

## Audience, purpose, and route

Organisers inspect invitation progress, filter missing information, and import
families. Route: `/admin/families`. Governing spec: [admin interface](../09-admin-interface.md) §3.

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
and a preview. The preview reports “52 ready, 2 problems” and keeps Apply
disabled until every row is valid. Duplicate addresses and malformed dates are
named by row. The empty table offers import and manual invite actions.

## Accessibility and responsive behavior

The table has a caption, sortable headers, row links, and a non-color status
label. On narrow screens, filters wrap and each family becomes a labeled card;
the import preview may scroll horizontally inside its own region.
