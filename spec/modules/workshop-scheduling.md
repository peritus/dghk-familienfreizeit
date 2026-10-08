# Workshop scheduling

Module id `workshop-scheduling` · factory `workshopScheduling`

Workshop scheduling owns event-backed workshop slots and derives one placement
per workshop from slots, spaces, resolved capabilities, leaders, and organiser
decisions. The active placement contract does not use ranking demand or
co-selection.

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

An organiser may add one `fixed-placement` label to a workshop. Its value is a
structured reference to the selected slot and space:

```ts
type FixedWorkshopPlacement = {
  slot_id: string
  space_id: string
}
```

The label is an ordinary event-backed organiser decision and may carry the
optional `LabelSet.note`. Clearing the label removes the fixed decision. The
solver derives the decision from the current world; it does not persist a
placement result or create a second placement identity.

Hard checks cover slot overlap, space availability and capacity, explicit
space-slot blocks, leader availability/conflicts, workshop needs/provided
capabilities, cancellation, and organiser-fixed placement decisions. The
automatic pass visits workshops and slot/space candidates in stable order and
chooses the first feasible candidate. It does not optimize placement from
individual demand or co-selection. Workshop-ranking demand remains a derived
summary for organiser review; see the accepted [deferred idea for demand-aware
scheduling](../deferred-ideas/demand-aware-workshop-scheduling.md).

## 3. Organiser review

Automatic placement and fixed placement are both derived from the same current
world. A valid fixed decision claims its selected slot/space before the
automatic pass. An invalid fixed decision remains visible as a blocking
diagnostic and is not silently replaced by an automatic choice. Review shows the
fixed result beside the automatic-only result it overrides; both are derived in
memory from the same solver input.

A reviewed calculation records the input sequence and compatibility context, so
a later ranking edit does not alter the reviewed result until an explicit
recalculation/review.

Placements reach families only through the closed workshop result
([phases](../architecture/phases.md) §5–6).

## 4. Tests

- Add, update, retire, replay, overlap, touching-window, and shuffle-invariant
  slot behavior.
- Space-slot blocks exclude only the blocked pair and remain inspectable.
- Every workshop receives at most one placement.
- Availability, capacity, needs/provides, leader conflicts, cancellation,
  fixed placement, invalid fixed placement, unscheduled diagnostics, and
  deterministic traces are tested.
- Late ranking edits leave a reviewed calculation stable until explicit review.
