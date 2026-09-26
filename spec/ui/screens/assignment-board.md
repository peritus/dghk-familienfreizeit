# UI-10 — Assignment board

## Audience, purpose, and route

Organisers make room-placement decisions and review consequences. Route:
`/organiser/board`. Governing specs: [organiser view](../../application/organiser-view.md) §4,
[room assignment](../../modules/room-assignment.md), and decisions [D6/D15](../../../decisions.md).

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Main House  Garden House  [Unplaced only]                                 │
├─────────────────┬──────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                                │
│ ┌─────────────┐ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│ │ Braun ×5    │ │ │ Room 12  ●●○○│ │ Room 14 ●●●●●○│ │ Room 16  ●●●│          │
│ │ ensuite     │ │ │ ensuite     │ │ │            │ │ │             │          │
│ │ ⚠ no fit    │ │ │ Morgan ×2 ✓ │ │ │ open       │ │ │ Rivera ×3 ✓ │          │
│ └─────────────┘ │ └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────┴──────────────────────────────────────────────────────────┤
│ Save status lives in the shared organiser app bar.                        │
└────────────────────────────────────────────────────────────────────────────┘
```

Dragging a family to a room creates one or more organiser decisions
through the shared local-first pipeline, re-derives locally, and shows every other
family the change moved. Immediate mode applies automatically; drafting mode waits
for the shared save-status control. Infeasible rooms lose drop affordance and explain why; soft
penalties remain visible. Keyboard users get a move action with the same room
picker and consequence summary. Saving and discarding are handled by the shared
save-status control. An optional note
belongs to the label, not to a separate decision record.

## Narrow fallback

The board becomes an unplaced list followed by a room list. Each family
has an “Add room decision” action; do not require drag-and-drop on touch devices. The
shared save-status control remains usable without covering the final control.

## Neobrutalist redesign and components

Use `Sidebar`, `Tabs` for buildings, `Card` for rooms and families, and `Badge`
for capacity and constraint status.
Room cards keep the thick outline and offset shadow; infeasible cards use an
`Alert`-style border and explanatory text. Moving a family uses the shared
focus-managed `Dialog` primitive.
On touch devices,
`Drawer` supplies the “Move to room” picker.
