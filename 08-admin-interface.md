# 08 — Admin interface

Three people will use this, for about six weeks, on laptops. Design for
competence and speed, not for onboarding. Assume they will use it daily and learn
it.

The board is the only screen that needs real interaction design. Everything else
is tables and forms, and should be boring on purpose.

---

## 1. Screen inventory

| Route | Screen | Purpose |
|---|---|---|
| `/admin` | Dashboard | Status, staleness, constraint health, what needs attention |
| `/admin/families` | Families | Table, import, invite, chase list |
| `/admin/families/:id` | Family detail | People, preferences, full event history |
| `/admin/inventory` | Inventory | Buildings, rooms, beds, designations |
| `/admin/parties` | Party review | Derived parties with provenance; merge and split |
| `/admin/board` | The board | Room assignment by drag and drop |
| `/admin/plans` | Plans | List, diff, publish |
| `/admin/plans/:a/diff/:b` | Plan diff | What moved and why |
| `/admin/workshops` | Workshops | Slots, capacity, fill, preference heatmap |
| `/admin/constraints` | Constraints | Create, inspect, clear, and explain matching constraints |

`/admin/constraints` renders built-in and custom definitions, shows which labels
are in use and by how many entities, and lists current
preflight findings. It is where an admin looks to answer "what can I even ask
for".

---

## 2. Dashboard

The one screen an admin opens every morning. It answers one question: *does
anything need me today?*

Layout, top to bottom, in descending order of urgency:

**Plan status.** One block, large.

> Published 3 days ago · plan #7
> **14 events since.** Re-running would move **6 people**. *Review changes →*

The "would move 6 people" is `diff(derive(published), derive(all))`, described in
[01-architecture](01-architecture.md). It turns a scary count of events into an
accurate count of consequences. If the derivation produces the same hash:

> Published 3 days ago · plan #7
> 14 events since, none affecting assignments. **Up to date.**

**Blocking items**, only when present. Preflight findings, constraint conflicts,
unplaceable parties, refused merges, workshops below minimum. Each links
directly to the thing.

Preflight findings come first. C8 in particular is the earliest possible
warning and should be the most prominent thing on the screen when it fires:

> ⚠ **needs-ensuite: 19 beds required, 14 available.** Five people cannot be
> placed however the rooms are arranged. *See affected families →*

> ⚠ **2 constraint conflicts** — constrained people are no longer in one party.
> ⚠ **1 party cannot be placed** — Braun ×5 requires ensuite; none free.

**Constraint health.** Active constraints with no provider, contradictions, and
constraints currently doing no work.

**Chase list.** Families who have not logged in, or who have logged in but
submitted nothing. With a "send reminder" action that emails the lot.

> 8 families have not opened their invitation.
> 5 have logged in but stated no room preference.
> 12 people have no workshop rankings for Samstag Vormittag.

**Quality numbers.** Small, at the bottom, trending.

> 3 orphan beds · 19/24 co-room wishes satisfied · 4 people with no top-two choice
> · 11 active constraints

---

## 3. Families

A table. Sortable, filterable, 55 rows.

Columns: family, email, people, preferences stated, workshops ranked, last seen,
constraints. Filter chips include *no login*, *no room preference*, *incomplete
workshops*, and *has constraints*.

**Import.** Paste a CSV or upload one. Parse with papaparse, show a preview table
with per-row validation before anything is written:

> 54 rows parsed. 52 ready, 2 problems.
> Row 14 — `mueller@example.com` duplicates row 9 (`Mueller@example.com`).
> Row 31 — birthdate `31.02.2015` is not a date.

Import is all-or-nothing after the preview is accepted. Each family becomes one
`FamilyInvited` plus one `PersonAdded` per person, appended in order.

Expected columns, documented on the page itself: `email`, `family_name`,
`given_names` (semicolon-separated), `birthdates` (semicolon-separated, matching
order), `roles`. Be generous about header naming and show what was matched.

**Family detail** shows people, current preferences, and — the useful part — the
complete event history for that family, rendered as prose. The preferences
block renders tag assignments with their strengths and labels from the
profile. The event history renders `LabelSet` / `LabelCleared` in prose using
the built-in or custom constraint definition:

