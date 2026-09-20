# Labels and constraints

Labels are the generic storage mechanism. A profile supplies the concrete tag
vocabulary, value shapes, scopes, and UI metadata that generic modules interpret.
Organisers may add free-form values through the fixed resolver mechanisms. The
examples in this document use placeholders; the concrete 2027 vocabulary is in
[the Familienfreizeit profile](../profiles/familienfreizeit-2027.md).
Generic resolver operators remain fixed; occasion profiles cannot upload executable
operators.

A single mechanism for intrinsic facts, preferences, capabilities, relations,
and organiser decisions. It covers both occasion-specific properties and matching
constraints without adding entity-specific property columns.

Fixed resolver mechanisms, module-owned keys, and profile vocabulary live in code.
Organiser values use those fixed mechanisms; matching values may be free-form where
the mechanism permits them. This document covers labels, constraints, organiser
decisions, and how selected modules consume them.

---

## 1. What a tag is

A typed key/value fact about an entity, optionally pointing at another entity and
optionally carrying a strength.

```
provides=private-sanitary          a room has its own bathroom
needs=private-sanitary (required)  a family cannot accept a room without one
needs=room-with-garden-view        a person needs a matching room capability
provides=room-with-garden-view     a room offers that capability
needs=ground-floor                 this person needs a ground-floor room
separates-from=fam_27              this family must not share with family fam_27
```

Fixed resolver mechanisms declare the resolver operator:

| Mechanism | Scope | Strength | Meaning |
|---|---|---|---|
| `needs-provides` | family, person → room/place/workshop | required / preferred | The holder needs a matching capability |
| `excludes` | entity → entity/value | required / preferred | The holder rejects a match |
| `groups-with` / `separates-from` | family, person | required / preferred | A relation between entities |
| `ordered-choice` | person → slot, choice | — | A ranked list per scope entity (§7) |
| `capacity` | the entities a module counts | — | Counting, owned by the module |
| `descriptive` | any | — | Recorded for humans; the solver ignores it |

The first four are fixed resolver operators; `capacity` and `descriptive` come from
module and profile vocabulary. `descriptive` exists for profile-defined facts that
the solver ignores. An organiser decision may also carry one optional free-text
note; the note is visible to organisers but is not solver input.

### The three-value scale collapses

An occasion-specific three-way preference is represented as a required label, a
preferred label, or no label:

| Preference | Stored form |
|---|---|
| Required | `needs=private-sanitary`, strength `required` |
| Preferred | `needs=private-sanitary`, strength `preferred` |
| Indifferent | no row |

`indifferent` stops being a value and becomes an absence, which is what it always
meant. The tri-state control in the family view writes one of two strengths or
clears the label.

---

## 2. Representation

Labels are never stored as rows of their own. The fold produces one generic label
collection holding properties and constraints for every typed entity. Typed
entities stay identity only; labels own their domain attributes and
relationships. The shape is defined once, in [data model](data-model.md) §4.

Three details of that shape are not arbitrary.

**The value follows its schema.** Scalars, stable entity ids, and structured values
use canonical JSON. Nullability and cardinality belong to the configured schema;
free-form matching tokens must be non-empty strings.

**The reference lives in the value, not in the key.** `needs=fam_27` is
the mental model and the label an organiser sees. The resolver indexes the key and
value without requiring a foreign key.

**The lifetime is a pair of sequence numbers, not a timestamp and an actor.**
The event that produced a label already carries `at` and `actor`, and sequence
bounds are what let the same fold run to an earlier point in the log.

**Keys carry no foreign key.** Resolver mechanisms are fixed code. Values may be
profile-defined or organiser-supplied free-form matching tokens, with entity
references validated where the mechanism requires them.

### Matching is a resolver lookup

```ts
const providers = world.labels.byKeyValue('provides')     // value → entity ids
const matches = world.labels
  .live('needs')
  .filter(need => need.strength !== null)
  .flatMap(need => (providers.get(need.value) ?? []).map(p => [need.entity_id, p]))
```

The code illustrates the shape only; the constraint resolver owns scope checks,
relation symmetry and diagnostics. Sleeping-party formation is outside the active
placement model.

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

`LabelSet` is validated against fixed resolver and profile schemas before it is
appended ([03-events](events.md)). The checks are:

