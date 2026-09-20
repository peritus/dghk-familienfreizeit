# UI-11 — Release control

## Audience, purpose, and routes

Organisers and families inspect the same privacy-projected online diffs in context.
Organisers can also use `/organiser/releases` for an outstanding-change overview and
review, and
`/organiser/releases/history` for communication history. Plan investigation remains
at `/organiser/plans` and `/organiser/plans/:a/diff/:b`, with input sequences as
parameters. It does not substitute for a release preview.

The authoritative report, review, dependency and confirmation contracts are in
[release control](../../application/release-control.md) §6–8. This document owns their layout
and interaction, not another definition of communication semantics.

## Shared inline status and diff

Every releasable scope renders the same status badge wherever it appears:

| Badge | Meaning |
|---|---|
| `✓` | Communicated by the organisers |
| `?` | Changed since communication; confirmation is needed |
| `—` | Never communicated |

Badges have text labels and tooltips; colour is supplementary. The tooltip includes
the last communication time and reviewed `input_seq` when one exists. Expanding a
badge opens the canonical before/after diff in place, without navigating to a
separate release view. The diff shows added, removed and changed fields, allocation
movements, and cancellation status appropriate to the viewer.

The component receives one semantic scope diff and the field-level temporal/privacy
matrix from [release control](../../application/release-control.md). Admins get
affected families, findings, organiser explanations, and the communication action;
families get only their own family-visible result and remain read-only. Both use the
same reviewed `input_seq` when a diff is opened. A newer event shows a non-blocking
“newer changes exist” indicator and never silently replaces the open diff.

## Outstanding changes overview

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

Rows expand into the same inline component's concrete differences and affected-family lists. Distinguish initial
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
Blocking issues disable confirmation with a reason. Show the reviewed `input_seq`,
`build_revision`, and `compatibility_revision` in secondary
review details, not in ordinary family flows. There is no communication-content hash.

German final action: **Jetzt an Familien kommunizieren**. Consequence:
**Diese Angaben sind anschließend in der Familienansicht sichtbar.** Email status is
separate: **E-Mail-Benachrichtigung: nicht ausgewählt** or the exact recipient count.

Changing selection or notification options refreshes the preview.
Pending edits must be applied or discarded before final confirmation. If the server
reports an unavailable reviewed sequence or deployment mismatch, retain the organiser's
selection, explain the unavailable review and require a new preview. A concurrent append
does not invalidate the review. A rejected action changes no family visibility.
Success returns the communicated scopes and separately shows email delivery outcomes.

## History and recovery

History rows show actor, time, selected scopes and `input_seq`, with per-scope before/after
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
`AlertDialog`. The report is browser-printable under [reports](../../application/reports.md);
controls are hidden in print and selected scopes/data references remain visible.
There is no application download, export or print button.
