# 06 — Constraints and evolution

Admin judgement is expressed through the same event-backed constraint system as
attendee preferences. There is no temporary override model separate from the
matching vocabulary.

## 1. The premise

When an organiser knows something the solver does not, they add a human-readable
matching constraint. For example:

```text
per_42 needs    room-with-garden-view
rm_07  provides room-with-garden-view
```

The resolver joins the labels and the solver treats the result as a normal
required or preferred constraint. The event log records who added it, when, and
why through its definition and description.

## 2. Generic constraint definitions

Built-in constraints are defined in the event config. Admin-created definitions
are stored as `ConstraintDefined` events. They are data only:

```ts
{
  key: 'room-with-garden-view',
  label: 'Zimmer mit Gartenblick',
  description: 'Requested by the organiser for this family.',
  operator: 'needs-provides',
  needsScopes: ['person', 'family'],
  providesScopes: ['space'],
  strength: 'required'
}
```

The fixed resolver supports:

| Operator | Example | Effect |
|---|---|---|
| `needs-provides` | person needs / room provides | matching capability |
| `excludes` | family excludes family | forbidden match |
| `groups-with` | person groups-with person | party or workshop group |
| `separates-from` | family separates-from family | keep apart |

Admins cannot upload executable rules. New mechanisms belong in solver code and
the built-in registry; new facts and ordinary matching constraints do not.

## 3. Board and constraint lifecycle

Dragging a party to a room creates a custom definition when necessary and applies
it with `LabelSet`. Clearing it emits `LabelCleared`. There is no separate undo
stack, override table, reason taxonomy, or retirement event.

Constraints reference stable people, families, workshops, and spaces. They never
reference derived party keys. If party formation changes, the resolver reports a
spanning or unsatisfied constraint instead of applying it partially.

## 4. Constraint health

The admin dashboard computes health from the current event-log state:

- required constraints with no provider;
- contradictory constraints;
- constraints whose referenced entities are withdrawn or absent;
- constraints currently affecting the plan;
- constraints that are currently redundant and can be cleared.

Clearing a constraint is always a human action. Its original `LabelSet` event
remains history, and historical plan snapshots preserve the result it produced.

## 5. Regression corpus

Constraint fixtures replace pin fixtures. A fixture records a snapshot sequence,
the constraint labels, expected assignment, and the definition description.
Fixtures for constraints that have been cleared remain useful regression cases:

- cleared constraints should remain satisfied when the corresponding rule is
  now represented by built-in resolver logic;
- active constraints are informational and expose the current backlog;
- a changed constraint or solver result produces a readable plan diff.

This retains the useful learning loop without requiring a second domain model.

## 6. What this costs

The resolver needs typed definitions, scope validation, cardinality checks, and
good diagnostics. In exchange, the system removes a pin table, five event
shapes, party override events, a reason-code workflow, retirement machinery, and
the promotion path from pin to tag.