1. **Key exists** in the fixed resolver vocabulary, active profile vocabulary, or
   selected module vocabulary.
2. **Scope matches** the entity kind and operator.
3. **Value shape matches** the resolver mechanism and entity references resolve
   where required; organiser matching tokens may otherwise be free-form.
4. **Strength is legal** for the constraint.
5. **Cardinality and validity pass**, including the tag's `valid_for` evaluator —
   for example "does not need a bed" only on children and infants.
6. **The key is writable through labels on this entity kind.** Keys the kernel or
   a module sets only through setup events, such as `member-of` and `located-in`,
   are rejected for the kinds that own them ([modules](../modules/contract.md) §3.1).

Failures are field-level errors on the form, never silent. `type Tag =
keyof typeof profile.tags` checks profile tag references in code. Append validation
also knows the fixed resolver keys and selected profile/module vocabulary. A matching
token supplied as a value is not a new key and does not need a profile tag or
declaration event. Entity references and structured values still use their resolver's
schemas; free-form input does not bypass those checks.

Tags removed from the profile mid-run are the one remaining case, handled by
`kernel.unknown-tag` (§6): the fold retains them, the solver ignores them, the
report names them.

### Authorisation

A family may `LabelSet` / `LabelCleared` only:

- on entities it owns (itself, or its own people);
- for tags declaring `family_facing`, or module-owned writable keys with an explicit
  family-control contract (such as workshop participation);
- at strengths that control permits.

Deadline status is not an additional authorisation condition. The active profile's
scoped deadlines affect family-facing notices only; a family remains able to write
an otherwise authorised control after its deadline. Organisers can always write
through the organiser path. Whether a late change is adopted in a plan is decided
by the explicit review and communication flow.

Everything else is organiser-only. Organiser-only labels are never rendered in the
family view.

Organisers may set free-form values for every fixed resolver mechanism. Examples
include `needs=naehe_zum_eingang` paired with `provides=naehe_zum_eingang`,
`excludes=rm_14`, `groups-with=per_23`, and `separates-from=fam_27`.
Workshop resolver inputs use their existing structured value shapes. An optional
label note records context for organisers; it is not read by the solver.

---

## 5. Organiser decisions and custom vocabulary

An organiser decision is one or more `LabelSet` events using existing resolver
keys and value shapes. The value itself is the decision token; a separate display
name or explanation is not required. One optional `note` provides extra context.

```text
fam_42 needs=naehe_zum_eingang (required)
rm_07  provides=naehe_zum_eingang
fam_42 excludes=rm_14 (required)
```

These labels need no separate declaration. Matching tokens are compared as values;
entity references are resolved and checked against the selected modules. A required
exclusion forbids the target even when another decision requests it. Contradictory
required labels produce diagnostics, never a silent last-writer override of a
different active label. Clearing a decision emits `LabelCleared`.

`required` restricts feasible assignments; `preferred` uses the consuming mechanism's
configured soft terms. Neither lets an organiser change weights or executable
rules at runtime (D11–D12). Notes are available in the derived organiser views and
history, but are excluded from solver input. Trace entries identify the source
labels so those views can display the optional note and event attribution.

### Free-form matching values

An organiser may supply a new matching value without adding vocabulary or deploying
code. The label key remains a fixed resolver mechanism; the value is the concrete
token shared by the relevant labels:

```text
fam_42 needs=room-with-garden-view (required)
rm_07  provides=room-with-garden-view
```

The fixed resolver validates the scopes and value shape for `needs` and `provides`,
then compares the canonical values. No event defines or retires the token.

| Operator | Example | Effect |
|---|---|---|
| `needs-provides` | person needs / room provides | matching capability |
| `excludes` | family excludes family | forbidden match |
| `groups-with` | person groups-with person | reserved for the deferred sleeping-parties module; no active module consumes it |
| `separates-from` | family separates-from family | keep apart |

Organisers cannot upload executable rules. New mechanisms belong in module code and
the active profile; new facts and ordinary matching constraints do not.

Dragging a family to a room adds ordinary decision labels to the pending list. A
room choice may pair `needs` on the selected stable entities with `provides` on
the target. It does not require creating vocabulary or additional decision
metadata. A token offered by multiple rooms expresses a matching requirement,
not a command to choose an arbitrary provider.

