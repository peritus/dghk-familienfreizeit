# UI-06 — Families

## Audience, purpose, and route

Organisers inspect invitation progress, filter missing information, and invite
families manually. Route: `/organiser/families`. Governing spec: [organiser view](../../application/organiser-view.md) §3.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Familien · 55                                                       │
├──────────────────┬──────────────────────┬──────────┬────────────────┤
│ Familie          │ E-Mail               │ Personen │ Aktion         │
├──────────────────┼──────────────────────┼──────────┼────────────────┤
│ [Neue Familie  ] │ [                  ] │    —     │[Familie         │
│                  │                      │          │ einladen]       │
├──────────────────┼──────────────────────┼──────────┼────────────────┤
│ Morgan           │ alex@example.com     │    4     │ Öffnen         │
└──────────────────┴──────────────────────┴──────────┴────────────────┘
```

The invitation form stages one `FamilyInvited` event at a time. The empty table
offers the same manual invitation action. There is no bulk import, file upload,
paste flow, CSV parser, or import API; CSV import is not part of the application
contract.

## Accessibility and responsive behavior

The table has a caption, column headers, row links, and a non-color status
label. The first row is the inline invitation form and its action is explicitly
labelled **Familie einladen**. On narrow screens, the table becomes labeled
family cards; the invitation card remains first.

## Neobrutalist redesign and components

Use `Sidebar`, `Input`, `Badge`, `Button`, and `Table` for the main view. Manual
invitation uses the shared inline-table pattern and stages the resulting event
through the shared draft-change workflow.
