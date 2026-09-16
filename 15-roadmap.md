# 15 — Roadmap

This is the single source for release scope, implementation order, cut lines,
and deferred work. It delivers reusable modules and the first deployed event
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

- Admin-managed inventory: buildings, rooms, beds, and room designations.
- Magic-link authentication with a code-level admin allowlist.
- Deterministic room assignment with a full human-readable explanation.
- Deterministic workshop assignment with an explicit fairness objective.
- Drag-and-drop admin board that writes constraints, not assignments.
- Deterministic plans identified by `input_seq`, and publication.
- Custom, human-readable matching constraints that admins can add and clear.

The milestones below are the unified implementation order. Work that supports
the initial release is included in that release; work explicitly identified as
deferred belongs after it.

---

## M0 — Skeleton

*Nothing usable yet. Half a day.*

- `npm create hono@latest`, strip to the Cloudflare Workers target
- Wrangler, D1 created, migrations wired
- Tailwind CLI, the neobrutalism token block, the eight elements
- `wrangler dev` serving a page with a button that looks right
- Vitest with `@cloudflare/vitest-pool-workers` running one trivial test
- CI green

**Done when:** a pull request runs tests and deploys to preview automatically.

---

## M1 — Inventory and administrator access

*Usable by an admin to enter data. Two days.*

- Event table, the `seq`-guarded append, fold skeleton
- `BuildingAdded`, `RoomAdded`, `BedAdded`, `RoomDesignationChanged`
- Place generation from `bed.sleeps`
- `FamilyInvited`, `PersonAdded` fixtures for solver development; family-facing
  onboarding is deferred
- Generic labels in the fold and a minimal built-in tag vocabulary (capabilities plus
  `needs-ensuite`) so that M2 has something to solve against
- Admin inventory screens — plain tables
- Magic-link authentication, sessions, rate limits, and the code-level admin allowlist

**Done when:** the real hostel's rooms and beds are entered and an administrator
can sign in. Do this with real inventory data as early as possible; it will have
surprises in it, and they should surface now rather than in M2.

---

## M2 — The solver, against real data

*The riskiest milestone. Do it third, not last. Three to four days.*

- `solver-input.ts` with the freeze-and-sort discipline
- Preflight, C1–C9
- The two generic handlers, `tagRequirements` and `tagPreferences`, replacing
  eight rule files — the generic handlers keep the implementation small
- Party formation: children's rooms first, residue, merges, the unplaceable-merge
  guard
- Placement phases 0–4
- The scoring table and the `Rule` interface, with `describe` mandatory
- Trace construction and a plain HTML rendering of it
- `derive(events, config)` and `diff` as the only read path
- `PlanPublished` identifying the plan's `input_seq`, with the reviewed `output_hash`
- Shuffle-invariance test, golden fixtures, property tests

**No UI beyond a page that shows the trace.** Resist building the board here.

**Done when:** you can derive a plan from the real inventory and real families
(with preferences entered by hand as events) and read the trace top to
bottom without confusion, and you can say whether the ensuite requests are
satisfiable — preflight C8.

**This is the checkpoint.** If party formation does not express the real
situation — if the families' actual arrangements do not fit the party model —
this is where you find out, and there is still time to change the model. Budget a
day for that possibility.

---

## M3 — Deferred family preferences and portal

*Post-initial-release work. Two to three days.*

- The family portal: a renderer over `familyFacing` profile tags, not
  hand-written sections — this keeps the milestone compact, and
  couples the portal to the profile by design
- htmx save-on-change with the progressive-enhancement fallback
- Invitation and reminder emails
- Admin chase list

**Done when:** a family can use the portal to state preferences and see them in
the event log.

Send the real invitations only after this deferred milestone is delivered.

---

## M4 — Party review and the board

*The admin tool becomes real. Three to four days.*

- Party review screen with provenance, merge and split
- Board: server-rendered cards, room grouping, status glyphs
- The island: pragmatic-drag-and-drop, multi-select, keyboard
- The pending list, deriving locally on every action; apply and discard
- Custom constraint definitions and `needs/provides` label application
- Undo by popping a pending event
- Apply-time compare-and-swap with 409 re-derivation
- The cross-runtime agreement test, before the board is trusted

**Done when:** an organiser who has not seen the code can rearrange a plan and
understand what happened each time, and can add and clear a human-readable
matching constraint.

Watch the line count on `client/board.ts` — the interaction code, not the shared
derivation core it bundles. Past ~600 lines, take the React escape hatch described
in [frontend](12-frontend.md) §1 rather than continuing.

---

## M5 — Plans and publication

*Attendees get answers. Two days.*

- Plans identified by `input_seq`
- Publish flow: the publication event and the hash compare-and-swap
- The published-plan view, derived from the plan selected by publication

**Done when:** an administrator can publish a reviewed plan and reproduce
the same deterministic result from the plan identified by its `input_seq`.

