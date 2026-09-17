# 04 — Labels and constraints

Labels are the generic storage mechanism. A profile supplies the concrete tag
vocabulary, values, scopes, and UI metadata that generic modules interpret. The
examples in this document use placeholders; the concrete 2027 vocabulary is in
[the Familienfreizeit profile](profiles/familienfreizeit-2027.md).
Generic resolver operators remain fixed; occasion profiles cannot upload executable
operators.

A single mechanism for intrinsic facts, preferences, capabilities, relations,
and organiser decisions. It covers both occasion-specific properties and matching
constraints without adding entity-specific property columns.

Built-in vocabulary lives in code — module-owned keys and profile tags; custom
matching keys are defined by events and use only the fixed resolver operators in
this document. This document
covers labels, constraints, and how the solver consumes them.

---

## 1. What a tag is

A typed key/value fact about an entity, optionally pointing at another entity and
optionally carrying a strength.

```
provides=ensuite                  a room has its own bathroom
needs=needs-ensuite (required)     a family cannot accept a room without one
needs=room-with-garden-view        a person needs a matching room capability
provides=room-with-garden-view     a room offers that capability
needs=ground-floor                 this person needs a ground-floor room
separates-from=family_27           this family must not share with family 27
```

Built-in definitions and custom definitions declare the resolver operator:

| Kind | Scope | Strength | Meaning |
|---|---|---|---|
| `needs-provides` | family, person → space/workshop | required / preferred | The holder needs a matching capability |
| `excludes` | entity → entity/value | required / preferred | The holder rejects a match |
| `groups-with` / `separates-from` | family, person | required / preferred | A relation between entities |
| `descriptive` | any | — | Recorded for humans; the solver ignores it |

`descriptive` exists so that organisers can annotate without inventing a constraint.
A label the solver reads is a decision; one it ignores is a note.

### The three-value scale collapses

An occasion-specific three-way preference is represented as a required label, a
preferred label, or no label:

| Preference | Stored form |
|---|---|
| Required | `needs=ensuite`, strength `required` |
| Preferred | `needs=ensuite`, strength `preferred` |
| Indifferent | no row |

`indifferent` stops being a value and becomes an absence, which is what it always
meant. The tri-state control in the family view writes one of two strengths or
clears the label.

---

## 2. Representation

Labels are never stored as rows of their own. The fold produces one generic label
collection holding properties and constraints for every typed entity. Typed
entities stay identity only; labels own their domain attributes and
relationships. The shape is defined once, in [data model](02-data-model.md) §3.

Three details of that shape are not arbitrary.

**The value is non-null.** Every label has a canonical scalar or entity-id
value, so a label has one unambiguous key.

**The reference lives in the value, not in the key.** `needs=family_27` is
the mental model and the label an organiser sees. The resolver indexes the key and
value without requiring a foreign key.

**The lifetime is a pair of sequence numbers, not a timestamp and an actor.**
The event that produced a label already carries `at` and `actor`, and sequence
bounds are what let the same fold run to an earlier point in the log.

**Keys carry no foreign key.** Built-in definitions are code and custom
definitions are events. Validity is enforced on append and replay by the
resolver schema.

### Matching is a resolver lookup

```ts
const providers = world.labels.byKeyValue('provides')     // value → entity ids
const matches = world.labels
  .live('needs')
  .filter(need => need.strength !== null)
  .flatMap(need => (providers.get(need.value) ?? []).map(p => [need.entity_id, p]))
```

The code illustrates the shape only; the constraint resolver owns scope checks,
party formation, symmetry, and diagnostics.

### What stays typed

Typed entities stay, but only as identity. All domain properties
are labels, including names, dates, booleans, enums, quantities, capabilities,
and relationships. The resolver interprets labels according to occasion config.

The only non-label domain-shaped values are solver outputs such as plan
assignments. `derive` asserts that the resolver did not double-book an entity
before it returns a world. They are not authoritative inputs.

---

## 3. Capabilities come from labels

A room's capability set is read from its `provides` labels. Properties such as
`sanitary=private`, `floor=ground`, and `is-accessible=true` are labels too. A
configured resolver may derive a capability from those labels, but the derived
value is never stored as a competing column or manually assigned fact:

```ts
function capabilities(room: Entity, labels: Label[]): ReadonlySet<string> {
  const out = new Set<Tag>()
  for (const a of labelsFor(room.id, labels)) {
    if (a.key === 'provides') out.add(a.value)
  }
  return out
}
```

This is the mechanism that keeps occasion configuration reusable without forcing a
schema migration for every new property:

- `private-sanitary` and `ground-floor` may be configured as derived capabilities
  from `sanitary` and `floor`. No duplicate property columns are needed.
- `near-the-hall`, invented in week three, is **assigned** as a `provides` label.
  No migration or code deployment.
- If `near-the-hall` turns out to matter every year, it can become a built-in
  configured capability without changing the database schema.

One rule: **a capability is derived or assigned, never both.** A profile tag
with a derivation rejects direct `provides` assignments at append time.

---

## 4. Validation on append

`LabelSet` is validated against built-in or event-defined schemas before it is
appended ([03-events](03-events.md)). The checks are:

1. **Key exists** in built-in or custom definitions.
2. **Scope matches** the entity kind and operator.
3. **Value type matches** the definition and entity references resolve.
4. **Strength is legal** for the constraint.
5. **Cardinality and validity pass**, including the tag's `valid_for` evaluator —
   for example "sleeps with the parents" only on children and infants.
