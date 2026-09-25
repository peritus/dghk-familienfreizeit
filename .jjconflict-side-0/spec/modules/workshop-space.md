# Workshop space

Module id `workshop-space` · factory `workshopSpace`

## 1. Purpose and boundary

Workshop space records the physical places in which a future workshop schedule
may run. It owns stable workshop-space identity, display and location facts,
physical participant capacity, event-backed availability, and deterministic
organiser ordering. It does not schedule workshops, assign attendance, or
publish a location to families.

This first boundary deliberately has no `workshop-venue` parent hierarchy. A
space's display name and location description are sufficient until a later
requirement establishes a separate venue entity.

Facts are event-backed and the read model is derived in memory from the event
log. The module does not persist folded space state or maintain a second
relationship engine.

## 2. Dependencies

Requires: none. Enhances: none.

`official-workshops` is independently selectable. Self-organized sessions remain
deferred.
The [workshop scheduling](workshop-scheduling.md) module consumes this module's
input and owns scheduled offerings; workshop-space does not depend on proposal,
ranking, scheduling, or attendance policy.

## 3. Parameters

None. Capability values are occasion data resolved through the fixed generic
`needs`/`provides` mechanisms. This module does not define a profile-specific
capability vocabulary or executable occasion rules.

## 4. Entity kinds

| Kind | Id prefix | Created by | Identity notes |
|---|---|---|---|
| `workshop-space` | `wsp_` | `WorkshopSpaceAdded` | caller-generated and stable across updates |

There is no `workshop-venue` parent kind in this iteration. A space is a
physical scheduling candidate, not an accommodation `room`, `place`, or
`building`.

## 5. Events

```ts
type AvailabilityWindow = {
  starts_at: string
  ends_at: string
}

type WorkshopSpaceRestatement = {
  workshop_space_id: string
  name: string
  location_description: string
  capacity: number
  availability_windows: readonly AvailabilityWindow[]
  sort_key: number
}

type WorkshopSpaceAdded = WorkshopSpaceRestatement
type WorkshopSpaceUpdated = WorkshopSpaceRestatement

type WorkshopSpaceRetired = {
  workshop_space_id: string
  reason: string | null
}
```

`workshop_space_id` and `sort_key` are identity/order metadata. On add and
update, the other fields map explicitly to the module-owned labels in §6.
`WorkshopSpaceUpdated` is a full restatement; it never merges omitted values
into the previous fold.

All three events are organiser-only. A space may not be added twice, updated
after retirement, or retired twice. Retirement preserves the historical entity
and its labels but excludes it from current `WorkshopSpaceInput`.

`capacity` is an integer greater than or equal to zero. `name` and
`location_description` are non-empty strings. Every availability window has
`starts_at < ends_at`; timestamps are canonical ISO-8601 instants. The windows
must be ordered by start and must not overlap or touch. These checks run both
when appending and when replaying.

```kdl
WorkshopSpaceAdded workshop_space_id=wsp_hall name="Main hall" location_description="Ground floor, east wing" capacity=24 availability_windows=[{"starts_at":"2027-05-01T08:00:00Z","ends_at":"2027-05-01T18:00:00Z"}] sort_key=1
WorkshopSpaceUpdated workshop_space_id=wsp_hall name="Main hall" location_description="Ground floor, east wing" capacity=24 availability_windows=[] sort_key=1
WorkshopSpaceRetired workshop_space_id=wsp_old reason="Building closed"
```

The compact KDL example uses the repository's structured-value notation for
illustration; the event schema treats `availability_windows` as an ordered
array of objects.

## 6. Labels and trait roles

Module-owned label keys for `workshop-space` are set only by the three module
events. D18 requires the payload-to-label mapping to remain explicit.

| Key | Value | Cardinality | Set by |
|---|---|---|---|
| `name` | text | exactly one | add/update |
| `location-description` | text | exactly one | add/update |
| `capacity` | non-negative integer | exactly one | add/update |
| `availability-windows` | ordered availability-window array | exactly one | add/update |

The module owns no capability key. Organisers may use the existing generic
`provides` mechanism on a live space, and future scheduling requirements may
use `needs` against the same resolver output. Values remain generic labels;
the resolver supplies `resolved_capabilities` without a screen-local lookup or
profile-specific vocabulary.

Trait roles: none.

## 7. Solver input and stages

The module contributes no solver stage and no plan section. It provides the
future scheduler with a derived input:

```ts
type WorkshopSpaceInput = {
  id: string
  capacity: number
  availability_windows: readonly AvailabilityWindow[]
  resolved_capabilities: readonly string[]
  sort_key: number
}
```

Only live spaces are included. `resolved_capabilities` is the canonical output
of the configured resolver's `needs`/`provides` mechanisms. Inputs are sorted by
`sort_key`, then `id`, and all arrays are frozen at the solver boundary.

Issue 025 owns the schedule stage, offering identity, assignment output,
capacity overrides, conflict rules, ranking interaction, and attendance
allocation. This module does not decide any of those.

## 8. Rules and scoring

None. Physical capacity and availability are facts. No schedule rule or
capability-matching algorithm is supplied by occasion data.

## 9. Preflight checks

No solver preflight checks. Replay/append validation covers malformed capacity,
timestamps, ordering, overlap, and lifecycle transitions. A schedule consumer
must report a reference to a retired or unknown space as its own validation
finding; this module does not add a schedule stage to do so.

## 10. Output and diff

The derived world exposes live and historical `workshop-spaces`, ordered as in
§7. `diff` reports `workshop-space-added`, `workshop-space-changed`, and
`workshop-space-retired` facts for organiser review. No family-facing location
output is contributed. Release and location communication remain part of the
schedule/release contract owned by [workshop scheduling](workshop-scheduling.md).

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Screen | `/organiser/workshop-spaces` — maintain names, descriptions, capacity, availability, ordering, and resolver-backed capabilities ([UI-14](../ui/screens/workshop-spaces.md)) |
| Report | Workshop-space inventory — live/retired spaces, capacity, availability, and resolved capabilities for organisers ([reports](../application/reports.md) §3.3) |
| Controls | organiser-only add, full edit, and retire actions |
| Family view | none until the schedule and release contract is revised by Issue 025 |
| Emails | none |

The maintenance screen and report describe physical inventory only; they do
not show a scheduled programme or imply a communicated location.

## 12. Tests

- Add, full update, retire, replay, and shuffle invariance preserve typed
  `wsp_` identity and deterministic ordering.
- Negative capacity, empty names, malformed timestamps, reversed windows, and
  overlapping or touching windows fail at append and replay.
- A retired space is excluded from current input, and a future schedule
  reference to it is rejected by the schedule consumer's contract.
- Generic `needs`/`provides` labels resolve capabilities without a second
  relationship engine or a profile vocabulary.
- A composition fixture selects `workshop-space` with `workshops` and no
  `room-inventory`; a room-only fixture selects `room-inventory` with no
  workshops; the full profile selects accommodation and workshop spaces.

## 13. When not selected

No workshop-space kind, events, input, screen, or physical-space report exists.
Accommodation `room` entities remain owned solely by `room-inventory`, and
`workshops` remains independently selectable.
