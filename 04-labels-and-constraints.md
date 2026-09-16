# 04 — Labels and constraints

Labels are the generic storage mechanism. A profile supplies the concrete tag
vocabulary, values, scopes, and UI metadata that generic modules interpret. The
examples in this document use placeholders; the concrete 2027 vocabulary is in
[the Familienfreizeit profile](events/familienfreizeit-2027.md).
Generic resolver operators remain fixed; event profiles cannot upload executable
operators.

A single mechanism for intrinsic facts, preferences, capabilities, relations,
and admin decisions. It covers both event-specific properties and matching
constraints without adding entity-specific property columns.

Built-in vocabulary lives in code; custom matching keys are defined by events
and use only the fixed resolver operators in this document. This document
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
needs=childgroupA                  this child needs a room providing childgroupA
separates-from=family_27           this family must not share with family 27
```

Built-in definitions and custom definitions declare the resolver operator:

| Kind | Scope | Strength | Meaning |
|---|---|---|---|
| `needs-provides` | family, person → space/workshop | required / preferred | The holder needs a matching capability |
| `excludes` | entity → entity/value | required / preferred | The holder rejects a match |
| `groups-with` / `separates-from` | family, person | required / preferred | A relation between entities |
| `descriptive` | any | — | Recorded for humans; the solver ignores it |

`descriptive` exists so that admins can annotate without inventing a constraint.
A label the solver reads is a decision; one it ignores is a note.

### The three-value scale collapses

An event-specific three-way preference is represented as a required label, a
preferred label, or no label:

| Preference | Stored form |
|---|---|
| Required | `needs=ensuite`, strength `required` |
| Preferred | `needs=ensuite`, strength `preferred` |
| Indifferent | no row |

`indifferent` stops being a value and becomes an absence, which is what it always
meant. The tri-state control in the family portal writes one of two strengths or
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
the mental model and the label an admin sees. The resolver indexes the key and
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
and relationships. The resolver interprets labels according to event config.

The only non-label domain-shaped values are solver outputs such as plan
assignments. `derive` asserts that the resolver did not double-book an entity
before it returns a world. They are not authoritative inputs.

---

## 3. Capabilities come from labels

A room's capability set is read from its `provides` labels. Properties such as
`sanitary=private`, `floor=0`, and `is-accessible=true` are labels too. A
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

This is the mechanism that keeps event configuration reusable without forcing a
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
5. **Cardinality and validity pass**, including child-group requirements only on
   children and child-group capabilities only on child rooms.

Failures are field-level errors on the form, never silent. Because `type Tag =
keyof typeof profile.tags`, a bad tag in *code* is a compile error, and a zod
enum derived from the same object makes a bad tag from a *request* a validation
error. There is no path by which an unknown tag enters the log.

Tags removed from the profile mid-run are the one remaining case, handled as
preflight C7 (§6): the fold retains them, the solver ignores them, the
report names them.

### Authorisation

A family may `LabelSet` / `LabelCleared` only:

- on entities it owns (itself, or its own people);
- for tags declaring `familyFacing`;
- at strengths that control permits.

Everything else is admin-only. Admin-only labels are never rendered in the
family portal.

---

## 5. Two generic handlers

The generic handlers keep constraint evaluation in one auditable place.

### 5.1 `rules/hard/tagRequirements.ts`

```ts
export const tagRequirements: Rule = {
  id: 'hard.tagRequirements',
  since: '2.0.0',

  evaluate(party, room, ctx) {
    const have = ctx.capabilities(room)
    const missing: Tag[] = []

    for (const req of party.requirements) {
      const def = profile.tags[req.tag]
      const ok = def.satisfiedBy
        ? have.has(def.satisfiedBy)
        : def.check!(party, room, ctx)       // structural, e.g. sole-occupancy
      if (!ok && req.strength === 'required') missing.push(req.tag)
    }

    return missing.length ? infeasible(missing) : 0
  },

  describe(party, room, ctx) {
    const missing = /* as above */
    return missing.length
      ? `${roomLabel(room)} fehlt: ${missing.map(t => profile.tags[t].label).join(', ')}`
      : null
  },
}
```

Its soft counterpart, `rules/soft/tagPreferences.ts`, is the same loop over
`strength === 'preferred'`, returning `+weight` on satisfaction and `+penalty`
on violation (see [event profiles](16-event-profiles.md) §4 for the two-field
convention).

Two requirement shapes are supported, and the distinction matters:

- **`satisfiedBy: 'ensuite'`** — a room capability. A set lookup.
- **`check: (party, room, ctx) => boolean`** — structural, depending on the
  placement rather than the room. `sole-occupancy` asks whether every current
  occupant belongs to this party, which no capability can express.

### 5.2 `tagRelations`

One handler, split across two phases because relations act at different points.

**In party formation** (`parties.ts`), for `kind: 'same-room'`:

```
edges = mutual pairs at strength 'required'
union-find over edges → components
each component merges its members' residue parties
```

Non-mutual, or mutual at `preferred`, becomes a soft term worth
`oneSidedWeight`.

**In placement** (`rules/`), for the rest:

| `kind` | Acts as | Where |
|---|---|---|
| `same-room` | merge (mutual required) or soft bonus | parties / soft |
| `not-same-room` | hard rule pruning rooms | hard |
| `adjacent` | soft, scaled by `room_adjacency.distance` | soft |
| `same-workshop` | co-assignment group | workshop solver |

`symmetry` has three values:

- `mutual-required` — both directions must exist at `required` to bind.
- `implied-mutual` — one row binds both directions. Used by `apart-from`; it is
  what a pair-normalizing relational table would express.
- `one-sided-soft` — never binds; always a preference.

**The unplaceable-merge guard is generalized.** If a
merged component's `bedDemand` exceeds the largest room's place count, the merge
is refused, downgraded to a preference, and reported as an error-severity
preflight finding. Without it the solver builds a party no room can hold and then
reports it unplaced with no explanation.

### 5.3 Party tags

Party requirements are **derived**, never stored: the union of its member
families' requirement tags, with the strictest strength winning
(`required` > `preferred`).

**Consequence worth knowing:** in a merged party, one family's `required` binds
everyone. Two families merge, one requires an ensuite, and the merged party of
six now needs a six-place ensuite room that may not exist. The unplaceable-merge
guard catches the capacity case; this one surfaces as preflight C4 with the
requirement named. It is the correct semantics — they *are* sharing a room — but
it surprises people, so the party card in
[admin interface](09-admin-interface.md) §4 shows which member contributed each requirement.

---

## 6. Preflight

A phase running **before** party formation, on the plan's solver input alone. Output
is stored on the plan and rendered on the dashboard.

Its value is timing. A resolver surfaces infeasibility as a post-hoc "38 rooms rejected
on capacity" after a full solve. Preflight says it in week two, before a single
placement runs.

| | Check | Severity |
|---|---|---|
| C1 | A requirement is required by ≥1 entity and no room holds the paired capability | error |
| C2 | A relation's `value` names a withdrawn or absent entity | error |
| C3 | Contradictory tags on one entity (`sole-occupancy: required` with any `room-with: required`) | error |
| C4 | A mutual-required component's bed demand exceeds the largest feasible room | error |
| C5 | Scope violation — a person-scoped tag on a family | error |
| C6 | `validFor` failure — a child-group requirement on a non-child person or a child-group capability on a non-child room | warning |
| C7 | An assignment names a tag no longer in the profile | warning |
| C8 | **Requirement arithmetic** — demand for a capability exceeds supply | error |
| C9 | A transitive merge cascade produced a party nobody asked for | info |

### C8 is the one to build first

```
for each requirement tag R:
    demand = Σ bedDemand of parties requiring R at 'required'
    supply = Σ places in rooms holding satisfiedBy(R)
    if demand > supply: error
