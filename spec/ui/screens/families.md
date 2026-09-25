# UI-06 — Families

## Audience, purpose, and route

Organisers inspect invitation progress, filter missing information, and invite
families manually. Route: `/organiser/families`. Governing spec: [organiser view](../../application/organiser-view.md) §3.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Families · 55                                             [Invite family]│
│ [No login] [No room preference] [Incomplete workshops]                    │
├──────────────────────────────────────────────────────────────────────────┤
│ Family             Email              People  Room  Workshops  Last seen  │
│ Morgan             alex@example.com       4     ✓       ✓       14 Sep     │
│ Taylor             taylor@example.com     3     —       ⚠       never      │
│ Rivera             rivera@example.com     2     ✓       —       12 Sep     │
└──────────────────────────────────────────────────────────────────────────┘
```

The invitation form stages one `FamilyInvited` event at a time. The empty table
offers the same manual invitation action. There is no bulk import, file upload,
paste flow, CSV parser, or import API; CSV import is not part of the application
contract.

## Accessibility and responsive behavior

The table has a caption, sortable headers, row links, and a non-color status
label. On narrow screens, filters wrap and each family becomes a labeled card.

## Neobrutalist redesign and components

Use `Sidebar`, `Input`, `Badge`, `Button`, and `Table` for the main view. Manual
invitation uses the ordinary organiser form and stages the resulting event
through the shared draft-change workflow.
