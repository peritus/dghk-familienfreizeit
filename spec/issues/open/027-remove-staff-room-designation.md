---
id: "027"
title: Remove the unused staff designation from room inventory
status: open
severity: contract-contradiction
category: module:room-inventory
source: approved domain clarification
related_decisions: [D2, D5, D6]
opened: 2026-09-22
---

# Remove the unused staff designation from room inventory

## Problem

The occasion has no special staff rooms. Staff members should use the ordinary
accommodation inventory and should not be excluded from rooms because of a
room-level `staff` designation.

The current room-inventory contract nevertheless models `staff` as a fixed room
designation, alongside `general` and `blocked`. Room assignment excludes both
`staff` and `blocked` rooms from family placement, so the current specification
would make a staff-designated room unavailable to all family placement units
even though the domain has no separate staff-room pool.

This is a room-inventory vocabulary and behavior problem, not a request to
remove person roles or staff-related organiser identity. Any person-level role
model remains independent of accommodation room designation.

## Evidence

The room-inventory parameter contract defines `Designation` as
`'general' | 'staff' | 'blocked'` and gives `staff` a fixed meaning: held back
for staff and excluded from family placement
([room-inventory parameters](../../modules/room-inventory.md#3-parameters)).
The same module requires `staff` to be represented in the profile vocabulary
and retains it in inventory reports ([designation semantics](../../modules/room-inventory.md#3-parameters)).

The event contract includes `RoomDesignationChanged`, whose accepted values
include `staff`, and the canonical fixture uses a staff-designated room
([room designation event](../../modules/room-inventory.md#5-events)). The derived
room label and solver input also expose the designation
([room labels](../../modules/room-inventory.md#6-labels-and-trait-roles) and
[inventory solver input](../../modules/room-inventory.md#7-solver-input-and-stages)).

Room assignment then explicitly rejects `staff` rooms as family candidates
([room-assignment solver input](../../modules/room-assignment.md#7-solver-input-and-stages)).
The organiser inventory screen offers a Staff filter
([inventory screen](../../ui/screens/inventory.md)), and the example profile
selects and translates the `staff` designation
([profile configuration](../../profiles/familienfreizeit-2027.example.ts)).
The roadmap and room-assignment acceptance text also promise staff-specific
handling ([roadmap](../../roadmap.md)).

## Recommendation

Remove `staff` as a room designation throughout the room-inventory contract.
Keep only:

- `general`: available to ordinary accommodation placement;
- `blocked`: unavailable and requiring a reason.

The implementation and specification update should:

1. remove `staff` from the `Designation` type, profile parameters, localized
   copy, and example profile;
2. reject `RoomDesignationChanged(... designation=staff ...)` at append and
   replay, and remove staff designation from event fixtures;
3. remove staff-specific branches from solver input, room assignment, reports,
   inventory filters, and UI copy;
4. update room-inventory documentation so `blocked` is the only non-general
   room state;
5. change room-assignment candidate rules to exclude only blocked rooms;
6. revise roadmap acceptance criteria and tests accordingly;
7. preserve the existing person/family role vocabulary if it is needed for
   eligibility or communication—this issue only removes a room property.

If organisers later need to hold an ordinary room back for a particular purpose,
that should use the existing blocked designation with a reason or an explicit
organiser constraint. It should not recreate a permanent staff-room category.

The change must preserve event-log-only state and derived room views. Existing
historical events containing `staff` need an explicit migration/replay policy
before implementation is marked complete: either the event format is rejected
as no longer valid and old data is migrated, or the label is retained as a
read-only historical value while no new or active room can use it. The chosen
policy must be documented and tested rather than silently reinterpreting old
room availability.

## Open questions

1. Should historical `staff` designation events be migrated to `general`, or
   should existing historical events remain replayable as inactive legacy data?
   Migrating to `general` is recommended because the domain clarification says
   there are no special staff rooms and it makes current derived availability
   unambiguous.
2. Does any report need to retain a historical “formerly reserved for staff”
   audit note? If so, retain it as event history or an optional note, not as an
   active room designation.

## Related files

- [room-inventory.md](../../modules/room-inventory.md)
- [room-assignment.md](../../modules/room-assignment.md)
- [inventory UI](../../ui/screens/inventory.md)
- [familienfreizeit-2027.example.ts](../../profiles/familienfreizeit-2027.example.ts)
- [familienfreizeit-2027.md](../../profiles/familienfreizeit-2027.md)
- [roadmap.md](../../roadmap.md)
- [decisions.md — D5](../../../decisions.md#d5--sleeping-parties-and-child-rooms-are-outside-the-active-placement-model)
- [decisions.md — D6](../../../decisions.md#d6--organiser-decisions-guide-the-derived-assignment)
