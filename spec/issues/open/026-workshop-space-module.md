---
id: "026"
title: Workshop locations need a separate workshop-space module
status: open
severity: gap
category: module:workshops
source: approved design review
related_decisions: [D2, D3, D6, D16]
opened: 2026-09-22
---

# Workshop locations need a separate workshop-space module

## Problem

Workshop locations are physically distinct from sleeping rooms, but the current
module contract couples them to accommodation inventory. The `workshops` module
enhances `room-inventory`, stores a `room_id` directly on each workshop, and
uses the same `room` entity for both accommodation and workshop location.

This creates an unnecessary dependency and gives one entity two unrelated
meanings:

```text
room-inventory
  building → room → bed → sleeping place

workshops
  workshop → slot + room_id
```

The desired boundary is:

```text
room-inventory
  accommodation buildings, rooms, beds, and sleeping places

workshop-space
  workshop venues and spaces with capacity, capabilities, and availability

workshops / workshop scheduling
  workshop proposals and scheduled offerings using workshop spaces
```

The extraction should happen before implementing the workshop programme and
solver milestones. It must not introduce a second relationship engine or a
second persisted copy of assignments: workshop-space facts are event-backed and
the schedule remains derived from the event log.

## Evidence

### Room inventory is explicitly accommodation-specific

