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

[`test/fixtures/room-inventory/familienfreizeit-2027.kdl`](../../test/fixtures/room-inventory/familienfreizeit-2027.kdl)
contains the five buildings, 38 rooms (rooms 35–37 are apartment-type), and
162 live sleeping places from the occasion inventory. The replay test verifies stable
ordering and place IDs, the 162-place capacity, and the €15,236 cost summary.

## Organiser surface and limits

`/organiser/inventory` is registered by the selected module and uses the shared
organiser local-first event pipeline. It shows a stats strip, expandable building
sections with real `<table>` room rows, bed details, capacity, profile-defined
room traits shown as columns or tags, and cost summaries. Derived capabilities
(e.g. `private-sanitary`) stay internal matching data and are never rendered;
only the room's own traits and their configured copy reach the UI. Organisers
can add, edit, and remove buildings, rooms, and beds, with removal blocked
until dependent entities are handled (a blocked building delete explains why
inline rather than disabling the button) and a confirmation step for deleting
a room or bed. New and edited rooms stage their required profile labels in
the same event batch as the room event. Bed capacity follows from `bed_type`
alone (`single`/`double`/`bunk`) via `sleepsForBedType`; there is no separate
capacity input. Room inventory does not own the assignment board or report route;
those are provided by [`room-assignment`](room-assignment.md). The apartment
"Schlafraum" bed grouping still needs its own bed-schema decision beyond this UI
pass.

The module contributes world checks for rooms without places, no live capacity while
people exist, and constraints that name a removed place. These diagnostics are kept
outside persisted state. Assignment review and the printable assignment report are
owned by `room-assignment`; inventory remains the editor and derived source for room
capabilities and capacity.
