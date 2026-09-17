# UI-11 — Release control

## Audience, purpose, and routes

Organisers inspect held arrangements and review exactly what families will see.
Routes: `/organiser/releases` for outstanding changes and review, and
`/organiser/releases/history` for communication history. Plan investigation remains
at `/organiser/plans` and `/organiser/plans/:a/diff/:b`, with input sequences as
parameters. It does not substitute for a release preview.

The authoritative report, review, dependency and confirmation contracts are in
[release control](../06-release-control.md) §6–8. This document owns their layout
and interaction, not another definition of communication semantics.

## Outstanding changes

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Release control                   [Communication history]              │
│ Not yet communicated to families                                      │
│                                                                       │
│ Select  Scope                   Last communication   Outstanding       │
│ [x]     Accommodation           12 April             3 families move   │
│ [x]     Pottery · details       10 April             Time and room     │
│ [ ]     Saturday AM allocation Never                Initial allocation│
│                                                                       │
│ [ Communicate to families ]                                            │
│ 2 selected · other changes will remain held                            │
└─────────────────────────────────────────────────────────────────────────┘
```

Rows expand into concrete differences and affected-family lists. Distinguish initial
content, changed content, no changes, and revision mismatch with text and glyphs.
Programme changes do not imply participant movement; report both counts accurately.
An applied-then-reverted value disappears from outstanding differences.

The empty state says **Alles ist an Familien kommuniziert.** It must not conceal
revision mismatches or unresolved dependencies. Current material/participation
attention links to its own screen, not a release-backlog row.

## Detailed review

The first button opens a read-only review; nothing has been communicated yet.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Review communication                                                   │
│ Selected: accommodation; Pottery details                               │
│                                                                       │
│ POTTERY DETAILS           Before               After                   │
│ Time                      09:00–10:00          10:00–11:00             │
│ Room                      Craft room           Room 8                 │
│                                                                       │
│ ACCOMMODATION              Before               After                   │
│ Morgan family             Room 12              Room 14                │
│   Jamie                   Bed 12-B             Bed 14-A               │
│                                                                       │
│ [Affected families: 7 ▾] [Family-visible previews ▾]                    │
│ [Dependencies and findings ▾]                                          │
│ Remains held: Saturday AM allocation                                   │
│                                                                       │
│ [ ] Notify families by email     [Recipients and messages ▾]            │
│ These details will become visible in the family view.                 │
│ [Back]                         [Communicate to families now]            │
└─────────────────────────────────────────────────────────────────────────┘
```

All differences are reachable without truncation: full initial content, changed
fields, removed/added participants, cancellation, and movements grouped by family.
Family previews use the actual server privacy projection. Dependencies present an
explicit selection action that refreshes the review; they are never silently added.
Blocking issues disable confirmation with a reason. Show the reviewed basis,
`build_revision`, and `compatibility_revision` in secondary
review details, not in ordinary family flows. There is no communication-content hash.

German final action: **Jetzt an Familien kommunizieren**. Consequence:
**Diese Angaben sind anschließend in der Familienansicht sichtbar.** Email status is
separate: **E-Mail-Benachrichtigung: nicht ausgewählt** or the exact recipient count.

Changing selection or notification options refreshes the preview.
Pending edits must be applied or discarded before final confirmation. If the server
reports a changed head/deployment, retain the organiser's selection, show the refreshed
diff and require confirmation again. A rejected action changes no family visibility.
Success returns the communicated scopes and separately shows email delivery outcomes.

## History and recovery

History rows show actor, time, selected scopes and basis, with per-scope before/after
views where reproducible. A revision mismatch shows full current proposed content and
the explicit absence of a reliable before-image. It must not show a fabricated diff.
Recovery uses the same review rather than an uncommunicate toggle.

## Accessibility, mobile and printing

Use real tables with labelled before/after columns and text summaries. On narrow
screens each difference becomes a stacked field card. Never rely on colour alone.
Dependencies and blocking reasons are keyboard reachable before confirmation; focus
returns to the initiating button on cancel. The confirmation uses the canonical
Alert Dialog composition. Long names, notes and titles wrap.

Use `Sidebar`, `Card`, `Table`, `Badge`, `Checkbox`, `Alert`, `Button` and
`AlertDialog`. The report is browser-printable under [reports](../19-reports.md);
controls are hidden in print and selected scopes/data references remain visible.
There is no application download, export or print button.
