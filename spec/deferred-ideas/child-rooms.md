# Optional design: child rooms

*Status:* Not part of the active specification and not selected by any profile.
This sketch records how the capability would work as a module; adopting it means
adding it to the module catalogue and to every document listed under
"Integration points".

Proposed module id `child-rooms` · factory `childRooms`

## 1. Purpose and boundary

Child rooms lets children sleep together in rooms designated `child`, without their
families. Children name a *child group*; a child room provides one. The module places
children into child rooms **before** parties form, and returns any child it cannot
place to their family's party.

That ordering is the most important sequencing decision in room planning. If family
parties formed first, a child falling back to their family would change a party's
size after placement reasoning had begun, and determinism would die in the
patching. So children's groups are placed first and family parties form from the
residue.

Matching is explicit. There is no age band and no opt-in rule: a child carries a
requirement naming a child group, and a room carries the capability naming the same
group. Adult supervision, if needed, is modelled separately with ordinary relations.

## 2. Dependencies

Requires: [`sleeping-parties`](sleeping-parties.md), and through it
[`room-inventory`](../modules/room-inventory.md). Enhances: none.

Adopting it would add a `child` designation to `room-inventory`.

## 3. Parameters

```ts
type ChildRoomsParams = {
  needs_group_trait: string            // person requirement naming a child group
  provides_group_trait: string         // room capability naming a child group
  child_role: string                 // value of the kernel `role` label that is eligible
  priority_trait: string | null        // requirement whose holders are placed first
  min_occupants: number              // a child room with fewer children is not used
}
```

| Parameter | Default | Validation |
|---|---|---|
| `needs_group_trait` | — (required) | fills the child-group need role (§6) |
| `provides_group_trait` | — (required) | fills the child-group provision role (§6) |
| `child_role` | `'child'` | a value of the profile's `role` vocabulary |
| `priority_trait` | `null` | a `requirement` trait scoped to `person` or `family` |
| `min_occupants` | `2` | integer ≥ 1 |

## 4. Entity kinds

| Kind | Id prefix | Created by |
|---|---|---|
| `child-group` | `cg_` | `ChildGroupAdded` |

A child group is a stable name for "the children who should sleep together", such as
"Jungs 8–11". It is an entity so that a room and a child can reference the same thing
and a rename does not break either.

## 5. Events

### `ChildGroupAdded` / `ChildGroupUpdated`

```ts
{ child_group_id: string, name: string, description: string | null, sort_key: number }
```

Folds to `name` and `description` labels. `ChildGroupUpdated` is a full restatement.

### `ChildGroupRetired`

```ts
{ child_group_id: string, reason: string | null }
```

A retired group can no longer be named by new labels; existing labels naming it are
reported by preflight.

All child-group events are organiser-only.

```kdl
ChildGroupAdded child_group_id=cg_jungs-8-11 name="Jungs 8–11" description=#null sort_key=1
RoomDesignationChanged room_id=rm_02 designation=child reason=#null
LabelSet entity_id=rm_02 key=provides-child-group value=cg_jungs-8-11 strength=#null
LabelSet entity_id=per_jonas key=needs-child-group value=cg_jungs-8-11 strength=required
```

## 6. Labels and trait roles

Module-owned label keys on `child-group`: `name` (exactly one), `description` (zero
or one), both set only by the module's events.

| Role | Parameter | Required trait shape |
|---|---|---|
| Child-group need | `needs_group_trait` | `requirement`, scope `person`, value `ref('child-group')`, strengths `required` and `preferred`, cardinality zero or one, `valid_for` the person's `role` equals `child_role` |
| Child-group provision | `provides_group_trait` | `capability`, scope `room`, value `ref('child-group')`, assigned (not derived), `valid_for` the room's `designation` is `child` |

## 7. Solver input and stages

```ts
type ChildRoomsInput = {
  child_groups: readonly { id: string, sort_key: number }[]  // sort: sort_key, id
}
```

### Stage `child-rooms.place`

`before: ['sleeping-parties.form']`