The room inventory module defines its purpose as physical sleeping
accommodation: buildings, rooms, beds, and sleeping places. It explicitly says
that it does not decide who sleeps where, and that sleeping-party placement is a
separate boundary ([room inventory purpose](../../modules/room-inventory.md#1-purpose-and-boundary)).
Its entity kinds and generated `place` identities are all accommodation-shaped:
`building`, `room`, `bed`, and a `place` generated from a bed's `sleeps` value
([room inventory entities](../../modules/room-inventory.md#4-entity-kinds)).

The module's solver input is likewise sleeping inventory: buildings, rooms, and
bed-derived places. It excludes blocked rooms and retired sleeping places, and
has no workshop-location stage ([room inventory solver input](../../modules/room-inventory.md#7-solver-input-and-stages)).

### Workshops currently depend on accommodation rooms

The current module contract says that `workshops` enhances `room-inventory` when
a workshop may be held in a room ([workshop dependencies](../../modules/workshops.md#2-dependencies)).
`WorkshopAdded` and `WorkshopUpdated` carry `room_id`, and the field maps to the
workshop's `held-in` label. The invariant requires a live room when
`room-inventory` is selected ([workshop events](../../modules/workshops.md#5-events)).

The workshop solver input repeats this coupling with `room_id` on each workshop,
while the module contributes no scheduling stage of its own
([workshop solver input](../../modules/workshops.md#7-solver-input-and-stages)).
The result is a direct programme property, not an assignment produced by a
workshop scheduling solver.

### The existing room assignment module is unrelated

`room-assignment` places whole families into accommodation rooms and sleeping
places. Its placement unit, capacity arithmetic, and constraints are all about
families and beds ([room assignment boundary](../../modules/room-assignment.md#1-purpose-and-boundary)).
It must not become responsible for workshop venue allocation merely because the
two concepts currently share the `room` kind.

### The resolver and release boundaries can support the split

The generic resolver already supports capabilities, requirements, exclusions,
and separation through normalized labels. The active room assignment consumes
those facts for accommodation targets, while workshop modules consume their own
configured inputs ([how modules consume constraints](../../architecture/labels-and-constraints.md#how-modules-consume-constraints)).
The new module should follow that same boundary: workshop-space traits and
organiser decisions are resolved centrally, and scheduling never performs
screen-local lookups over raw labels.

Release control already treats workshop programme content and workshop
allocation as separate scopes. It can continue to expose the scheduled space's
safe location descriptors as programme content and publish attendance only in
the later allocation scope ([release scopes](../../application/release-control.md#1-release-scopes)).

## Recommendation

Create a separate `workshop-space` module and remove the workshop module's
dependency on `room-inventory`.

### Module boundary

The new module owns typed `workshop-space` entities, with a stable kind-specific
identity prefix such as `wsp_`. If a venue hierarchy is needed, it may also own
a `workshop-venue` kind; do not reuse accommodation `building` or `room`
identities.

The module should provide organiser-owned events for creation, full restatement,
and retirement. Its domain properties remain generic labels, for example:

- display name and venue/location description;
- participant capacity;
- availability or allowed schedule windows;
- capabilities such as kitchen, outdoor, accessible, or quiet;
- ordering metadata for deterministic organiser views.

The module may expose derived read-model helpers such as available capacity or
location hierarchy, but must not persist folded state outside the event log.

### Workshop contract changes

Remove `room-inventory` from the `workshops` dependency list. Remove the direct
`room_id`/`held-in` coupling from the pre-schedule workshop event shape. A
workshop proposal or ranking candidate must not require a physical location.

The later workshop scheduling stage should consume:

```ts
type WorkshopSpaceInput = {
  id: string
  capacity: number
  availability: readonly AvailabilityWindow[]
  capabilities: readonly string[]
  sort_key: number
}
```

and produce a derived schedule assignment such as:

```ts
type WorkshopScheduleAssignment = {
  workshop_id: string
  workshop_space_id: string
  slot_id: string
}
```

The exact schedule output belongs to the workshop scheduling contract, not to
`room-inventory` and not to a direct `WorkshopAdded` field. Organiser-fixed
space decisions, if supported, should be ordinary resolver-backed constraints;
the solver remains the only producer of the derived schedule.

### Naming and identity

Use `workshop-space` consistently for the module and entity kind. Do not call the
entity simply `place`: accommodation already uses `place` for an individual
sleeping position, and reusing that name would recreate the ambiguity this
split is intended to remove.

### Profile and dependency graph

The profile should select the modules independently:

```text
room-inventory → room-assignment

workshop-space → workshop scheduling → workshop attendance assignment
workshops ─────┘
```

`workshops` may depend on `workshop-space` only where the selected programme
contract needs its schedule input. It should not depend on accommodation
inventory merely to name a location.

### Required follow-through

Update the following in one coordinated specification change when this issue is
implemented:

- module contract and contribution types for the new typed entity/events;
- workshop programme and workshop scheduling contracts;
- workshop profile configuration and dependency validation;
- resolver scopes and trait-role metadata for workshop-space capabilities;
- organiser inventory/scheduling screens and reports;
- release-control programme content and schedule/allocation dependencies;
- M9/M10 roadmap acceptance criteria;
- fixtures and tests for create, update, retirement, capacity, availability,
  capability matching, deterministic ordering, and schedule conflicts.

The implementation must prove that selecting `workshop-space` without
`room-inventory` works, and that selecting `room-inventory` without workshops
continues to provide accommodation normally.

## Open questions

1. Does `workshop-space` need a separate `workshop-venue` parent entity, or are
   a space's name and location labels sufficient for the first implementation?
2. Are availability windows event-backed space facts, profile configuration, or
   schedule-stage input? The recommendation is event-backed when they are
   occasion data, with solver parameters only for global policy.
3. Should participant capacity live on the workshop-space entity, the scheduled
   offering, or both? The recommendation is physical capacity on the space and
   programme-specific demand/overrides on the scheduled offering, with one
   explicit effective-capacity calculation.
4. Which workshop-space capabilities and separation relationships are fixed
   module mechanisms, and which are free-form organiser values? Fixed operators
   belong in module/profile code; concrete matching values remain labels under
   the existing resolver boundary.

## Related files

- [issue 025: workshop ranking and scheduling lifecycle](025-workshop-ranking-scheduling-lifecycle.md)
- [room-inventory.md](../../modules/room-inventory.md)
- [workshops.md](../../modules/workshops.md)
- [room-assignment.md](../../modules/room-assignment.md)
- [modules/contract.md](../../modules/contract.md)
- [labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [solver-contract.md](../../architecture/solver-contract.md)
- [release-control.md](../../application/release-control.md)
- [roadmap.md](../../roadmap.md)
- [D2](../../../decisions.md#d2--event-log-with-in-memory-read-models)
- [D3](../../../decisions.md#d3--the-solver-is-a-pure-function)
- [D6](../../../decisions.md#d6--organiser-decisions-guide-the-derived-assignment)
- [D16](../../../decisions.md#d16--release-control-determines-which-arrangements-families-see)
