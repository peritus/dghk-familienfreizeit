# UI-13 — Organiser decisions

## Audience, purpose, and route

Organisers add, review, and clear placement decisions, and review current
findings. Route: `/organiser/constraints`. Governing specs: [labels and constraints](../../architecture/labels-and-constraints.md)
and [organiser view](../../application/organiser-view.md) §5.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Entscheidungen des Organisationsteams       [Entscheidung hinzufügen]      │
│ 11 aktiv · 2 Hinweise · [Alle] [Fehler] [Warnungen]                        │
├──────────────────────────────────────────────────────────────────────────┤
│ ⚠ Anforderung ohne passenden Platz [Prüfen →]                             │
│ ⚠ Familien sollen getrennt bleiben [Prüfen →]                             │
│                                                                          │
│ ACTIVE DECISIONS                                                        │
│ Familie Müller · Anforderung: Nähe zum Eingang · erforderlich             │
│ Zimmer 07 · Merkmal: Nähe zum Eingang                                     │
│ Additional information: Nähe zum barrierefreien Eingang.                │
│ Anna · 15 Sep 09:12                                    [Inspect] [Clear] │
└──────────────────────────────────────────────────────────────────────────┘
```

Adding a decision uses the affected entity, a human-facing type (Anforderung,
Merkmal, or Trennung), a value, and strength where applicable. One optional
free-text note supplies context. The implementation may resolve these values
through configured constraints, but that mechanism is not part of the organiser
interface.

Add creates the corresponding domain change; Clear removes the
selected application. A new value replaces an existing value only where the
configured cardinality permits replacement. Both enter the shared local-first event
pipeline across this organiser's screens. The local world updates immediately;
immediate mode submits automatically and drafting mode keeps the changes in the
browser until the shared save-status control. Applied decisions show the value,
optional note, author, and timestamp to every organiser. Findings name the
affected entities and the next useful screen. Empty state: no decisions yet;
Add remains available.

German copy uses **Entscheidungen des Organisationsteams**, **Entscheidung
hinzufügen**, and **Zusätzliche Informationen** (optional). Family-facing views
show the communicated assignment, never internal tokens or organiser notes.

Use headings and status text in addition to borders and color. On narrow
screens, findings come first, then decision cards; the create form is a
full-height dialog with grouped labels and keyboard-safe focus order.

## Neobrutalist redesign and components

Use `Sidebar`, filter `Tabs`, finding `Alert` cards, decision `Card` rows, and
textual `Badge` status. Create and review use `Dialog` with `Label`, `Input`,
`Textarea`, `Combobox`, and `Select`. Clearing a decision label or applying an
organiser decision uses the full Alert Dialog recipe, with a consequence-focused
`AlertDialogDescription` and explicit Cancel/Action buttons.
