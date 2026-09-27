# UI-10 — Assignment board

## Audience, purpose, and route

Organisers review the resolver's room placement and its consequences. Route:
`/organiser/board`. Governing specs: [organiser view](../../application/organiser-view.md) §2,
[room assignment](../../modules/room-assignment.md), and decisions [D6/D15](../../../decisions.md).

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Main House  Garden House  [Unplaced only]  seq 1482                       │
├─────────────────┬──────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                                │
│ ┌─────────────┐ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│ │ Braun ×5    │ │ │ Room 12  ●●○○│ │ Room 14 ●●●●●○│ │ Room 16  ●●●│          │
│ │ ensuite     │ │ │ ensuite     │ │ │            │ │ │             │          │
│ │ ⚠ no fit    │ │ │ Morgan ×2 ✓ │ │ │ open       │ │ │ Rivera ×3 ✓ │          │
│ └─────────────┘ │ └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────┴──────────────────────────────────────────────────────────┤
│ Current derived assignment · seq 1482 · review configuration when needed   │
└────────────────────────────────────────────────────────────────────────────┘
```

The board is read-only. It renders the current derived world, including unapplied
events from the shared organiser draft buffer, and the deterministic solver output.
It shows hard failures, soft explanations, traces, and unplaced families. Organisers
correct family or room configuration in the corresponding editor; exceptional
placement overrides remain deferred to [deferred scope](../../deferred-ideas/organiser-placement-overrides.md).

## Narrow fallback

The board becomes an unplaced list followed by a room list. Explanation controls
remain keyboard and touch accessible, and the global organiser save-status control
continues to show pending drafts without being duplicated inside the board.

## Neobrutalist redesign and components

Use the shared organiser frame, `Tabs` for buildings, `Card` for rooms and families,
and `Badge` for capacity and constraint status.
Room cards keep the thick outline and offset shadow; infeasible cards use an
`Alert`-style border and explanatory text. Draft/apply/discard belongs to the
global `SaveStatus` control and follows the family-editing implementation; the
board has no placement dialog or screen-local save actions.
