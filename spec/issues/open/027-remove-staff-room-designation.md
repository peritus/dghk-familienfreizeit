---
id: "027"
title: Remove room designations from room inventory
status: open
severity: contract-contradiction
category: module:room-inventory
source: approved domain clarification
related_decisions: [D2, D5, D6]
opened: 2026-09-22
---

# Remove room designations from room inventory

## Problem

The occasion does not need room-level categories such as `staff`, `general`, or
`blocked`. Room inventory should describe physical accommodation only. Every
live room is an ordinary accommodation candidate; staff members use the same
rooms as everyone else.

The current room-inventory contract models all three values as a fixed room
`designation` property. Room assignment then excludes `staff` and `blocked`
rooms from family placement, while an undesignated room implicitly means
`general`. None of this category state is needed for the occasion.

This is a room-inventory vocabulary and behavior problem, not a request to
remove person roles or staff-related organiser identity. Any person-level role
model remains independent of accommodation room designation.

## Evidence

The room-inventory parameter contract defines `Designation` as
`'general' | 'staff' | 'blocked'`, gives `general` and `blocked` operational
semantics, and gives `staff` the meaning “held back for staff”
([room-inventory parameters](../../modules/room-inventory.md#3-parameters)).
The same module requires designation data in the profile vocabulary and
inventory reports ([designation semantics](../../modules/room-inventory.md#3-parameters)).

The event contract includes `RoomDesignationChanged`, whose accepted values
include all three designation values, and the canonical fixture uses a
designation event
([room designation event](../../modules/room-inventory.md#5-events)). The derived
room label and solver input also expose the designation, including rules that
exclude blocked rooms
([room labels](../../modules/room-inventory.md#6-labels-and-trait-roles) and
[inventory solver input](../../modules/room-inventory.md#7-solver-input-and-stages)).

Room assignment then explicitly rejects `staff` and `blocked` rooms as family candidates
([room-assignment solver input](../../modules/room-assignment.md#7-solver-input-and-stages)).
The organiser inventory screen offers designation filters
([inventory screen](../../ui/screens/inventory.md)), and the example profile
selects and translates the designation values
([profile configuration](../../profiles/familienfreizeit-2027.example.ts)).
The roadmap and room-assignment acceptance text also promise designation-specific
handling ([roadmap](../../roadmap.md)).

## Recommendation

Remove the entire room `designation` property from the room-inventory contract.
Room inventory should have no `Designation` type and no designation events or
labels. All live rooms are ordinary room-assignment candidates.

The implementation and specification update should:

1. remove `Designation`, `designations`, designation copy, and all designation
   configuration from the profile contract and example profile;
2. remove `RoomDesignationChanged`, designation labels, designation validation,
   and designation fixtures;
3. remove designation-specific branches from solver input, room assignment,
   reports, inventory filters, and UI copy;
4. make every live room a room-assignment candidate, subject only to capacity,
   requirements, exclusions, and other active resolver constraints;
5. revise roadmap acceptance criteria and tests accordingly;
6. preserve the existing person/family role vocabulary if it is needed for
   eligibility or communication—this issue only removes a room property.

If organisers later need to hold a room back for a particular purpose, that
requires a separately specified room lifecycle or explicit organiser constraint.
It must not be reintroduced as an implicit designation property in this issue.

The change must preserve event-log-only state and derived room views. Existing
historical events containing any designation need an explicit migration/replay
policy before implementation is marked complete: either the event format is
rejected as no longer valid and old data is migrated, or designation events are
retained only as historical data while no active room derives designation state.
The chosen policy must be documented and tested rather than silently
reinterpreting old room availability.

## Open questions

1. Should historical designation events be migrated into ordinary room state, or
   should existing historical events remain replayable as inactive legacy data?
   Migrating them out of the active model is recommended because no designation
   has domain meaning.
2. If rooms must become unavailable later, should that be a room retirement
   lifecycle event or a resolver-backed organiser constraint? This is deferred
   from the designation removal and must not be solved by restoring `blocked`.

## Related files

- [room-inventory.md](../../modules/room-inventory.md)
- [room-assignment.md](../../modules/room-assignment.md)
- [inventory UI](../../ui/screens/inventory.md)
- [familienfreizeit-2027.example.ts](../../profiles/familienfreizeit-2027.example.ts)
- [familienfreizeit-2027.md](../../profiles/familienfreizeit-2027.md)
- [roadmap.md](../../roadmap.md)
- [decisions.md — D5](../../../decisions.md#d5--sleeping-parties-and-child-rooms-are-outside-the-active-placement-model)
- [decisions.md — D6](../../../decisions.md#d6--organiser-decisions-guide-the-derived-assignment)
