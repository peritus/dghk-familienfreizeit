# UI-13 — Constraints and health

## Audience, purpose, and route

Organisers inspect available constraint vocabulary, active labels, and preflight
findings. Route: `/organiser/constraints`. Governing specs: [labels and constraints](../04-labels-and-constraints.md),
[constraint health](../08-constraint-health.md), and [organiser view](../09-organiser-view.md) §8.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Decisions                                    [Add organiser decision]      │
│ 11 active · 2 findings · [All] [Errors] [Warnings] [Unused]               │
├──────────────────────────────────────────────────────────────────────────┤
│ ⚠ needs-ensuite · 19 beds required, 14 available        [Affected →]      │
│ ⚠ room-with conflict · Morgan and Rivera split            [Inspect →]      │
│                                                                          │
│ ACTIVE DECISIONS                                                          │
│ needs-ensuite     needs-provides    14 families · 5 rooms                 │
│ room-with         groups-with       8 families                            │
│ apart-from        separates-from    2 families                            │
│ [Show explanation]                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

Creating or clearing an organiser decision requires a label, optional note,
affected entities, and strength. It enters the shared pending list. Built-in
resolver mechanisms are inspectable but not editable. Finding detail names the rule,
affected entities, and the next useful screen.

Applied organiser decisions show their token, optional note, author, and timestamp
to every organiser. Use headings and status text in addition to borders and color. On narrow
screens, findings come first, then decision cards; the create form is a
full-height dialog with grouped labels and keyboard-safe focus order.

## Neobrutalist redesign and components

Use `Sidebar`, filter `Tabs`, finding `Alert` cards, decision `Card` rows, and
textual `Badge` status. Create and inspect use `Dialog` with `Label`, `Input`,
`Textarea`, `Combobox`, and `Select`. Clearing a decision label or applying an
organiser decision uses the full Alert Dialog recipe, with a consequence-focused
`AlertDialogDescription` and explicit Cancel/Action buttons.
