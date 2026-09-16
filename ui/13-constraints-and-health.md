# UI-13 — Constraints and health

## Audience, purpose, and route

Organisers inspect available constraint vocabulary, active labels, and preflight
findings. Route: `/admin/constraints`. Governing specs: [labels and constraints](../04-labels-and-constraints.md),
[constraint health](../08-constraint-health.md), and [admin interface](../09-admin-interface.md) §8.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Constraints                                  [Create custom constraint]    │
│ 11 active · 2 findings · [All] [Errors] [Warnings] [Unused]               │
├──────────────────────────────────────────────────────────────────────────┤
│ ⚠ needs-ensuite · 19 beds required, 14 available        [Affected →]      │
│ ⚠ room-with conflict · Morgan and Rivera split            [Inspect →]      │
│                                                                          │
│ ACTIVE DEFINITIONS                                                        │
│ needs-ensuite     needs-provides    14 families · 5 rooms                 │
│ room-with         groups-with       8 families                            │
│ apart-from        separates-from    2 families                            │
│ [Show explanation]                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

Creating or clearing a custom constraint requires a label, explanation,
participants, and strength. It enters the shared pending list. Built-in
definitions are inspectable but not editable. Finding detail names the rule,
affected entities, and the next useful screen.

Use headings and status text in addition to borders and color. On narrow
screens, findings come first, then definition cards; the create form is a
full-height dialog with grouped labels and keyboard-safe focus order.
