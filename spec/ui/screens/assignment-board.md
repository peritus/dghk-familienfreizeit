# UI-10 — Assignment board

## Audience, purpose, and route

Organisers review the resolver's room placement and its consequences. Route:
`/organiser/board`. Governing specs: [organiser view](../../application/organiser-view.md) §2,
[room assignment](../../modules/room-assignment.md), and decisions [D6/D15](../../../decisions.md).

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ACCOMMODATIONS · ALL BUILDINGS                                         │
├─────────────────┬──────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                                │
│ ┌─────────────┐ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│ │ Seidel ×5   │ │ │ Room 12  ●●○○│ │ Room 14 ●●●●●○│ │ Room 16  ●●●│          │
│ │ ensuite     │ │ │ ensuite     │ │ │            │ │ │             │          │
│ │ ⚠ no fit    │ │ │ Morgan ×2 ✓ │ │ │ open       │ │ │ Rivera ×3 ✓ │          │
│ └─────────────┘ │ └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────┴──────────────────────────────────────────────────────────┤
│ Current accommodation plan · review configuration when needed             │
└────────────────────────────────────────────────────────────────────────────┘
```

The board does not write assignments directly. It renders the current derived world, including unapplied
events from the shared organiser draft buffer, and the deterministic solver output.
It shows every configured building and its rooms in one view; there is no building
selector. It shows hard failures, room availability, and unplaced families. The
narrow fixed-assignment action writes paired `needs`/`provides` labels, re-derives
locally, preserves invalid assignments with diagnostics, and clears both labels when
removed. Richer placement overrides remain deferred to
[deferred scope](../../deferred-ideas/organiser-placement-overrides.md).

## Narrow fallback

The board becomes an unplaced list followed by a room list. Family summaries are
compact by default and can be expanded in place to show the people in that family.
The global organiser save-status control continues to show pending drafts without
being duplicated inside the board. Fixed-assignment actions use that same control.

## Neobrutalist redesign and components

Use the shared organiser frame, one section per building, `Card` for rooms and families,
and `Badge` for capacity and constraint status. Room cards show the floor through the
surrounding floor heading, use one occupancy badge, and visually distinguish full rooms
from rooms with remaining space. Family summaries use the same compact row in placed
and unplaced contexts; expanding a row reveals person badges inline.
Room cards keep the thick outline and offset shadow; infeasible cards use an
`Alert`-style border and explanatory text. Draft/apply/discard belongs to the
global `SaveStatus` control and follows the family-editing implementation; the
board has no placement dialog or screen-local save actions.
