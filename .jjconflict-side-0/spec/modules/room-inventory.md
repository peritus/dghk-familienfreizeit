# Room inventory

Module id room-inventory · factory roomInventory

The M5 inventory contract is implemented and documented in
[implemented room inventory](../../docs/modules/room-inventory.md). That document
is authoritative for the verified event fold, setup labels, deterministic places,
validation, active profile fixture, world summaries, diagnostics, and organiser
screen. The event log remains the only persisted domain state.

The sections below retain only consumers that are still outstanding.
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

## 9. Remaining report contribution

| Kind | Contribution |
|---|---|
| Report | *Capacity and accommodation cost overview*, inventory part: places by building and room type; cost when the profile defines a price trait ([reports](../application/reports.md) §3.3) |

## 10. When not selected

No building, room, bed, or place kinds exist; inventory events fail replay; the
inventory screen and room reports are absent. Room modules cannot be selected, and
[`workshops`](workshops.md) cannot locate a workshop in a room.
