# Deferred idea: room adjacency

*Status:* deferred. Not part of the specification and not selected by any profile.
This sketch records how the idea would work as a module if it is ever picked up;
adopting it means adding it back to the module catalogue and to every document
listed under "Integration points".

Proposed module id `room-adjacency` · factory `roomAdjacency`

## 1. Purpose and boundary

Room adjacency gives every pair of rooms a small integer distance, so that a soft
preference can reward placing related parties near each other when they cannot
share a room. It owns the distance and its organiser override. It does not form
parties or place them.

## 2. Dependencies

Requires: [`room-inventory`](../20.1-room-inventory.md). Enhances: none.

Enhances [`room-assignment`](../20.3-room-assignment.md), which reads the distance
for the `adjacent_weight` term of co-room relations.

## 3. Parameters

```ts
type RoomAdjacencyParams = {
  same_floor: 1 | 2 | 3             // distance between rooms on one floor of one building
  same_building: 1 | 2 | 3          // distance between floors of one building
  other_building: 1 | 2 | 3         // distance between buildings
}
```

| Parameter | Default | Validation |
|---|---|---|
| `same_floor` | `1` | `same_floor ≤ same_building ≤ other_building` |
| `same_building` | `2` | as above |
| `other_building` | `3` | as above |

## 4. Entity kinds

None.

## 5. Events

### `RoomAdjacencySet`

```ts
{ room_a: string, room_b: string, distance: 1 | 2 | 3 }
```

Organiser override of the derived distance for one pair. The fold stores it for both
directions. A later event for the same pair replaces it.

### `RoomAdjacencyCleared`

```ts
{ room_a: string, room_b: string }
```

Returns the pair to the derived distance.

*Invariants:* both rooms exist and differ. Both events are organiser-only.

## 6. Labels and tag roles

Module-owned label key:

| Key | Scope | Value | Cardinality |
|---|---|---|---|
| `adjacency-override` | room | `{ room: string, distance: 1 \| 2 \| 3 }` | zero or more, one per other room |

Set only by the module's events.

Tag roles: none. Relation tags opt into adjacency through their own
`adjacent_weight` ([room assignment](../20.3-room-assignment.md) §8).

## 7. Solver input and stages

```ts
type AdjacencyInput = {
  adjacency: readonly { room_a: string, room_b: string, distance: 1 | 2 | 3 }[]
  // one row per unordered pair with room_a < room_b; sort: room_a, room_b
}
```

The distance for a pair is the override if one exists, otherwise `same_floor` when
both rooms share building and floor, `same_building` when they share a building,
and `other_building` otherwise. A room without a floor counts as a different floor.

Stages: none.

## 8. Rules and scoring

None of its own. `room-assignment` scales an adjacency bonus as
`adjacent_weight × (4 − distance) / 3`, rounded toward zero, so the term stays an
integer.

## 9. Preflight checks

None.

## 10. Output and diff

No plan section. `world.adjacency(room_a, room_b)` returns the distance.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Screen | Inventory room detail gains a "near to" list with override controls ([UI-08](../ui/08-inventory.md)) |
| Controls, reports, emails | none |

## 12. Tests

- Derived distances match the parameters for each building and floor combination.
- An override applies symmetrically and `RoomAdjacencyCleared` restores the
  derived value.
- Adjacency rows are sorted and covered by shuffle invariance.

## 13. When not selected

No distance exists. Relation tags that declare `adjacent_weight` fail the profile
build, and co-room preferences score only same-room placement.

## Integration points

Adopting the idea would require, beyond this module:

- **Room assignment:** `enhances: ['room-adjacency']` and an adjacency part of
  `soft.co-room` scoring parties that cannot share a room by distance.
- **Sleeping parties:** the refused-merge trace could promise to try to place the
  families near each other.
- **Occasion profiles:** an `adjacent_weight` field on relation tags.
- **Events:** `RoomAdjacencySet` and `RoomAdjacencyCleared` in the module event
  table.
- **Inventory screen:** a "near to" list with override controls on room detail.