```

> **C8 · needs-ensuite** — 19 beds required, 14 available.
> Five people cannot be placed regardless of how the rooms are arranged.
> Families affected: Braun (5), Weber (4), Koch (2), Lang (3), Ott (5).

That is a phone call, not a re-solve, and the earlier it appears the cheaper it
is. Run it per requirement tag, plus once for the intersection of any two
requirements that co-occur on the same party.

### Severity behaviour

- **error** — the plan computes and stores, but publishing requires an explicit
  acknowledgement. Never block computing: an admin needs to see the plan to
  understand the error.
- **warning** — shown on the dashboard, no gate.
- **info** — shown on the relevant screen only.

---

## 7. Ordered values

A ranking is person → slot → *ordered list*. Rank is not strength: strength is
how binding a preference is, rank is position in a list. They are independent
dimensions represented in the structured label value and its constraint
definition.

The resolver validates the ordering constraint:

The structured label value contains the slot, workshop, and rank. The resolver
checks that no two ranks collide for one person and slot.

Workshop rankings remain ordered values, represented by the `ordered-choice`
constraint operator.

All workshop properties are labels:

| Fact about a workshop | Mechanism |
|---|---|
| Who ranked it, and in what order | `prefers-workshop` structured labels |
| Age bounds, capacity | `min-age`, `max-age`, and `capacity` labels |
| "Lena must be with her brother" | `workshop-with=per_x`, a relation tag |

### Co-assignment groups

`workshop-with` at `mutual-required` forms a group that the workshop solver
treats as one claimant.

The group's preference ordering is the **sum of its members' ranks** per
workshop, lowest first; an unranked workshop counts as `n + 1`. Ties break on the
lowest member `person_id`. This is explainable in the trace, which is why it beats
using one member's list:

> **Klettern** — group (Lena Schmidt, Tom Schmidt) assigned, combined rank 4.
> Lena ranked it 1st, Tom 3rd. Tom's own 1st choice was Töpfern.

If a group's size exceeds the remaining capacity of every workshop it could
otherwise claim, the group is split and reported rather than cascaded — the same
shape as the unplaceable-merge guard.

---

## 8. Sharp edges

---

**Typos become silence.** `room-with=fam_72` for `fam_27` — a relational foreign
key would catch that; a label does not. The merge simply never happens and
nothing errors.
This is why append-time check 3 (§4) and preflight C2 both exist. Neither is
optional; together they restore the property that a constraint either applies or
is visibly reported.

**Derived-and-assigned drift.** A capability with a `derive` must reject
assignments, or you get two answers to "does Room 14 have an ensuite". Enforced
at append time and tested in [testing](14-testing.md).

**Requirement inflation through merges.** See §5.3. The strictest-strength union
is correct and surprising.

**Labels as a dumping ground.** `descriptive` is the pressure valve — annotations
that the solver ignores. Without it, admins will reach for a constraint-kind tag
to record a note, and the solver will act on it. Make `descriptive` easy and
obvious in the admin UI.

**Canonical ordering.** Labels are an array in the solver input and must be sorted
like every other one: `entity_id`, `key`, `value`.
[room assignment](05-room-assignment.md) §1 R1 applies unchanged, and the
shuffle-invariance test covers it once the array is added to the solver input.
