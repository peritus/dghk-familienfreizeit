# Room inventory

Module id `room-inventory` · factory `roomInventory`

## 1. Purpose and boundary

Room inventory records the physical sleeping accommodation of an occasion:
buildings, rooms, beds, and the places a bed provides. It owns identity, location,
and capacity. It does not decide who sleeps where; that is the job of
[room assignment](room-assignment.md). Sleeping-party placement belongs to a
separate module boundary.

Everything else a profile wants to say about a room — sanitary arrangement, price,
apartment layout, "near the hall" — is a profile trait stored as an ordinary label on
the room. Capabilities the solver matches against are derived from those labels or
assigned directly ([labels and constraints](../architecture/labels-and-constraints.md) §3).

This document is the authoritative description of inventory events, place
generation, and room capacity.

## 2. Dependencies

Requires: none. Enhances: none.

Required by [`room-assignment`](room-assignment.md). Sleeping parties use a
separate module boundary. Enhanced by
[`workshops`](workshops.md), which may locate a workshop in a room.

## 3. Parameters

```ts
type RoomInventoryParams = {
  floors: readonly string[]          // allowed floor values, in display order
  room_types: readonly string[]      // allowed room types, in display order
  bed_types: readonly string[]       // allowed bed types, in display order
  copy: {
    floors: Readonly<Record<string, LocalizedText>>
    room_types: Readonly<Record<string, LocalizedText>>
    bed_types: Readonly<Record<string, LocalizedText>>
  }
}
```

| Parameter | Default | Validation |
|---|---|---|
| `floors` | `['ground']` | non-empty, unique, kebab-case |
| `room_types` | `['standard']` | non-empty, unique, kebab-case |
| `bed_types` | `['single', 'double']` | non-empty, unique, kebab-case |
| `copy` | English identifiers | every listed value has copy in the profile locale |

## 4. Entity kinds

| Kind | Id prefix | Created by | Identity notes |
|---|---|---|---|
| `building` | `bld_` | `BuildingAdded` | caller-generated |
| `room` | `rm_` | `RoomAdded` | caller-generated |
| `bed` | `bed_` | `BedAdded` | caller-generated; `BedRemoved` sets `retired_seq` |
| `place` | `plc_` | the fold, from a bed's `sleeps` | derived: `plc_<bed id without prefix>_<index>`, index from 1 |

A place is one sleeping position: a single bed has one, a double bed two. Place ids
are deterministic because constraints may target a place, and the id must survive
re-derivation. A bed whose `sleeps` drops from 2 to 1 retires its second place at
that event's `seq`.

## 5. Events

Each inventory event declares an explicit field mapping. Entity ids and `sort_key`
are identity-only; the remaining fields map to the canonical label keys listed
below. D18 does not infer label keys from payload field names.

### `BuildingAdded` / `BuildingUpdated`

```ts
{ building_id: string, name: string, sort_key: number }
```

Mapping: `building_id` is identity-only; `name` maps to `name`.
`BuildingUpdated` is a full restatement.

### `RoomAdded` / `RoomUpdated`

```ts
{
  room_id: string,
  building_id: string,
  number: string,
  floor: string | null,
  room_type: string,
  sort_key: number
}
```

Mapping: `room_id` is identity-only; `building_id` maps to `located-in`,
`number` to `number`, `floor` to `floor`, and `room_type` to `room-type`.
`RoomUpdated` is a full restatement. *Invariants:* the building exists and is not
retired; `number` is unique within the building; `floor` and `room_type` are in the
module parameters.

### `BedAdded` / `BedUpdated`

```ts
{
  bed_id: string,
  room_id: string,
  label: string,
  bed_type: string,
  sleeps: 1 | 2,
  sort_key: number
}
```

Mapping: `bed_id` is identity-only; `room_id` maps to `located-in`, `label` to
`label`, `bed_type` to `bed-type`, and `sleeps` to `sleeps`. The fold generates the
bed's places. *Invariants:* the room exists; `label` is unique within the room;
`bed_type` is in the module parameters.

### `BedRemoved`

```ts
{ bed_id: string, reason: string | null }
```

Mapping: `bed_id` is identity-only; `reason` is history-only. The event retires
the bed and its places. A constraint naming a retired place is reported by
preflight rather than silently dropped.

All inventory events are organiser-only.

