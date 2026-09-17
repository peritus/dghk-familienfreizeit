# UI-13 — Organiser decisions

## Audience, purpose, and route

Organisers add, inspect, and clear decision labels, and inspect current resolver
findings. Route: `/organiser/constraints`. Governing specs: [labels and constraints](../04-labels-and-constraints.md)
and [organiser view](../09-organiser-view.md) §5.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Organiser decisions                         [Add organiser decision]    │
│ 11 active · 2 findings · [All] [Errors] [Warnings]                        │
├──────────────────────────────────────────────────────────────────────────┤
│ ⚠ needs-private-sanitary · 19 places required, 14 available [Affected →]  │
│ ⚠ apart-from conflict · Morgan and Rivera both need Room 12 [Inspect →]   │
│                                                                          │
│ ACTIVE DECISIONS                                                        │
│ Müller family · needs=naehe_zum_eingang · required                       │
│ Room 07 · provides=naehe_zum_eingang                                     │
│ Additional information: Nähe zum barrierefreien Eingang.                │
│ Anna · 15 Sep 09:12                                    [Inspect] [Clear] │
└──────────────────────────────────────────────────────────────────────────┘
```

Adding an organiser decision uses the affected entity, existing resolver key,
value, and strength where applicable. One optional free-text note supplies context.
There is no separate decision name: `naehe_zum_eingang` is the value shown on
both sides of a needs/provides pair. Entity references and workshop-specific
structured values use the resolver's existing input controls and validation.

Add creates ordinary `LabelSet` events; Clear creates `LabelCleared` for the
selected application. Both enter the pending list shared across this organiser's
screens, local to their browser until Apply. Applied labels show the token, optional
note, event author, and timestamp to every organiser. Fixed resolver mechanisms
are inspectable but not editable. Findings name the rule, affected entities, and
the next useful screen. Empty state: no decisions yet; Add remains available.

German copy uses **Entscheidungen des Organisationsteams**, **Entscheidung
hinzufügen**, and **Zusätzliche Informationen** (optional). Family-facing views
show the published assignment, never internal tokens or organiser notes.

Use headings and status text in addition to borders and color. On narrow
screens, findings come first, then decision cards; the create form is a
full-height dialog with grouped labels and keyboard-safe focus order.

## Neobrutalist redesign and components

Use `Sidebar`, filter `Tabs`, finding `Alert` cards, decision `Card` rows, and
textual `Badge` status. Create and inspect use `Dialog` with `Label`, `Input`,
`Textarea`, `Combobox`, and `Select`. Clearing a decision label or applying an
organiser decision uses the full Alert Dialog recipe, with a consequence-focused
`AlertDialogDescription` and explicit Cancel/Action buttons.