---

## M6 — Workshops

*Two to three days.*

- Slots and workshops in inventory
- The workshop solver with the fairness ledger
- Workshop constraints

The solver and its fairness objective are initial-release work. Family ranking
UI, co-assignment groups, cancellation handling, and the preference heatmap are
post-initial enhancements.

---

## M7 — Deferred constraint health

*Post-initial-release work. One to two days.*

- Retirement loop with the redundant / near / load-bearing buckets
- The dashboard panel, batch retirement
- Constraint health screen with missing-provider and contradiction findings
- Constraint fixture export and the CI corpus
- Constraint usage and redundancy metrics

**Done when:** an admin can inspect constraint health and regression-test the
custom constraint corpus without a second override model.

This is the milestone that pays off over the following weeks rather than
immediately, which is exactly why it gets cut under pressure. Do it before M8.

---

## M8 — Hardening

*Continuous, through the run-up.*

- `scripts/tune.ts` and a weight-tuning pass against the real exported log
- New built-in profile tags from recurring custom constraints
- Copy review, German throughout the family surface
- Accessibility pass: keyboard, contrast, focus, reduced motion
- Deliverability testing against GMX, web.de, Gmail, Outlook
- The pre-event runbook from [deployment](13-deployment.md) §9

## Post-initial-release work

The following work remains in the detailed milestones as planning context, but
is not part of the initial release: family import and self-service preference
collection, food preferences and allergy notes, family-contributed materials,
workshop-linked supplies, change emails, the constraint-health dashboard,
multi-event tenancy, collaborative editing, arrival and departure logistics,
transport, parking, payments, and mobile-first administration.

---

## Sequencing rationale

**Why derivation lands with the solver.** Every read already goes through the
fold, so making `derive` the solver's entry point costs almost nothing now and is an
awkward retrofit afterwards, and everything from M4 onward — the board's pending list, publication,
and constraint health — is a call on it.

**Why the solver before the UI.** It is the only part where the design might be
wrong in a way that invalidates other work. A board built on a party model that
turns out not to fit is wasted; a solver built without a board is merely
unpolished.

**Why real data in M1.** Entering 40 rooms from a hostel's website reveals things
no fixture will: rooms that are really two rooms, a bungalow with an outdoor
bathroom, a tent that sleeps four but only comfortably three. The model should
meet reality before it meets the solver.

**Why administrator access lands in M1.** Every initial-release surface is an
admin surface, so the magic-link flow and code-level allowlist belong with the
inventory rather than as a stopgap. Family-facing authentication and preference
collection remain deferred to M3.

**Why publication before workshops.** Room assignment is the thing people are
anxious about. Getting it published and correct is worth more than having
workshops half-built alongside.

---

## Cut lines

If time runs short, in the order they should go:

1. **htmx.** Plain forms and redirects. Loses polish, costs nothing functional.
2. **The bed-level view.** Room-level assignment is enough; bed allocation within
   a room can be a piece of paper taped to the door.
3. **The plan diff.** Publish without it and email everyone rather than only the
   affected families. Worse, not broken.
4. **Multi-select on the board.** Drag one party at a time. Slower, still better
   than a spreadsheet.
5. **Constraint-health dashboard.** Keep the underlying custom constraint
   lifecycle and explanations; defer the reporting surface.

**Never cut:** the determinism contract, the trace, human-readable constraint
definitions, the workshop solver and fairness objective, or the profile. Each
is cheap to build and expensive to retrofit, and each is load-bearing for
something else. A solver without a trace is a black box
nobody will trust; unexplained constraints are permanent sediment. The profile
is **not cuttable** — it consolidates the matching model and event vocabulary, so
removing it is a larger change than keeping it. Preflight **is** cuttable down
to C8 alone, which carries most of the value.

---

## Risks

| Risk | Likelihood | What to do |
|---|---|---|
| The party model does not fit the real families | Medium | M2 is the checkpoint; budget a day to revise |
| Families do not submit preferences | **High** | Chase list from M3; expect to phone people |
| Inventory data is wrong (bed counts, ensuites) | **High** | Walk the building, or have someone who has |
| The board is slower than a spreadsheet for the admin who knows the families | Medium | Keyboard path; multi-select; measure honestly |
| Capacity is genuinely insufficient | Low | The unplaced report names the binding constraint early |
| Solver is chaotic — small input changes move many people | Low | The `movedCount` integration test catches it |
| Scope creep into catering, transport, payments | **High** | The scope section in this roadmap; say no |
| Profile vocabulary settles badly and needs churn mid-run-up | Medium | `aliases` from day one; C7 makes removals visible; a rename costs nothing |

The two highest-likelihood risks are both about data rather than software.
Families may not fill in a future preference form, and the room inventory will be
wrong. Plan admin time for the walk-through now; preference chasing belongs to
the deferred family-portal work.