```
eligible = persons where
    role = child_role
  and has a needs_group_trait label
  and not bound by an active required constraint to a place or room
      outside the child rooms

sort eligible by:
  1. holds priority_trait at any strength, first
  2. age at meta.starts_on, ascending
  3. family_id ascending
  4. person_id ascending

child_rooms = rooms where designation = child, sorted by (sort_key, id)

for each room in child_rooms:
    candidates = eligible, not yet placed, whose needs_group_trait value
                 the room provides
    take up to room.place_count, in eligible order
    if taken < min_occupants: release them
    else: place them in the room's places in place order; emit trace
```

**The lone-child rule.** A children's room with fewer occupants than
`min_occupants` is worse than no children's room: an isolated child and a wasted
bed. The module refuses it, and the released children return to their families.

Stage output:

```ts
type ChildRoomsOutput = {
  placements: readonly { person_id: string, room_id: string, place_id: string }[]
  released: readonly { person_id: string, reason: string }[]
  unused_rooms: readonly { room_id: string, candidates: number }[]
}
```

`sleeping-parties.form` treats every placed person as already housed. Released
people and children with a `preferred` need that was not met join their family's
residue party.

Trace, per child room:

> `K3` (Haus B, Raum 22, 6 places, Jungs 8–11) ← 5 children: Müller Jonas,
> Schmidt Lena, Weber Ada, Weber Nils, Braun Mia.
> 1 place left empty. Braun Tim has no matching child-group requirement.

Trace, per released child:

> Müller Jonas needs `Jungs 8–11`; `K3` and `K7` were full. Returned to family
> party. Müller party size 2 → 3.

That second line is what an organiser needs when the family asks why Jonas is not
with his friends.

## 8. Rules and scoring

None. Child-room placement is ordered, not scored.

## 9. Preflight checks

| Id | Severity | Fires when |
|---|---|---|
| `child-rooms.invalid-scope` | warning | a need is held by a person whose role is not `child_role`, or a provision is on a room not designated `child` |
| `child-rooms.group-without-room` | error | a child group is needed at `required` and no child room provides it |
| `child-rooms.group-demand-exceeds-places` | warning | required demand for a group exceeds the places of the rooms providing it |
| `child-rooms.retired-group` | error | a live label names a retired child group |

## 10. Output and diff

Plan section `child-rooms`: the stage output above. Room assignment includes the
placements in its own assignments, so there is one assignment list per plan.
`diff` reports a child moving into or out of a child room as a room change of that
child, attributed to the child's family.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Screen | Child-group management on the inventory screen; the children's-room section of the party review |
| Controls | none; the need trait declares its own control in the profile |
| Reports | Accommodation overview gains child-group capability and occupants per child room |
| Emails | none |

## 12. Tests

- Children are placed before parties form; released children appear in their
  family's residue party.
- A room below `min_occupants` releases everyone it took.
- Eligibility order is total and independent of input order.
- A `valid_for` failure is rejected at append and reported by preflight when the
  role or designation later changes.
- Fixture contract: one child room, one child group, one child released for
  capacity, and one child ineligible by role.

## 13. When not selected

No child groups exist; the `child` designation is invalid; the child-group traits
cannot be defined; party formation starts from whole families.

## Integration points

Adopting the idea would require, beyond this module:

- **Room inventory:** a `child` designation, available only to children's-room
  placement and rejected by `hard.designation` for ordinary parties.
- **Sleeping parties:** an `enhances: ['child-rooms']` hook so formation starts
  from the people `child-rooms.place` did not place, and an ordering constraint
  `after: ['child-rooms.place']`.
- **Room assignment:** reading `child-rooms.place`, pre-occupying child-room places,
  and `party_key: null` for child-room assignments. The known sharp edge that
  children in children's rooms fragment families into parties of one would apply.
- **Organiser view:** a children's-room section on party review, child-group
  management on inventory, and a child-group chip on board room cards.
- **Family view:** a "Kinderzimmer" section on the preferences page and a
  children's-room card on the assignment page.
- **Reports:** child-group capability and occupants in the accommodation overview.
- **Profile:** `needs-child-group` and `provides-child-group` traits, a
  `child-rooms` section in `family-preferences`, and `min_occupants`.
- **Tests:** a property test that every child-room assignment satisfies the
  child-group requirement, and a fixture with children released for capacity.