Constraints reference stable people, families, workshops, rooms, beds, and places.
They never reference a derived placement unit. Sleeping-party constraints are
rejected or reported as outside the active placement model.

### How modules consume constraints

The resolver materialises labels into capabilities and active constraints once per
derivation, including free-form organiser values that are absent from
`profile.tags`. Each resolved constraint retains its source label
identity (`entity_id`, `key`, canonical `value`) and event sequence for ordering,
diagnostics, and display. `constraint_key` in module output is a derived reference
to those labels, never a separate persisted decision id. Modules consume the
resolved inputs; none re-implements matching:

| Module | Consumes |
|---|---|
| [room assignment](../modules/room-assignment.md) | requirements against room/place capabilities; keep-apart effects; exclusions; resolved placement decisions |
| [workshops](../modules/workshops.md) | participation references, capacity admission and effective programme/slot resolution |
| [workshop rankings](../modules/workshop-rankings.md) | the `ordered-choice` operator |
| [workshop assignment](../modules/workshop-assignment.md) | needs/provides matching, exclusions, eligibility, separation, and decisions naming workshops within their slot |

Relation symmetry is declared on the tag and interpreted by the resolver:

- `mutual-required` — both directions must exist at `required` to bind;
- `implied-mutual` — one label binds both directions;
- `one-sided-soft` — never binds; always a preference.

Direct organiser separation uses the fixed mechanism's scope and symmetry. Sleeping
grouping is not effective in the active module set.
Workshop decisions retain their configured slot/target value shape. The resolver
routes them to the relevant selected module. If the consuming module is absent, the
decision is rejected on append or reported during replay, never silently accepted
as effective.

---

## 6. Preflight

Solver preflight runs before any solver stage over the solver input alone
([solver contract](solver-contract.md) §3). The kernel contributes the checks that
concern labels and definitions themselves; each module contributes checks about its
mechanism, listed in its specification §9.

| Check | Severity | Fires when |
|---|---|---|
| `kernel.dangling-reference` | error | a label or constraint names a withdrawn, retired, or absent entity |
| `kernel.contradiction` | error | one entity holds `groups-with` and `separates-from` towards the same entity at `required` |
| `kernel.scope-violation` | error | a label is held by an entity kind outside its tag's scopes |
| `kernel.valid-for` | warning | a label's `valid_for` evaluator no longer holds for its entity |
| `kernel.unknown-tag` | warning | a live label key is no longer in the fixed resolver, profile, or selected module vocabulary; the fold retains it, the solver ignores it; a new matching token under a known key does not trigger this |

---

World-level module diagnostics inspect non-solver data separately; they do not
enter plan preflight or its hash. Release consistency uses the prospective world
under [release control](../application/release-control.md), not an extra solver stage.

## 7. Ordered values

`ordered-choice` is the operator for ranked preferences: a structured label value
carrying a scope entity, a choice, and a rank. It validates unique, dense ranks per
holder and scope entity. Rank is not strength: strength is how binding a preference
is, rank is a position in a list. The workshop ranking that uses it, including the
"no preference" value, is specified in [workshop rankings](../modules/workshop-rankings.md).

---

## 8. Sharp edges

**Typos become silence.** `separates-from=fam_72` for `fam_27` — a relational foreign
key would catch that; a label does not. The merge simply never happens and
nothing errors.
This is why append-time check 3 (§4) and `kernel.dangling-reference` (§6) both exist. Neither is
optional; together they restore the property that a constraint either applies or
is visibly reported.

**Derived-and-assigned drift.** A capability with a `derive` must reject
assignments, or you get two answers to "does Room 14 have an ensuite". Enforced
at append time and tested in [testing](../engineering/testing.md).

**Requirement inflation through unions.** A placement unit's requirements are the
strictest-strength union of the family's and its members' tags, which is correct
and still surprises people. Merging units across families would sharpen this, and
belongs to the sleeping-parties design.

**Notes are not constraints.** Profile-defined `descriptive` facts and optional
decision notes are ignored by the solver. An organiser must not need to invent a
matching token just to record context; the optional note is sufficient.

**Canonical ordering.** Labels are an array in the solver input and must be sorted
like every other one: `entity_id`, `key`, `value`.
[solver contract](solver-contract.md) §1 R1 applies unchanged, and the
shuffle-invariance test covers it once the array is added to the solver input.