> 12 Sep 14:22 · *Organiser Anna, on behalf of this family* · set Eigenes Bad
> to preferred, Drinnen schlafen to required.
> 12 Sep 14:23 · *Organiser Anna* · "Wrote in saying the youngest is scared of
> the dark, would like a room with a window onto the courtyard."
> 14 Sep 09:01 · *This family* · set Möchte ins Kinderzimmer for Jonas (9).

The event actor identifies the authenticated principal while the subject
identifies the affected family or person. No separate on-behalf-of role is needed.

---

## 4. Party review

The screen that should exist before the board, and the one most likely to be
skipped. Put it in the navigation before the board so it is read first.

A list of derived parties, sorted by bed demand descending — so the hard ones are
at the top and the fragments are visible at the bottom.

Each party renders as a card:

```
┌────────────────────────────────────────────────────────────────┐
│ P07 · 5 people · 4 beds                    [ split ] [ merge ] │
│                                                                │
│ Müller — Anna (38), Kai (41)                                   │
│ Schmidt — Jana (36), Tom (39), Mia (0, no bed)                 │
│                                                                │
│ Requires: ensuite (Schmidt)                                    │
│                                                                │
│ Merged from a mutual room-with request (12 Sep, 13 Sep).       │
│ Müller's two children are in children's room K3.               │
└────────────────────────────────────────────────────────────────┘
```

Provenance is the content. An admin reading this card should be able to tell
exactly why these five people are one unit without opening anything else.
Each requirement names which member family contributed it
([labels and constraints](04-labels-and-constraints.md) §5.3) — a merged party's `required` tag binding
everyone is correct but surprising, and the card is where that surfaces.

**Warnings inline, at the top:**

