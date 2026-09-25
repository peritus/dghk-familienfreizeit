# Organiser view

The active room workflow treats each family as one placement unit. Sleeping-party
review and child-room assignment are outside the active module set; their design
sketches live under
[`deferred-ideas/`](../deferred-ideas).

The implemented organiser host and kernel family surfaces are documented in
[`docs/application/organiser-view.md`](../../docs/application/organiser-view.md).
This specification retains the outstanding module and solver surfaces that use
that host.

## 1. Screen inventory

| Route | Screen | Purpose |
|---|---|---|
| `/organiser/inventory` | Inventory | Buildings, rooms, beds, capacity, and room capabilities |
| `/organiser/workshop-spaces` | Workshop spaces | Physical workshop-space inventory, capacity, availability, ordering, capabilities |
| `/organiser/board` | The board | Whole-family room placement |
| `/organiser/plans` | Plans | Derived plan investigation and comparison |
| `/organiser/releases` | Release control | Outstanding scopes, detailed preview, communicate |
| `/organiser/releases/history` | Communication history | Scope references, actor, time and reproducible comparisons |
| `/organiser/plans/:a/diff/:b` | Plan diff | What moved and why |
| `/organiser/workshops` | Workshops | Calls, proposals, candidate rounds, demand, schedule, capacity, fill, rankings |
| `/organiser/constraints` | Organiser decisions | Add, inspect, and clear resolver labels |
| `/organiser/reports` | Reports | Printable operational reports |

Every outstanding screen renders the organiser application's derived world. Screen
actions use the shared local-first organiser pipeline: they create ordinary event
groups, derive the proposed world locally, and then either invoke the ordinary apply
command automatically or leave the group in the browser for review, according to the
session's commit policy. No screen owns a second pending list or persistence path.

The header exposes **Änderungen sammeln**. Immediate mode is the session default and
automatically applies each locally staged group. Collecting mode defers the same apply
command until **Anwenden**. The collecting control uses an inline SVG ruler and
contains the numeric pending event count, including zero; the connected local-changes
section remains expanded while collecting mode is active. **Alle Änderungen verwerfen**
clears local pending events, and **Anwenden** submits the current ordered batch. A
failed automatic apply keeps its events, opens the panel, and activates collecting mode.

Release reporting and confirmation follow [release control](release-control.md)
and [UI-11](../ui/screens/release-control.md). Live coordination findings remain separate
from held arrangements.

## 2. Whole-family assignment board

The board is the only active screen with substantial interaction design. It has an
unplaced-family rail and room cards grouped by building and floor.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Main House  Garden House  [Unplaced only]  seq 1482                    │
├─────────────────┬────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                              │
│ Braun ×5 ⚠      │ Room 12 · 4 places · Morgan ×2 ✓                      │
│ Lang ×1         │ Room 14 · 6 places · open                             │
├─────────────────┴────────────────────────────────────────────────────────┤
│ [Änderungen sammeln: aus]                   [ruler icon · 3]            │
│ 3 pending decisions · Braun → Room 14 · [Discard] [Apply]              │
└──────────────────────────────────────────────────────────────────────────┘
```

Dragging a family to a room creates organiser decision labels through the shared
local-first pipeline, re-derives locally, and explains infeasible drops. In immediate
mode the resulting batch is submitted automatically; collecting mode waits for Apply.
The solver remains the only producer of assignments.
Room cards show capacity, sanitary arrangement, accessibility, occupants by family,
hard-constraint status, and soft penalties. A drop never splits a family or merges
two families.

Keyboard users can move through the unplaced list, open a room picker, add a room
decision, discard the pending batch, and clear selection.
Touch users get the same room picker through a drawer instead of drag-and-drop.

## 3. Organiser decisions and reports

The constraints screen exposes fixed resolver mechanisms: needs/provides, exclusions,
and separation. Organisers may enter a new matching value under a mechanism, such as
`provides=my-ad-hoc-thing`; the value needs no separate vocabulary declaration.
Sleeping `groups-with` decisions are rejected or reported as outside the active module
set. Optional notes stay attached
to the label event; author and timestamp come from the event log.

Reports show family-to-room assignments, unplaced families, capacity and constraint
findings, workshop proposals, demand, schedule results, attendance results, and
communication status. They do not show party or child-room sections in the active
scope.