6. **The key is not module-owned.** Keys a module sets only through its own events,
   such as `located-in`, are rejected ([modules](20-modules.md) §3.1).

Failures are field-level errors on the form, never silent. Because `type Tag =
keyof typeof profile.tags`, a bad tag in *code* is a compile error, and a zod
enum derived from the same object makes a bad tag from a *request* a validation
error. There is no path by which an unknown tag enters the log.

Tags removed from the profile mid-run are the one remaining case, handled by
`kernel.unknown-tag` (§6): the fold retains them, the solver ignores them, the
report names them.

### Authorisation

A family may `LabelSet` / `LabelCleared` only:

- on entities it owns (itself, or its own people);
- for tags declaring `family_facing`;
- at strengths that control permits.

Everything else is organiser-only. Organiser-only labels are never rendered in the
family view.

---

## 5. Constraint definitions and the organiser

Organiser-created matching vocabulary is stored as `ConstraintDefined` events
([events](03-events.md)). It is data only:

```ts
{
  key: 'room-with-garden-view',
  label: 'Zimmer mit Gartenblick',
  description: 'Requested by the organiser for this family.',
  operator: 'needs-provides',
  needs_scopes: ['person', 'family'],
  provides_scopes: ['room'],
  strength: 'required'
}
```

| Operator | Example | Effect |
|---|---|---|
| `needs-provides` | person needs / room provides | matching capability |
| `excludes` | family excludes family | forbidden match |
| `groups-with` | person groups-with person | same party or same workshop group |
| `separates-from` | family separates-from family | keep apart |

Organisers cannot upload executable rules. New mechanisms belong in module code and
the active profile; new facts and ordinary matching constraints do not.

Dragging a party to a room creates a custom definition when necessary and applies it
with `LabelSet`. Clearing it emits `LabelCleared`. There is no separate undo stack,
override table, reason taxonomy, or retirement event.

Constraints reference stable people, families, workshops, rooms, and places. They
never reference derived party keys. If party formation changes, the consuming module
reports a spanning or unsatisfied constraint instead of applying it partially.

### How modules consume constraints

The resolver materialises labels and definitions into capabilities and active
constraints once per derivation. Modules consume them; none re-implements matching:

| Module | Consumes |
|---|---|
| [sleeping parties](20.2-sleeping-parties.md) | party requirements; `groups-with` and `separates-from` on people and families |
| [room assignment](20.3-room-assignment.md) | requirements against room capabilities; structural checks; keep-apart relations; `needs-provides` constraints naming rooms and places |
| [workshop rankings](20.5-workshop-rankings.md) | the `ordered-choice` operator |
| [workshop assignment](20.6-workshop-assignment.md) | co-assignment `groups-with`; constraints naming workshops |

Relation symmetry is declared on the tag and interpreted by the resolver:

- `mutual-required` — both directions must exist at `required` to bind;
- `implied-mutual` — one label binds both directions;
- `one-sided-soft` — never binds; always a preference.

---

## 6. Preflight

Preflight runs before any solver stage over the solver input alone
([solver contract](05-solver-contract.md) §3). The kernel contributes the checks that
concern labels and definitions themselves; each module contributes checks about its
mechanism, listed in its specification §9.

| Check | Severity | Fires when |
|---|---|---|
| `kernel.dangling-reference` | error | a label or constraint names a withdrawn, retired, or absent entity |
| `kernel.contradiction` | error | one entity holds `groups-with` and `separates-from` towards the same entity at `required` |
| `kernel.scope-violation` | error | a label is held by an entity kind outside its tag's scopes |
| `kernel.valid-for` | warning | a label's `valid_for` evaluator no longer holds for its entity |
| `kernel.unknown-tag` | warning | a live label names a tag no longer in the profile; the fold retains it, the solver ignores it |

---

## 7. Ordered values

`ordered-choice` is the operator for ranked preferences: a structured label value
carrying a scope entity, a choice, and a rank. It validates unique, dense ranks per
holder and scope entity. Rank is not strength: strength is how binding a preference
is, rank is a position in a list. The workshop ranking that uses it, including the
"no preference" value, is specified in [workshop rankings](20.5-workshop-rankings.md).

---

## 8. Sharp edges

---

**Typos become silence.** `room-with=fam_72` for `fam_27` — a relational foreign
key would catch that; a label does not. The merge simply never happens and
nothing errors.
This is why append-time check 3 (§4) and `kernel.dangling-reference` (§6) both exist. Neither is
optional; together they restore the property that a constraint either applies or
is visibly reported.

**Derived-and-assigned drift.** A capability with a `derive` must reject
assignments, or you get two answers to "does Room 14 have an ensuite". Enforced
at append time and tested in [testing](14-testing.md).

**Requirement inflation through merges.** See
[sleeping parties](20.2-sleeping-parties.md) §7. The strictest-strength union is
correct and surprising.

**Labels as a dumping ground.** `descriptive` is the pressure valve — annotations
that the solver ignores. Without it, organisers will reach for a constraint-kind tag
to record a note, and the solver will act on it. Make `descriptive` easy and
obvious in the organiser UI.

**Canonical ordering.** Labels are an array in the solver input and must be sorted
like every other one: `entity_id`, `key`, `value`.
[solver contract](05-solver-contract.md) §1 R1 applies unchanged, and the
shuffle-invariance test covers it once the array is added to the solver input.
