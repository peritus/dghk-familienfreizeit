# Implemented room inventory

The selected `room-inventory` module is implemented in
[`src/modules/room-inventory/index.ts`](../../src/modules/room-inventory/index.ts)
and selected by the executable
[`familienfreizeit2027Profile`](../../src/config/profiles/familienfreizeit-2027.ts).
It is the first real module exercised by the runtime module boundary.

## Derived inventory

The event log remains the only domain state. `BuildingAdded`/`BuildingUpdated`/
`BuildingRemoved`, `RoomAdded`/`RoomUpdated`/`RoomRemoved`, `BedAdded`/`BedUpdated`,
and `BedRemoved` are organiser-only events. They fold into typed `building`, `room`,
and `bed` entities and generic setup labels. A bed creates deterministic
`plc_<bed-id>_<index>` place entities; reducing `sleeps` or removing a bed
hard-removes only the affected live places. Surviving place IDs and their labels are
preserved across bed updates. Historical state is obtained by deriving an event-log
prefix.

`inventoryWorld(world)` returns the typed derived summary containing ordered
`buildings`, `rooms`, `beds`, and `places`, total `capacity`, and price-derived
`cost_eur`. Room traits remain ordinary profile labels. The active profile defines
sanitary arrangement, price, apartment layout, and derived capabilities; the module
does not interpret those traits or decide assignments.

The fold validates live parent references, unique room numbers within a building,
unique bed labels within a room, configured floor/room/bed vocabularies, id prefixes,
setup-only module-label ownership, and removal preconditions (a building must have no
rooms and a room no beds). Configured `exactly-one` labels are checked on live
entities; incomplete prospective batches fail before an append. Full restatements
clear optional setup labels when their payload value is null.

## Active occasion fixture

[`test/fixtures/m5/familienfreizeit-2027.kdl`](../../test/fixtures/m5/familienfreizeit-2027.kdl)
contains the five buildings, 38 rooms, apartment descriptors for rooms 35–37, and
162 live sleeping places from the occasion inventory. The replay test verifies stable
ordering and place IDs, the 162-place capacity, and the €15,236 cost summary.

## Organiser surface and limits

`/organiser/inventory` is registered by the selected module and uses the shared
organiser local-first event pipeline. It shows building cards, semantic room rows,
bed details, capacity, profile-defined room traits, derived capabilities, and cost
summaries. Organisers can add, edit, and remove buildings, rooms, and beds, with
removal blocked until dependent entities are handled. New and edited rooms stage
their required profile labels in the same event batch as the room event. No
assignment board, free-place calculation against a plan, accommodation report
route, family view, or solver stage is included; those remain M6/M11/M10 work
respectively.

The module contributes world checks for rooms without places, no live capacity while
people exist, and constraints that name a removed place. These diagnostics are kept
outside persisted state.