```kdl
BuildingAdded building_id=bld_haupthaus name="Haupthaus" sort_key=1
RoomAdded room_id=rm_08 building_id=bld_haupthaus number="8" floor="first" room_type=standard sort_key=8
BedAdded bed_id=bed_08-a room_id=rm_08 label="8-A" bed_type=single sleeps=1 sort_key=1
BedAdded bed_id=bed_08-b room_id=rm_08 label="8-B" bed_type=single sleeps=1 sort_key=2
```

## 6. Labels and trait roles

Module-owned label keys, each owned for the entity kind in its scope. A profile
may not define a trait using one of these keys on that kind; the same key stays free
on other kinds ([modules](contract.md) §3.1).

| Key | Scope | Value | Cardinality | Set by |
|---|---|---|---|---|
| `name` | building | text | exactly one | `BuildingAdded`, `BuildingUpdated` |
| `located-in` | room → building, bed → room, place → bed | entity id | exactly one | inventory events, the fold |
| `number` | room | text | exactly one | `RoomAdded`, `RoomUpdated` |
| `floor` | room | one of `floors` | zero or one | `RoomAdded`, `RoomUpdated` |
| `room-type` | room | one of `room_types` | exactly one | `RoomAdded`, `RoomUpdated` |
| `label` | bed | text | exactly one | `BedAdded`, `BedUpdated` |
| `bed-type` | bed | one of `bed_types` | exactly one | `BedAdded`, `BedUpdated` |
| `sleeps` | bed | `1` or `2` | exactly one | `BedAdded`, `BedUpdated` |

These keys are set only through their events; a `LabelSet` naming one is rejected.
Profile traits scoped to `room`, `bed`, or `place` are ordinary labels set with
`LabelSet` by an organiser.

The module exposes two read-only helpers, never stored as labels:

- `placeCount(room)` — live places located in the room's live beds, exposed as `InventoryRoom.place_count`;
- `buildingOf(room)` — the `located-in` target.

Trait roles: none. The module interprets no profile trait. A profile's capability traits
may derive from module-owned keys, for example `ground-floor` from `floor = ground`.

## 7. Solver input and stages

Contributes to `SolverInput`:

```ts
type InventoryInput = {
  buildings: readonly InventoryBuilding[]  // sort: sort_key, id
  rooms: readonly InventoryRoom[]          // sort: building sort_key, sort_key, id
  places: readonly InventoryPlace[]        // sort: room order, bed sort_key, bed id, index
}

type InventoryRoom = {
  id: string
  building_id: string
  place_count: number
  sort_key: number
}

type InventoryPlace = { id: string, bed_id: string, room_id: string, index: number }
```

Every live room contributes to solver input. Retired beds and places are excluded
when the solver input is built; room assignment applies capacity and the resolved
requirements, exclusions, separations, and decisions to every remaining room.

Stages: none. Inventory is input, not a decision.

## 8. Rules and scoring

None. Capacity and placement rules belong to the placement modules that apply them.

## 9. Preflight checks

| Id | Severity | Fires when |
|---|---|---|
| `room-inventory.room-without-places` | warning | a live room has no live places |
| `room-inventory.retired-place-constrained` | error | an active constraint names a retired place |
| `room-inventory.no-capacity` | error | people exist and no live room has places |

## 10. Output and diff

No plan section. `diff` reports inventory changes only through the placement
modules whose assignments they move.

The derived world exposes `world.buildings`, `world.rooms`, `world.beds`, and
`world.places`, ordered as in §7.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Screen | `/organiser/inventory` — buildings, rooms, beds, and room traits ([UI-08](../ui/screens/inventory.md)) |
| Report | *Capacity and accommodation cost overview*, inventory part: places by building and room type; cost when the profile defines a price trait ([reports](../application/reports.md) §3.3) |
| Controls | none |
| Emails | none |

## 12. Tests

- Place ids are stable across `BedUpdated` restatements and replay.
- `sleeps` 2 → 1 retires exactly the second place at that `seq`.
- A `LabelSet` on a module-owned key is rejected.
- `floor`, `room_type`, and `bed_type` outside the parameters are rejected.
- Shuffle invariance covers `buildings`, `rooms`, and `places`.
- Fixture contract: a profile selecting the module supplies a KDL inventory
  fixture with at least one building, one room of each used `room_type`, and one
  bed of each used `bed_type`.

## 13. When not selected

No building, room, bed, or place kinds exist; inventory events fail replay; the
inventory screen and room reports are absent. Room modules cannot be selected, and
[`workshops`](workshops.md) cannot locate a workshop in a room.
