# Organiser view

The active room workflow treats each family as one placement unit. Sleeping-party
review and child-room assignment are outside the active module set; their design
sketches live under
[`deferred-ideas/`](../deferred-ideas).

## 1. Screen inventory

| Route | Screen | Purpose |
|---|---|---|
| `/organiser` | Dashboard | Status, staleness, preflight findings, attention |
| `/organiser/families` | Families | Table, import, invite, chase list |
| `/organiser/families/:id` | Family detail | People (add, edit, withdraw), full editable preferences, event history |
| `/organiser/inventory` | Inventory | Buildings, rooms, beds, designations |
| `/organiser/board` | The board | Whole-family room placement |
| `/organiser/plans` | Plans | Derived plan investigation and comparison |
| `/organiser/releases` | Release control | Outstanding scopes, detailed preview, communicate |
| `/organiser/releases/history` | Communication history | Scope references, actor, time and reproducible comparisons |
| `/organiser/plans/:a/diff/:b` | Plan diff | What moved and why |
| `/organiser/workshops` | Workshops | Slots, capacity, fill, rankings |
| `/organiser/constraints` | Organiser decisions | Add, inspect, and clear resolver labels |
| `/organiser/materials` | Materials | Requests, commitments, and fulfilment |
| `/organiser/reports` | Reports | Printable operational reports |

Every screen renders the organiser application's derived world. The browser holds
pending events; applying appends them in one validated batch, and discarding them
leaves no trace.

Release reporting and confirmation follow [release control](release-control.md)
and [UI-11](../ui/screens/release-control.md). Live coordination findings remain separate
from held arrangements.

## 2. Dashboard

The dashboard shows outstanding release scopes, affected families,
preflight findings, constraint conflicts, unplaced families, workshop warnings, and
the chase list. Quality counters exclude co-room and party metrics that are outside
the active module set.

Example findings:

> ⚠ `needs-private-sanitary`: 19 beds required, 14 available.
>
> ⚠ 1 family cannot be placed — Braun ×5 requires ensuite; none free.

## 3. Families and inventory

Families is a sortable, filterable table with import and invitation state.
Family detail renders the same trait-driven control union as the family view
([family preferences](../modules/family-preferences.md) §6), editable, plus
person management and workshop self-service controls, for organisers taking a
request by phone or email (D24). Saves write the identical event types as the
family view, with the organiser as actor and the family or person as
subject — there is no separate out-of-band marker; the event history below is
the record. Inventory shows buildings, rooms, beds, designations, capacity,
and room capabilities.

## 4. Whole-family assignment board

The board is the only active screen with substantial interaction design. It has a
searchable unplaced-family rail and room cards grouped by building and floor.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [Search families…] Main House  Garden House  [Unplaced only]  seq 1482   │
├─────────────────┬────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                              │
│ Braun ×5 ⚠      │ Room 12 · 4 places · Morgan ×2 ✓                      │
│ Lang ×1         │ Room 14 · 6 places · open                             │
├─────────────────┴────────────────────────────────────────────────────────┤
│ 3 pending decisions · Braun → Room 14 · [Undo] [Discard] [Apply]         │
└──────────────────────────────────────────────────────────────────────────┘
```

Dragging a family to a room appends organiser decision labels, re-derives locally,
and explains infeasible drops. The solver remains the only producer of assignments.
Room cards show capacity, sanitary arrangement, accessibility, occupants by family,
hard-constraint status, and soft penalties. A drop never splits a family or merges
two families.

Keyboard users can search families, move through the unplaced list, open a room
picker, add a room decision, undo the last pending action, and clear selection.
Touch users get the same room picker through a drawer instead of drag-and-drop.

## 5. Organiser decisions and reports

The constraints screen exposes fixed resolver mechanisms: needs/provides, exclusions,
and separation. Organisers may enter a new matching value under a mechanism, such as
`provides=my-ad-hoc-thing`; the value needs no separate vocabulary declaration.
Sleeping `groups-with` decisions are rejected or reported as outside the active module
set. Optional notes stay attached
to the label event; author and timestamp come from the event log.

Reports show family-to-room assignments, unplaced families, capacity and constraint
findings, workshop results, and communication status. They do not show party or
child-room sections in the active scope.
