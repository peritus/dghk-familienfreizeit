# 15 — Roadmap

This is the single source for release scope, implementation order, cut lines,
and deferred work. It delivers reusable modules and the first deployed occasion
profile in parallel. Milestones distinguish generic implementation work from
the concrete configuration and real-data rehearsal for `familienfreizeit-2027`.

Sequenced so that each milestone leaves something usable, and so the riskiest
work happens while there is still time to change direction.

The ordering principle: **build the thing that tells you whether the design is
wrong, first.** That is the solver. Everything else is well-understood work that
can be estimated; the solver is the part that might reveal the model is
inadequate.

## Initial release scope

Only these capabilities are in scope for the initial release:

- Organiser-managed inventory: buildings, rooms, beds, and room designations.
- Magic-link authentication with a code-level organiser allowlist.
- Deterministic whole-family room assignment with a full human-readable explanation.
- Deterministic workshop assignment with an explicit fairness objective.
- Drag-and-drop organiser board that writes constraints, not assignments.
- Deterministic plans identified by `input_seq`, and publication.
- Organiser decision labels across fixed resolver mechanisms, with free-form
  matching values and one optional note, which organisers can add and clear.

The milestones below are the unified implementation order. Work that supports
the initial release is included in that release; work explicitly identified as
deferred belongs after it.

---

## M0 — Skeleton

*Nothing usable yet. Half a day.*

- Vite, React, and `@cloudflare/vite-plugin`; Hono mounted in `src/worker`
- Wrangler, D1 created, migrations wired
- The neobrutalism registry `init`, with Button and Card copied in
- `vite` serving the application, one API route, and a button that looks right
- Vitest with `@cloudflare/vitest-pool-workers` running one trivial test in `workerd`
  from the same `vite.config.ts` the build uses
- The Worker deployed on the Workers Paid plan
- CI green

**Done when:** a pull request runs tests and deploys to preview automatically, and
the Vite plugin, Vitest, and the Workers pool are on versions that work together
(D9). If that pairing cannot be made to work, stop and put D9 up for review before
building on it.

---

## M1 — Inventory and organiser access

*Usable by an organiser to enter data. Two days.*

- Event table, the `seq`-guarded append, fold skeleton
- `BuildingAdded`, `RoomAdded`, `BedAdded`, `RoomDesignationChanged`
- Place generation from `bed.sleeps`
- `FamilyInvited`, `PersonAdded` fixtures for solver development; family-facing
  onboarding is deferred
- KDL event-log fixtures are the canonical authored inputs for development and
  tests; the same parsed events seed D1 integration tests and local experiments
- Generic labels in the fold and a minimal built-in tag vocabulary (capabilities plus
  `needs-private-sanitary`) so that M2 has something to solve against
- Organiser inventory screens — plain tables
- Magic-link authentication, sessions, rate limits, and the code-level organiser allowlist

**Done when:** the real hostel's rooms and beds are entered and an organiser
can sign in. Do this with real inventory data as early as possible; it will have
surprises in it, and they should surface now rather than in M2.

### Development event-log sandbox

Throughout M1–M7, development may select `TextFileEventSource` instead of
`D1EventSource` with an explicit development-only configuration. The source reads
the KDL event-log fixtures and the organiser application can inspect the resulting
derived world without requiring a populated D1 database. The same KDL loader is
used by tests, so a scenario can move from a fixture to the UI without being
translated into another data format.

---

## M2 — The solver, against real data

*The riskiest milestone. Do it third, not last. Three to four days.*

- `solver-input.ts` with the freeze-and-sort discipline
- Preflight: kernel checks and the room modules' checks
- The module contract, `defineOccasionProfile`, and the room modules
  ([modules](20-modules.md)); the two generic tag rules, `hard.tag-requirements` and
  `soft.tag-preferences`, keep the implementation small
- Family-unit construction: one placement unit per family, with family-level
  requirements and bed demand
- Placement phases 0–4
- The scoring table and the `Rule` interface, with `describe` mandatory
- Trace construction and a plain-text rendering of it
- `derive(events, config)` and `diff` as the only read path
- `PlanPublished` identifying the plan's `input_seq`, with the reviewed `output_hash`
- Shuffle-invariance test, golden fixtures, property tests

**No UI beyond a page that shows the trace.** Resist building the board here.

**Done when:** you can derive a plan from the real inventory and real families
(with requirements entered by hand as events) and read the trace top to
bottom without confusion, and you can say whether the ensuite requests are
satisfiable — requirement arithmetic
([room assignment](20.3-room-assignment.md) §9).

**This is the checkpoint.** If whole-family placement does not express the real
situation, record the missing arrangement as a deferred sleeping-parties or
child-rooms requirement rather than introducing a partial placement model.

---

## M3 — Deferred family preferences and view

*Post-initial-release work. Two to three days.*

- The family view: a renderer over `family_facing` profile tags, not
  hand-written sections — this keeps the milestone compact, and
  couples the family view to the profile by design
- Save-on-change with a per-control confirmation and a visible failure state
- Invitation and reminder emails
- Organiser chase list

**Done when:** a family can use the family view to state preferences and see them in
the event log.

Send the real invitations only after this deferred milestone is delivered.

---

## M4 — The whole-family board

*The organiser tool becomes real. Three to four days.*

- Board: room cards, room grouping, status glyphs
- Board interaction: pragmatic-drag-and-drop, multi-select, keyboard
- The pending list, deriving locally on every action; apply and discard
- Organiser decisions through needs/provides, exclusions, and separation;
  show optional notes with the existing event author and timestamp
