# Workshop scheduling

Module id `workshop-scheduling` · factory `workshopScheduling`

Workshop scheduling owns event-backed workshop slots and derives one placement
per workshop from slots, spaces, resolved capabilities, demand, leaders, and
organiser decisions.

## 1. Slots

`workshop-slot` is a typed entity with caller-generated stable identity. Slots
are organiser data, not constants embedded in the UI.

```ts
type WorkshopSlotRestatement = {
  slot_id: string
  starts_at: string
  ends_at: string
  sort_key: number
}

type WorkshopSlotAdded = WorkshopSlotRestatement
type WorkshopSlotUpdated = WorkshopSlotRestatement
type WorkshopSlotRetired = { slot_id: string; reason: string | null }
```

Timestamps are canonical instants, `starts_at < ends_at`, and live slots may
not overlap or touch. Retiring a slot preserves identity and causes affected
placements to produce diagnostics rather than silently moving.

The persisted slot has no capacity. The organiser UI accepts `starts_at` as a
local start datetime and a positive integer `duration_minutes`, derives
`ends_at`, and stages only the canonical start/end event fields. Workshop
capacity remains on workshops; physical capacity remains on workshop spaces.

The scheduling boundary also records explicit space-slot blocking/unblocking
facts. The space screen exposes these as a simple per-slot availability editor;
the resolver and scheduler consume them as typed constraints.

<a id="2-stages"></a>
## 2. Placement

Each active workshop has zero or one derived placement:

```ts
type WorkshopPlacement = {
  workshop_id: string
  slot_id: string
  space_id: string
}
```

There is no additional placement entity. A workshop without a feasible placement remains a
visible unscheduled outcome with a blocking diagnostic.

Hard checks cover slot overlap, space availability and capacity, explicit
space-slot blocks, leader availability/conflicts, workshop needs/provided
capabilities, cancellation, and organiser-fixed placement decisions. Demand and
profile-defined scoring terms are deterministic soft inputs.

## 3. Organiser review

Automatic placement is the initial UI path. The domain also accepts typed
organiser decisions for fixed workshop placement, with resolver diagnostics and
precedence. A reviewed calculation records the input sequence and compatibility
context, so a later ranking edit does not alter the reviewed result until an
explicit recalculation/review.

Released/effective schedule composition belongs to M10 release control and is not
part of the M8 organiser review surface.

## 4. Tests

- Add, update, retire, replay, overlap, touching-window, and shuffle-invariant
  slot behavior.
- Space-slot blocks exclude only the blocked pair and remain inspectable.
- Every workshop receives at most one placement.
- Availability, capacity, needs/provides, leader conflicts, cancellation,
  fixed placement, unscheduled diagnostics, and deterministic traces are tested.
- Late ranking edits leave a reviewed calculation stable until explicit review.
