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
| `/organiser/reports` | Assignment report | Compact printable current assignment |
| `/organiser/workshops` | Workshops | Calls, proposals, candidate rounds, demand, schedule, capacity, fill, rankings |

Every screen renders the organiser application's derived world. Mutating screens
use the shared local-first organiser pipeline: they create ordinary event groups,
derive the proposed world locally, and then either invoke the ordinary apply command
automatically or leave the group in the browser for review, according to the
session's commit policy. No screen owns a second draft list or persistence path.
The assignment board and report are read-only projections of that same prospective
world, so family and room drafts are visible before they are applied.

The header exposes **Entwurfsmodus starten**. Immediate mode is the session default and
automatically applies each locally staged group. Drafting mode defers the same apply
command until **Entwürfe anwenden**. The draft control uses a Lucide upload-cloud icon;
the draft workspace uses a cloud-with-pause icon and shows the numeric draft count.
**Entwürfe verwerfen** clears local draft events, and **Entwürfe anwenden** submits the
current ordered batch. A failed automatic apply keeps its events, opens the workspace,
and activates drafting mode.

Release reporting and confirmation follow [release control](release-control.md)
and the deferred [release-control UI](../deferred-ideas/release-control-ui.md). Live coordination findings remain separate
from held arrangements.

## 2. Whole-family assignment board

The board is a read-only review screen with an unplaced-family rail and room cards
grouped by building and floor.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Main House  Garden House  [Unplaced only]  seq 1482                    │
├─────────────────┬────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                              │
│ Braun ×5 ⚠      │ Room 12 · 4 places · Morgan ×2 ✓                      │
│ Lang ×1         │ Room 14 · 6 places · open                             │
├─────────────────┴────────────────────────────────────────────────────────┤
│ [Entwurfsmodus starten]                     [cloud-pause icon · 3]      │
│ 3 Änderungsentwürfe · Braun → Room 14 · [Entwürfe verwerfen] [Entwürfe anwenden] │
└──────────────────────────────────────────────────────────────────────────┘
```

The board renders the deterministic solver result, explains infeasible placements,
and reflects unapplied family or room configuration drafts. The solver remains the
only producer of assignments. Manual placement controls remain deferred.
Room cards show capacity, sanitary arrangement, accessibility, occupants by family,
hard-constraint status, and soft penalties. A drop never splits a family or merges
two families.

Keyboard and touch users can expand placement explanations. Draft/apply/discard
remains available through the global save-status control, not through the board.

## 3. Organiser decisions and reports

The fixed resolver mechanisms and organiser decision labels remain domain capabilities,
but their prominent placement UI is deferred to
[`organiser-placement-overrides`](../deferred-ideas/organiser-placement-overrides.md).

The M6 assignment report shows family-to-room assignments, unplaced families,
capacity, and constraint findings. The later generic report catalogue covers
workshops, attendance, and communication; it does not change the M6 data model.
