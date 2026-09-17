# 07 — Constraint health

Constraint health is a generic diagnostic module. Its checks consume the active
profile and selected modules; occasion-specific tags and policies determine which
findings can occur.

Organiser decisions use the same event-backed label system as family preferences.
There is no separate decision model. Decisions may use any fixed resolver
mechanism, including needs/provides matching, exclusions, grouping, separation,
and workshop constraints.

## 1. The premise

When an organiser knows something the solver does not, they add a decision label
with an optional note. For example:

```text
fam_42 needs    naehe_zum_eingang
rm_07  provides naehe_zum_eingang
```

The resolver joins the labels and the solver treats the result as a normal
required or preferred constraint. The event log records who added it, when, and
the optional note.

## 2. Generic constraint definitions

Generic constraint operators are implemented by the constraint module. An occasion
profile binds its concrete tags to those operators. Organiser decisions use
`LabelSet` events and are data only:

```ts
{
  entity_id: 'fam_42',
  key: 'needs',
  value: 'naehe_zum_eingang',
  strength: 'required',
  note: 'Nähe zum barrierefreien Eingang.'
}
```

The fixed resolver supports:

| Operator | Example | Effect |
|---|---|---|
| `needs-provides` | person needs / room provides | matching capability |
| `excludes` | family excludes family | forbidden match |
| `groups-with` | person groups-with person | party or workshop group |
| `separates-from` | family separates-from family | keep apart |

Organisers cannot upload executable rules. New mechanisms belong in solver code and
the active profile; new facts and ordinary matching constraints do not.

## 3. Board and constraint lifecycle

Dragging a party to a room, excluding a room, grouping people, or guiding workshop
participation creates one or more `LabelSet` events. Clearing them emits
`LabelCleared`. There is no separate undo stack, decision table, decision metadata
model, or retirement event.

Decision labels reference stable people, families, workshops, and spaces. They
never reference derived party keys. If party formation changes, the resolver
reports a spanning or unsatisfied decision instead of applying it partially.

## 4. Constraint health

The organiser dashboard computes health from the current event-log state:

- required constraints with no provider;
- contradictory constraints;
- constraints whose referenced entities are withdrawn or absent;
- constraints currently affecting the plan;
- constraints that are currently redundant and can be cleared.

The last two are one question asked twice, and it is a counterfactual: derive
without the constraint and compare. `diff(derive(events ∖ c), derive(events))` is
empty when `c` is doing no work and names exactly who moves when it is. This needs
no bookkeeping of its own, which is why the buckets can be recomputed on every
dashboard load rather than maintained.

Clearing a constraint is always a human action. Its original `LabelSet` event
remains history, and replaying the earlier plan's `input_seq` reproduces the result
it produced.

## 5. Regression corpus

A constraint fixture records a log position, the constraint labels, the expected
assignment, and the definition description. Every case is the same counterfactual
the dashboard runs, pinned to a fixed position so it can be asserted.
Fixtures for constraints that have been cleared remain useful regression cases:

- cleared constraints should remain satisfied when the corresponding rule is
  now represented by built-in resolver logic;
- active constraints are informational and expose the current backlog;
- a changed constraint or solver result produces a readable plan diff.

## 6. What this costs

The resolver needs typed definitions, scope validation, cardinality checks, and
good diagnostics. In exchange, the system removes a pin table, five event
shapes, a reason-code workflow, retirement machinery, and a second assignment
model.
