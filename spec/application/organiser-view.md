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
| `/organiser/accommodation/inventory` | Inventory | Buildings, rooms, beds, capacity, and room capabilities |
| `/organiser/accommodation/assignment` | The board | Whole-family room placement and browser-printable assignment output |
| `/organiser/workshops` | Workshops | Authoring, one current choice cycle, demand, schedule, capacity, fill, rankings, and fairness |
| `/organiser/workshops/programme` | Programme | One placement per workshop, conflicts, and unscheduled cases |
| `/organiser/workshops/slots` | Slots | Event-backed slot maintenance and overlap validation |
| `/organiser/workshops/spaces` | Workshop spaces | Physical spaces, schedule context, capabilities, and per-slot blocks |
| `/organiser/workshops/allocation` | Workshop allocation · Wünsche / Antworten | Ranked answers, explicit no-preference, and missing answers |
| `/organiser/workshops/allocation/demand` | Workshop allocation · Wünsche / Nachfrage | First-choice and ranked demand against capacity and placement |
| `/organiser/workshops/allocation/trace` | Workshop allocation · Wünsche / Verlauf | Solver stages, reasons, retention, drops, and review cases |

Every screen renders the organiser application's derived world. Mutating screens
use the shared local-first organiser pipeline: they create ordinary event groups,
derive the proposed world locally, and then either invoke the ordinary apply command
automatically or leave the group in the browser for review, according to the
session's commit policy. No screen owns a second draft list or persistence path.
The assignment board is a solver-owned projection of that same prospective
world, so family and room drafts are visible before they are applied. Its
narrow fixed-assignment action stages paired resolver labels through this shared
pipeline; it does not write assignments directly.

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

The board is a solver-owned review screen with an unplaced-family rail and room cards
grouped by building and floor.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ACCOMMODATIONS · ALL BUILDINGS                                      │
├─────────────────┬────────────────────────────────────────────────────────┤
│ UNPLACED (2)    │ MAIN HOUSE · FIRST FLOOR                              │
│ Seidel ×5 ⚠     │ Room 12 · 4 places · Morgan ×2 ✓                      │
│ Lang ×1         │ Room 14 · 6 places · open                             │
├─────────────────┴────────────────────────────────────────────────────────┤
│ [Entwurfsmodus starten]                     [cloud-pause icon · 3]      │
│ 3 Änderungsentwürfe · Seidel → Room 14 · [Entwürfe verwerfen] [Entwürfe anwenden] │
└──────────────────────────────────────────────────────────────────────────┘
```

The board renders the deterministic solver result and shows user-facing reasons for
infeasible placements, and reflects unapplied family or room configuration drafts.
The solver remains the only producer of assignments. The narrow fixed-assignment
action writes paired generic `needs`/`provides` labels through the shared draft
pipeline; invalid fixed assignments remain visible with diagnostics, and clearing
the action clears both labels. Richer placement overrides remain deferred.
Room cards show capacity status, room capabilities, and occupants by family. A drop
never splits a family or merges two families.

Keyboard and touch users can expand a family summary in place to inspect its people.
Solver explanations are not shown per family or room; a future dedicated explanation
screen owns that detail. Draft/apply/discard remains available through the global
save-status control, not through the board.

## 3. Organiser decisions and reports

The fixed resolver mechanisms and organiser decision labels remain domain capabilities,
but their prominent placement UI is deferred to
[`organiser-placement-overrides`](../deferred-ideas/organiser-placement-overrides.md).

The board's browser-printable output shows family-to-room assignments, unplaced families,
capacity, and constraint findings. The later generic report catalogue covers
workshops, attendance, and communication; it does not change the M6 data model.