> ⚠ 7 parties of one person. Consider merging or contacting these families.
> ⚠ Merge refused: Müller + Schmidt + Weber, combined demand 10 exceeds
> the largest room (6 places). Treated as a preference instead.
> ⚠ Preflight C4: merged party Müller + Schmidt + Weber needs a six-place
> ensuite room (Schmidt's requirement); no such room exists.

**Merge and split** open a small dialog and append `groups-with` or
`separates-from` labels on the people concerned to the pending list. There is no
party override event and no reason code: the constraint's own description says why,
and party formation re-derives from it like any other constraint. Since party
formation is the judgement call and the one most worth trying twice, this screen
benefits from the pending list as much as the board does.

**Children's room allocation** gets its own section on this page, since it
happens before party formation and determines everything after:

> **K3** · Haus B, Raum 22 · 6 places · ages 8–14
> Jonas Müller (9), Lena Schmidt (11), Ada Weber (10), Nils Weber (13), Mia Braun (8)
> 1 place free.
>
> **Not placed:** Tim Braun (7) — below the age band for every children's room.
> Returned to the Braun family party.

---

## 5. The board

The only genuinely designed screen. Everything here serves one goal: make the
assignment puzzle legible at a glance and adjustable without thought.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [search parties…]   Haus A  Haus B  Zelte   ○ unplaced only   plan #8 ⟳  │
├──────────────┬───────────────────────────────────────────────────────────┤
│ UNPLACED (3) │  HAUS A · Erdgeschoss                                     │
│              │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ ┌──────────┐ │  │ 01 · 4 ●●●●  │ │ 02 · 2 ●●    │ │ 03 · 5 ●●●○○ │       │
│ │ Braun ×5 │ │  │ ensuite      │ │              │ │ ensuite      │       │
│ │ ensuite  │ │  │ ─────────────│ │ ─────────────│ │ ─────────────│       │
│ │ ⚠ no fit │ │  │ Weber ×4     │ │ Koch ×2      │ │ Braun ×3     │       │
│ └──────────┘ │  │        ✓ ⚲   │ │        ✓     │ │        ✓ ⚲   │       │
│              │  └──────────────┘ └──────────────┘ └──────────────┘       │
│ ┌──────────┐ │                                                           │
│ │ Lang ×1  │ │  HAUS A · 1. Stock                                        │
│ └──────────┘ │  …                                                        │
└──────────────┴───────────────────────────────────────────────────────────┘
```

Left rail: unplaced parties, always visible, with the blocking reason. Main area:
rooms as cards, grouped by building and floor, in `sort_key` order.

### Room cards

The card is the information display, so it carries everything needed to judge a
drop without opening anything:

- **Number and place count**, with filled and free places as discrete marks
  (`●●●○○`). Discrete marks rather than a bar, because the question is always
  "how many more fit", and counting five dots is faster than reading "3/5".
- **Attribute chips**: ensuite, outside, accessible, child room with its age band.
- **Occupants**, one line per party with size.
- **Status glyphs**: `✓` all constraints satisfied, `⚠` a soft penalty applied,
  `⚲` constrained by an admin rule.

Colour alone never carries meaning. The neobrutalism palette is high-contrast and
tempting to lean on, but a constrained room and a warned room must be
distinguishable in greyscale and by anyone with a colour vision deficiency. Use
the glyph plus a border treatment: constrained rooms get a doubled border, warned
rooms get a hatched top edge.

### Drag interaction

Built on `@atlaskit/pragmatic-drag-and-drop` — framework-agnostic, ~4.7kB core,
the same toolchain behind Trello and Jira.

- **Drag target is the room card**, not an individual place. Which bed within a
  room is a detail the solver handles and admins rarely care about. A separate
  bed-level view handles the exceptions (see below).
- **On drag start**, rooms that cannot accept the party dim and lose their drop
  affordance. Rooms that can accept it but would incur a penalty show the penalty
  as a ghost chip, its text read from the constraint definition rather than
  hard-coded: `−12 Zimmer teilen`.
- **On drop**, the constraint is appended to the pending list and the board
  re-derives locally. There is no request and no optimistic guess to reconcile:
  what appears is the real plan for those events.
- **If the re-derivation moves anything else**, those cards flash once and a
  summary appears: *"Constraint added for Braun ×5 → Room 03. 2 other parties
  moved. See what changed →"*. Cascading moves are the main way a board like this
  surprises people; showing them immediately is the difference between trust and
  suspicion.

### Pending changes

Every board action appends an event to the **pending list**
([01-architecture](01-architecture.md)) rather than to the log. The board renders
`derive(committed ++ pending)`, so the plan on screen is always the real plan for
everything the admin has done so far.

A bar along the bottom carries the count and the two ways out:

> **3 pending changes** · Braun ×5 → Raum 03 · Koch ×2 → Raum 02 · Weber split
> [ Apply ] [ Discard ]

Usually the list is empty and the bar is absent, which is the ordinary state of the
board rather than a special one.

**Apply** appends the events in order, in one request. The server validates and
authorises each one exactly as it would a single action, appends them together, and
derives. **Discard** drops them; because nothing was written, nothing is left
behind — no cleared labels, no retired constraints, no sediment in the family's
event history.

This is what makes the board safe to think in. An admin can try an arrangement,
look at the constraint health and the diff it would produce, and walk away from it
without having said anything.

### Multi-select

The feature a spreadsheet cannot have, and the reason the board is worth
building.

Shift-click or ctrl-click parties in the left rail or on room cards to build a
selection; drag any member and the whole selection moves. The drag preview shows
the combined headcount so an admin can see at a glance whether it will fit.

This is what "five children from five families should share a room" looks like as
an interaction: select five, drag once.

### Keyboard

Faster than dragging once learned, and it is also the accessibility story. Not
optional.

| Key | Action |
|---|---|
| `/` | Focus the party search |
| `↑ ↓` | Move through the party list |
| `Space` | Add to selection |
| `Enter` | Open the room picker for the selection |
| `r` then digits | Assign directly to a room number |
| `u` | Drop the selected party's pending constraint |
| `z` | Undo the last action |
| `Esc` | Clear selection |

The room picker is a filtered list showing feasibility and score per room, which
makes it strictly more informative than dragging — an admin who learns it will
prefer it.

### Bed-level view

Click into a room to see individual places. Needed for the real cases: who gets
the bottom bunk, which family takes the double, who is next to the window. Drag
people between places within the room; emits a place-targeted constraint.

Kept out of the main board deliberately. Surfacing 120 places at once is noise
when the actual question is almost always "which room".

### Undo

`z`, and a button. It pops the last pending event and re-derives. Undo is exact
rather than compensating: there is no cleared label and no second event recording
that the first was a mistake, because the first was never committed.

Undoing past the start of the pending list is not undo — the change is published
history by then, and the way back is a new constraint that says what should happen
instead.

### Concurrency

Three admins, optimistic locking.

Apply carries the `input_seq` the pending list was built on. If the log has moved
since, the server returns 409 with the events it has gained, and the board says:

> Anna appended 2 events while you were working. Your 3 pending changes still
> apply. **[ Re-derive on her changes ]**

Re-deriving is honest work rather than merge logic: the pending events are folded
onto the newer log and the board shows the resulting plan. Payloads are complete
restatements ([03-events](03-events.md)) and constraints name stable entities
([07-constraint-health](07-constraint-health.md) §3), so the result is well defined.
A pending event that names something Anna withdrew surfaces as an ordinary
constraint diagnostic, not as a conflict the admin has to resolve by hand.

No operational transform, no Durable Objects. At three admins the collision rate is
near zero.

### Empty state

An empty board is the first thing a new admin sees, and it should be an
instruction rather than a void:

> No plan yet. Add rooms and beds in **Inventory**, import families, then
> **compute a plan**. You can adjust it here afterwards.

---

## 6. Plan diff

Where publication confidence comes from. Two plans side by side, only the
differences shown, grouped by cause.

```
plan #7 (published 12 Sep)  →  plan #8 (draft)

BECAUSE OF NEW PREFERENCES (4 people)
  Weber ×4   Raum 01 → Raum 07   Weber stated ensuite required (14 Sep)

BECAUSE OF ADMIN CONSTRAINTS (5 people)
  Braun ×5   Raum 12 → Raum 03   Zimmer mit Gartenblick, added by Anna, 15 Sep

KNOCK-ON (2 people)
  Koch ×2    Raum 03 → Raum 02   displaced by the above

UNCHANGED  46 people
```

Grouping by cause is what makes the diff readable. A flat list of eleven moves
tells an admin nothing; moves attributed to a preference or custom constraint,
with the remainder marked knock-on, tell them whether to publish.

Attribution is computed, not guessed. For each event between the two positions,
derive again without it and see whether the move survives; the move is attributed
to the events whose absence removes it, and to knock-on if none of them does. For
the ordinary case — a dozen or two events since publication — that is a dozen or two
derivations of a few milliseconds each, and the answer is exact rather than a rule
of thumb that is wrong precisely when the plan is most tangled.

Publishing from this screen shows exactly who will be emailed.

---

## 7. Constraints

Each constraint row shows its label, explanation, needs, providers, strength,
and current resolver status. Admins can create a custom matching definition,
apply it to entities, or clear an application. Missing providers and
contradictions are visible immediately.

---

## 8. Workshops

Per slot: workshops with capacity, current intake, and a fill bar. Below, a
preference heatmap — people down one axis, workshops across, cells shaded by
rank. It makes oversubscription and dead workshops obvious at a glance, which is
the information needed to adjust capacities before running the solver.

Warnings: below minimum capacity, no eligible participants, age bands that
partition the population and strand people.

---

## 9. Copy

The interface's voice, applied consistently.

**Buttons say what happens, and the result echoes them.** "Publish plan" produces
"Plan published". "Compute plan" produces "Plan computed". Never "Submit".

**Errors state what happened and what to do.** Not "Invalid input" but "Row 31:
birthdate `31.02.2015` is not a date. Use `DD.MM.YYYY`."

**Empty states are invitations.** Not "No constraints" but "No constraints yet.
Add one when the plan needs a human rule."

**Numbers get units and comparison.** Not "11" but "11 active constraints (was 19)".

**No apologies, no exclamation marks, no "Oops".** These are organisers doing
administrative work; the interface should be a competent colleague.

**German or English.** The audience is a German Jugendherberge. Family-facing
copy should be German with an English fallback (`family.locale`). Admin-facing
copy can be either — pick one and be consistent. Room names, buildings and
workshop titles come from the data and are whatever the organisers typed.

Admin-facing labels come from the built-in or custom definition and family-facing text
from `familyFacing.label`, so the two audiences can be worded differently for
the same tag.
