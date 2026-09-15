# 14 — Tags

**Status:** rev2. Supersedes parts of [02-data-model](02-data-model.md) §4,
[03-events](03-events.md) (five event types), and
[04-solver-rooms](04-solver-rooms.md) §2, §3 and §5. See
[rev2-delta](rev2-delta.md) for the precise list.

A single mechanism replacing four preference tables and five event types, and
turning most future constraints from a migration into a registry entry.

The vocabulary lives in code — see [15-event-config](15-event-config.md). This
document covers what tags *are*, how they are stored, and how the solver
consumes them.

---

## 1. What a tag is

A named fact about an entity, optionally pointing at another entity, optionally
carrying a strength.

```
#ensuite                          a room has its own bathroom
#needs-ensuite (required)         a family cannot accept a room without one
#needs-ensuite (preferred)        a family would rather have one
#room-with=fam_27                 this family wants to room with family 27
#child-room-ok                    this child may sleep in a children's room
#sole-occupancy (required)        this family will not share with another
```

Four kinds, declared in the registry:

| Kind | Scope | Strength | Meaning |
|---|---|---|---|
| `capability` | room | — | The room offers something |
| `requirement` | family, person | required / preferred | The holder needs or wants something |
| `relation` | family, person | required / preferred | A constraint between two entities |
| `descriptive` | any | — | Recorded for humans; the solver ignores it |

`descriptive` exists so that admins can annotate without inventing a constraint.
A tag the solver reads is a decision; a tag it ignores is a note.

### The three-value scale collapses

rev1's `family_room_pref.ensuite ∈ {required, preferred, indifferent}` becomes:

| rev1 | rev2 |
|---|---|
| `required` | `needs-ensuite` at strength `required` |
| `preferred` | `needs-ensuite` at strength `preferred` |
| `indifferent` | no row |

`indifferent` stops being a value and becomes an absence, which is what it always
meant. The tri-state control in the family portal writes one of two strengths or
deletes the row. `sharing ∈ {happy, prefer_not, refuse}` maps the same way onto
`sole-occupancy`: absent, `preferred`, `required`.

---

## 2. Storage

One table. It replaces `family_room_pref`, `child_room_optin`,
`co_room_request` and `keep_apart`.

```sql
CREATE TABLE tag_assignment (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('room','family','person','workshop')),
  entity_id   TEXT NOT NULL,
  tag         TEXT NOT NULL,
  value       TEXT NOT NULL DEFAULT '',
  strength    TEXT          CHECK (strength IN ('required','preferred')),
  set_at      TEXT NOT NULL,
  set_by      TEXT NOT NULL,             -- actor string from the event
  PRIMARY KEY (entity_type, entity_id, tag, value)
);

CREATE INDEX tag_by_tag    ON tag_assignment(tag, entity_type, entity_id);
CREATE INDEX tag_by_value  ON tag_assignment(tag, value) WHERE value <> '';
```

Three details that are not arbitrary.

**`value` is `NOT NULL DEFAULT ''`, not nullable.** SQLite permits NULLs in the
columns of an ordinary table's `PRIMARY KEY` — a documented deviation from the
standard — which would make `(fam_17, 'needs-ensuite', NULL)` insertable twice.
An empty string is ugly and it is enforceable. Non-parameterised tags always
store `''`.

**The reference lives in `value`, not in the tag string.** `#room-with=fam_27` is
the mental model and the label an admin sees; storage keeps `tag = 'room-with'`
and `value = 'fam_27'`. That gives an indexable lookup, makes mutuality a plain
self-join, and means the registry holds one entry per relation rather than one
per family.

**`tag` carries no foreign key.** The registry is code, so there is nothing to
reference. Validity is enforced on append (§4) and on replay (preflight C7).

### Mutuality is a self-join

```sql
SELECT a.entity_id AS from_id, a.value AS to_id
FROM tag_assignment a
JOIN tag_assignment b
  ON b.tag = a.tag
 AND b.entity_id = a.value
 AND b.value     = a.entity_id
WHERE a.tag = 'room-with'
  AND a.strength = 'required' AND b.strength = 'required'
  AND a.entity_id < a.value;
```

Same shape as rev1's `co_room_request` join. Nothing lost.

### What stays typed

Tags do not absorb everything, and the boundary is worth stating so it does not
drift:

| Stays typed | Why |
|---|---|
| `person.birthdate`, `role`, `occupies_bed` | In every query; not a recurring-invention problem |
| `room.number`, `floor`, `kind`, `designation` | Structural; the solver branches on them |
| `room.has_ensuite`, `is_outside`, `is_accessible` | Stable, and they *derive* capabilities (§3) |
| `place` rows | Capacity is `count(places)`, and published output names beds |
| `workshop.capacity`, `min_capacity`, age bounds | Counted and compared, not matched |
| `workshop_pref` | A dense ordered list — see §7 |
| `pin` | Its own taxonomy and lifecycle |

**The absorption principle**, stated once so the next decision is easy:

> Tags absorb sparse, individually-toggled, boolean-or-graded facts, and
> relations between entities. They do not absorb dense ordered lists, quantities
> that get counted, or anything the solver branches on structurally.

---

## 3. Capabilities come from two places

A room's capability set is the union of what is derived from its columns and what
is assigned in `tag_assignment`:

```ts
function capabilities(room: Room, assigned: TagAssignment[]): ReadonlySet<Tag> {
  const out = new Set<Tag>()
  for (const [tag, def] of registryEntries('capability')) {
    if (def.derive?.(room)) out.add(tag)
  }
  for (const a of assigned) {
    if (a.entity_type === 'room' && a.entity_id === room.id
        && registry[a.tag]?.kind === 'capability') out.add(a.tag)
  }
  return out
}
```

This is the mechanism that keeps the three-stage maturity model
([06-pins-and-evolution](06-pins-and-evolution.md)) working without forcing a
migration for every new room property:

- `ensuite` and `ground-floor` **derive** from `has_ensuite` and `floor`. No
  double entry, no drift, no hand-tagging 40 rooms.
- `near-the-hall`, invented in week three, is **assigned** in `tag_assignment`.
  No migration.
- If `near-the-hall` turns out to matter every year, it graduates to a column
  with a `derive`, and the assignments are deleted.

One rule: **a capability is derived or assigned, never both.** A registry entry
with a `derive` rejects assignments at append time, because two sources of truth
for the same fact is exactly what the derivation was added to avoid.

---

## 4. Validation on append

`TagSet` is validated against the registry before it is appended
([03-events](03-events.md)). Five checks, all cheap:

1. **Tag exists** in the registry, or resolves through an `alias`.
2. **Scope matches** — `registry[tag].scope` includes `entity_type`.
3. **`value` is present iff the tag declares a `param`**, and names an entity of
   the declared type that exists and is not withdrawn.
4. **Strength is legal** — `required` only if the registry permits it;
   capabilities reject strength entirely.
5. **`validFor` passes** — the registry's predicate on the entity, e.g.
   `child-room-ok` requires `role === 'child'`.

Failures are field-level errors on the form, never silent. Because `type Tag =
keyof typeof registry`, a bad tag in *code* is a compile error, and a zod enum
derived from the same object makes a bad tag from a *request* a validation error.
There is no path by which an unknown tag enters the log.

Tags removed from the registry mid-run are the one remaining case, handled as
preflight C7 (§6): the projection retains them, the solver ignores them, the
report names them.

### Authorisation

A family may `TagSet` / `TagCleared` only:

- on entities it owns (itself, or its own people);
- for tags declaring `familyFacing`;
- at strengths that control permits.

Everything else is admin-only. `apart-from` declares `adminOnly: true` and is
never rendered in the portal.

---

## 5. Two generic handlers

These replace eight per-constraint rule files from rev1.

### 5.1 `rules/hard/tagRequirements.ts`

```ts
export const tagRequirements: Rule = {
  id: 'hard.tagRequirements',
  since: '2.0.0',

  evaluate(party, room, ctx) {
    const have = ctx.capabilities(room)
    const missing: Tag[] = []

    for (const req of party.requirements) {
      const def = registry[req.tag]
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
      ? `${roomLabel(room)} fehlt: ${missing.map(t => registry[t].label).join(', ')}`
      : null
  },
}
```

