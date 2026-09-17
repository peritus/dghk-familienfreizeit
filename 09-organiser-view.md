# 09 — Organiser view

Three organisers use this on laptops for about six weeks. The active room
workflow treats each family as one placement unit. Sleeping-party review and
child-room assignment are deferred; their design sketches live under
[`deferred-ideas/`](deferred-ideas/).

## 1. Screen inventory

| Route | Screen | Purpose |
|---|---|---|
| `/organiser` | Dashboard | Status, staleness, preflight findings, attention |
| `/organiser/families` | Families | Table, import, invite, chase list |
| `/organiser/families/:id` | Family detail | People, preferences, event history |
| `/organiser/inventory` | Inventory | Buildings, rooms, beds, designations |
| `/organiser/board` | The board | Whole-family room placement |
| `/organiser/plans` | Plans | List, diff, publish |
| `/organiser/plans/:a/diff/:b` | Plan diff | What moved and why |
| `/organiser/workshops` | Workshops | Slots, capacity, fill, rankings |
| `/organiser/constraints` | Organiser decisions | Add, inspect, and clear resolver labels |
| `/organiser/reports` | Reports | Printable operational reports |

Every screen renders the organiser application's derived world. The browser holds
pending events; applying appends them in one validated batch, and discarding them
leaves no trace.

## 2. Dashboard

The dashboard shows publication freshness, events since publication, moved families,
preflight findings, constraint conflicts, unplaced families, workshop warnings, and
the chase list. Quality counters exclude deferred co-room and party metrics.

Example findings:

> ⚠ `needs-private-sanitary`: 19 beds required, 14 available.
>
> ⚠ 1 family cannot be placed — Braun ×5 requires ensuite; none free.

## 3. Families and inventory

Families is a sortable, filterable table with import and invitation state. Family
detail shows people, current profile preferences, and the event history. Inventory
shows buildings, rooms, beds, designations, capacity, and room capabilities.

## 4. Whole-family assignment board

The board is the only active screen with substantial interaction design. It has a
searchable unplaced-family rail and room cards grouped by building and floor.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [Search families…] Main House  Garden House  [Unplaced only]  Plan #8    │
├─────────────────┬────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                              │
│ Braun ×5 ⚠      │ Room 12 · 6 places · Morgan ×2 ✓                      │
│ Lang ×1         │ Room 14 · 5 places · open                             │
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
and separation. Sleeping `groups-with` decisions are rejected or reported as
deferred until the sleeping-parties module is adopted. Optional notes stay attached
to the label event; author and timestamp come from the event log.

Reports show family-to-room assignments, unplaced families, capacity and constraint
findings, workshop results, and publication status. They do not show party or
child-room sections in the active scope.
