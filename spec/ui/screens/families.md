# UI-06 — Families

## Audience, purpose, and route

Organisers inspect invitation progress, filter missing information, and invite
families manually. Route: `/organiser/families`. Governing spec: [organiser view](../../application/organiser-view.md) §3.

The shared collection action **Familie einladen** sits in the screen header and
opens a dialog for the name and email address. The invitation stages one
`FamilyInvited` event at a time. The empty state offers the same manual invitation
action. There is no bulk import, file upload,
paste flow, CSV parser, or import API; CSV import is not part of the application
contract.

## Accessibility and responsive behavior

The table has a caption, column headers, row links, and a non-color status label.
On narrow screens, the table becomes labeled family cards. The invitation dialog
preserves labelled fields, keyboard focus handling, and a result-specific submit
action.

## Neobrutalist redesign and components

Use `Sidebar`, `Input`, `Badge`, `Button`, and `Table` for the main view. Manual
invitation uses the shared inline-table pattern and stages the resulting event
through the shared draft-change workflow.
