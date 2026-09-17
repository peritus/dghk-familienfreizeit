# UI-10 — Assignment board

## Audience, purpose, and route

Organisers make room-placement decisions and review consequences. Route:
`/organiser/board`. Governing specs: [organiser view](../09-organiser-view.md) §5,
[room assignment](../20.3-room-assignment.md), and decisions [D6/D15](../17-decisions.md).

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ [Search parties…]  Main House  Garden House  [Unplaced only]  Plan #8      │
├─────────────────┬──────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                                │
│ ┌─────────────┐ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│ │ Braun ×5    │ │ │ Room 12  ●●○○│ │ Room 14 ●●●●●○│ │ Room 16  ●●●│          │
│ │ ensuite     │ │ │ ensuite     │ │ │            │ │ │             │          │
│ │ ⚠ no fit    │ │ │ Morgan ×2 ✓ │ │ │ open       │ │ │ Rivera ×3 ✓ │          │
│ └─────────────┘ │ └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────┴──────────────────────────────────────────────────────────┤
│ 3 pending decisions · Braun → Room 14 · [Undo] [Discard] [Apply]           │
└────────────────────────────────────────────────────────────────────────────┘
```

Dragging a party to a room appends an organiser decision label, re-derives locally, and shows
any cascade. Infeasible rooms lose drop affordance and explain why; soft
penalties remain visible. Keyboard users get a move action with the same room
picker and consequence summary. Apply confirms the pending batch; Discard
requires confirmation.

## Narrow fallback

The board becomes a searchable unplaced list followed by a room list. Each party
has an “Add room decision” action; do not require drag-and-drop on touch devices. The
pending bar remains sticky at the bottom without covering the final control.

## Neobrutalist redesign and components

Use `Sidebar`, `Input` or `Combobox` for party search, `Tabs` for buildings,
`Card` for rooms and parties, and `Badge` for capacity and constraint status.
Room cards keep the thick outline and offset shadow; infeasible cards use an
`Alert`-style border and explanatory text. Apply and Discard each use
`AlertDialog` with the complete `AlertDialogTrigger`, `AlertDialogContent`,
`AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`,
`AlertDialogFooter`, `AlertDialogCancel`, and `AlertDialogAction` composition.
On touch devices,
`Drawer` supplies the “Move to room” picker.
