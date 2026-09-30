# Assignment board UI

The organiser assignment board is composed from shared UI primitives and
room-assignment-specific components. Shared `Badge`, `Tag`, `StatsStrip`,
`SuccessState`, `Button`, `Dialog`, and bed icons stay in their general source
locations. Room cards, requirement chips, family entries, fit hints, building
headers, the fixed-assignment dialog, and the print composition live under
`src/modules/room-assignment/app/components/assignment-board/`, with the screen
composition in `src/modules/room-assignment/app/screens/`.

The board derives all placement state from the event-log world. A fixed family
uses paired generic labels with the value `${family_id}_room`: `needs` on the
family and `provides` on the room. The solver preserves that pair even when
capacity or a required feature is invalid, and exposes the violation as a
diagnostic. Clearing the assignment removes both labels through the organiser
draft pipeline.

## Handoff resolutions

The prototype is a visual reference, not a source of CSS or behavior. The
repository style guide resolves these differences:

- Room features use the borderless shared `Tag`; state and requirement chips
  retain the repository's 2px black border language.
- Fixed families do not receive the prototype's paper background. `paper` and
  `blueprint` identify browser-local draft state in the design system, so fixed
  assignments use the normal card surface and a pinned badge.
- Attention stats use the orange token with black text for contrast.
- Building headers are hierarchy, not cards. Cards are reserved for rooms.
- Buttons use the existing `pressable` variants and the fixed-assignment flow
  uses the existing modal `Dialog` primitive.
- Print rules are global CSS utilities. The print view expands all buildings,
  places one building on each page, and reveals first names while hiding board
  controls and overview content.

The approved terminology also resolves handoff differences. The board uses
`Anforderung` for accommodation requirements, `Vorgabe` only for calculated
resolver constraints, `Barrierearmes Zimmer` for a family requirement and
`Barrierearm` for a room feature, `Zimmer nicht teilen`/`Zimmer teilen` for the
existing private-room terms, `Merkmale` in the room editor, and `Freie
Schlafplätze` as the statistic. These additions are recorded in the German
translation guideline.