Its soft counterpart, `rules/soft/tagPreferences.ts`, is the same loop over
`strength === 'preferred'`, returning `+weight` on satisfaction and `+penalty`
on violation (see [15-event-config](15-event-config.md) §4 for the two-field
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
  what rev1's `CHECK (family_a < family_b)` expressed.
- `one-sided-soft` — never binds; always a preference.

**The unplaceable-merge guard from rev1 §A.3 is retained and generalised.** If a
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
[07-admin-ux](07-admin-ux.md) §4 shows which member contributed each requirement.

---

## 6. Preflight

A phase running **before** party formation, on the snapshot alone. Output is
stored on the plan and rendered on the dashboard.

Its value is timing. rev1 surfaced infeasibility as a post-hoc "38 rooms rejected
on capacity" after a full solve. Preflight says it in week two, before a single
placement runs.

| | Check | Severity |
|---|---|---|
| C1 | A requirement is required by ≥1 entity and no room holds the paired capability | error |
| C2 | A relation's `value` names a withdrawn or absent entity | error |
| C3 | Contradictory tags on one entity (`sole-occupancy: required` with any `room-with: required`) | error |
| C4 | A mutual-required component's bed demand exceeds the largest feasible room | error |
| C5 | Scope violation — a person-scoped tag on a family | error |
| C6 | `validFor` failure — `child-room-ok` on an adult | warning |
| C7 | An assignment names a tag no longer in the registry | warning |
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

## 7. Why workshop rankings are not tags

A ranking is person → slot → *ordered list*. Rank is not strength: strength is
how binding a preference is, rank is position in a list. They are independent
dimensions, so folding rankings in would need a fifth column meaningful for
exactly one tag kind and NULL on roughly 95% of rows.

**The decisive reason is enforceability.** rev1's index:

```sql
CREATE UNIQUE INDEX ON workshop_pref(person_id, slot_id, rank);
```

works because `slot_id` is a real column. In `tag_assignment` there is no slot —
it is implied by the workshop, which sits in `value` as an opaque string. So
"no two ranks collide within a slot" cannot be an index; it becomes a
hand-written check.

[02-data-model](02-data-model.md) argues throughout that the constraints worth
having are the ones the database refuses to violate — the same reasoning behind
`plan_place_unique_idx` and `plan_slot_unique_idx`. Trading a DB-enforced
invariant for application code is the wrong direction.

`workshop_pref` and `WorkshopPreferencesRanked` are **unchanged from rev1.**

Workshops therefore use both mechanisms, which is not an inconsistency:

| Fact about a workshop | Mechanism |
|---|---|
| Who ranked it, and in what order | `workshop_pref` |
| Age bounds, capacity | typed columns |
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

## 8. What rev2 removes

| rev1 | rev2 |
|---|---|
| `family_room_pref` | `tag_assignment` |
| `child_room_optin` | `tag_assignment` (`child-room-ok`) |
| `co_room_request` | `tag_assignment` (`room-with`) |
| `keep_apart` | `tag_assignment` (`apart-from`) |
| `RoomPreferenceStated` | `TagSet` / `TagCleared` |
| `ChildRoomOptInSet` | `TagSet` / `TagCleared` |
| `CoRoomRequested` | `TagSet` |
| `CoRoomRequestWithdrawn` | `TagCleared` |
| `AdminKeptApart` | `TagSet` (`apart-from`) |
| `soft/ensuite.ts`, `indoor.ts`, `coRoom.ts`, `crossFamily.ts` | `soft/tagPreferences.ts` |
| `hard/keepApart.ts`, `accessibility.ts` | `hard/tagRequirements.ts` |

Four tables and five event types become one table and two event types. Eight rule
files become two.

`hard/capacity.ts` and `hard/designation.ts` **stay** — they are structural
geometry, not tag matching, and forcing them through the tag handler would make
both harder to read.

---

## 9. Sharp edges

**Typos become silence.** `room-with=fam_72` for `fam_27` — rev1's foreign key
caught that; a tag does not. The merge simply never happens and nothing errors.
This is why append-time check 3 (§4) and preflight C2 both exist. Neither is
optional; together they restore the property that a constraint either applies or
is visibly reported.

**Derived-and-assigned drift.** A capability with a `derive` must reject
assignments, or you get two answers to "does Room 14 have an ensuite". Enforced
at append time and tested in [12-testing](12-testing.md).

**Requirement inflation through merges.** See §5.3. The strictest-strength union
is correct and surprising.

**Tags as a dumping ground.** `descriptive` is the pressure valve — annotations
that the solver ignores. Without it, admins will reach for a constraint-kind tag
to record a note, and the solver will act on it. Make `descriptive` easy and
obvious in the admin UI.

**Canonical ordering.** Tag assignments are an array in the snapshot and must be
sorted like every other one: `entity_type`, `entity_id`, `tag`, `value`.
[04-solver-rooms](04-solver-rooms.md) §1 R1 applies unchanged, and the
shuffle-invariance test covers it once the array is added to the snapshot.