- Undo by removing the last action's pending events together
- Apply-time compare-and-swap with 409 re-derivation
- The cross-runtime agreement test, before the board is trusted

**Done when:** an organiser who has not seen the code can rearrange a plan and
understand what happened each time, and can add and clear a human-readable
decision label without defining new vocabulary or supplying a separate name.

## M5 — Plans and publication

*The plan becomes an answer. Two days.*

- Plans identified by `input_seq`
- Publish flow: the publication event, the hash compare-and-swap, and
  acknowledgement of error findings
- The published-plan view, derived from the plan selected by publication

Families reach that view once the deferred family view of M3 is delivered; until
then the published plan is read by organisers and printed from the reports.

**Done when:** an organiser can publish a reviewed plan and reproduce
the same deterministic result from the plan identified by its `input_seq`.

---

## M6 — Workshops

*Two to three days.*

- Slots and workshops in inventory
- The workshop solver with the fairness ledger
- Workshop decision labels through all applicable fixed resolver mechanisms

The solver, its fairness objective, co-assignment groups, and under-subscription
cancellation are initial-release work: they are module behaviour the plan depends
on ([workshop assignment](20.6-workshop-assignment.md)). The family-facing ranking
UI and the organiser preference heatmap are post-initial enhancements.

---

## M7 — Hardening

*Continuous, through the run-up.*

- `scripts/tune.ts` and a weight-tuning pass against the real exported log
- Copy review, German throughout the family surface
- Accessibility pass: keyboard, contrast, focus, reduced motion
- Deliverability testing against GMX, web.de, Gmail, Outlook
- The pre-occasion runbook from [deployment](13-deployment.md) §10

## M8 — Deferred sleeping modules

*Future work. Reintroduces family splitting and cross-family sleeping groups as a
coherent capability.*

- Sleeping-party module: derived family residue, co-room merges, party requirements,
  provenance, merge guards, and party-level diagnostics
- Child-rooms module: child-group entities, child-room placement before family
  residue, fallback, and minimum occupancy
- Party review screen with merge and split
- Cross-family co-room controls and the corresponding family-facing preferences
- Migration of whole-family fixtures and reports to cover split and merged plans

The modules must be selected together for a profile that permits families to split
or merge. Their deferred specifications live under [`deferred-ideas/`](deferred-ideas/).

---

---

## Post-initial-release work

The following work remains in the detailed milestones as planning context, but
is not part of the initial release: family import and self-service preference
collection, food preferences and allergy notes, family-contributed materials,
workshop-linked supplies, change emails,
multi-occasion tenancy, collaborative editing, arrival and departure logistics,
transport, parking, payments, and mobile-first organisation.

---

## Sequencing rationale

**Why derivation lands with the solver.** Every read already goes through the
fold, so making `derive` the solver's entry point costs almost nothing now and is an
awkward retrofit afterwards, and everything from M4 onward — the board's pending list, publication,
and change emails — is a call on it.

**Why the solver before the UI.** It is the only part where the design might be
wrong in a way that invalidates other work. A board built on the wrong placement
unit is wasted; a solver built without a board is merely unpolished.

**Why real data in M1.** Entering 40 rooms from a hostel's website reveals things
no fixture will: rooms that are really two rooms, a bungalow with an outdoor
bathroom, a tent that sleeps four but only comfortably three. The model should
meet reality before it meets the solver.

**Why organiser access lands in M1.** Every initial-release surface is an
organiser surface, so the magic-link flow and code-level allowlist belong with the
inventory rather than as a stopgap. Family-facing authentication and preference
collection remain deferred to M3.

**Why publication before workshops.** Room assignment is the thing people are
anxious about. Getting it published and correct is worth more than having
workshops half-built alongside.

---

## Cut lines

If time runs short, in the order they should go:

1. **The bed-level view.** Room-level assignment is enough; bed placement within
   a room can be a piece of paper taped to the door.
2. **The plan diff.** Publish without it and email everyone rather than only the
   affected families. Worse, not broken.
3. **Multi-select on the board.** Drag one family at a time. Slower, still better
   than a spreadsheet.

**Never cut:** the determinism contract, the trace, human-readable constraint
definitions, the workshop solver and fairness objective, or the profile. Each
is cheap to build and expensive to retrofit, and each is load-bearing for
something else. A solver without a trace is a black box
nobody will trust; unexplained constraints are permanent sediment. The profile
is **not cuttable** — it consolidates the matching model and occasion vocabulary, so
removing it is a larger change than keeping it. Preflight **is** cuttable down
to requirement arithmetic alone, which carries most of the value.

---

## Risks

| Risk | Likelihood | What to do |
|---|---|---|
| Whole-family placement does not fit the real families | Medium | Record the missing split or merge in the deferred sleeping modules and keep the initial scope coherent |
| Families do not submit preferences | **High** | Chase list from M3; expect to phone people |
| Inventory data is wrong (bed counts, ensuites) | **High** | Walk the building, or have someone who has |
| The board is slower than a spreadsheet for the organiser who knows the families | Medium | Keyboard path; multi-select; measure honestly |
| Capacity is genuinely insufficient | Low | The unplaced report names the binding constraint early |
| Solver is chaotic — small input changes move many people | Low | The `movedCount` integration test catches it |
| Scope creep into catering, transport, payments | **High** | The scope section in this roadmap; say no |
| Profile vocabulary settles badly and needs churn mid-run-up | Medium | `aliases` from day one; `kernel.unknown-tag` makes removals visible; a rename costs nothing |

The two highest-likelihood risks are both about data rather than software.
Families may not fill in a future preference form, and the room inventory will be
wrong. Plan organiser time for the walk-through now; preference chasing belongs to
the deferred family-view work.
