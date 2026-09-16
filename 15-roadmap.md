# 14 — Roadmap

The roadmap delivers reusable modules and the first deployed event profile in
parallel. Milestones distinguish generic implementation work from the concrete
configuration and real-data rehearsal for `familienfreizeit-2027`.

Sequenced so that each milestone leaves something usable, and so the riskiest
work happens while there is still time to change direction.

The ordering principle: **build the thing that tells you whether the design is
wrong, first.** That is the solver. Everything else is well-understood work that
can be estimated; the solver is the part that might reveal the model is
inadequate.

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

## M1 — Inventory and families

*Usable by an admin to enter data. Two days.*

- Event table, append function, projector skeleton
- `BuildingAdded`, `RoomAdded`, `BedAdded`, `RoomDesignationChanged`
- Place generation from `bed.sleeps`
- `FamilyInvited`, `PersonAdded`
- The generic `label` projection and a minimal built-in tag vocabulary (capabilities plus
  `needs-ensuite`) so that M2 has something to solve against
- CSV import with a validating preview
- Admin inventory and families screens — plain tables
- Cloudflare Access in front of `/admin` as a stopgap

**Done when:** the real hostel's rooms and beds are entered and the real family
list is imported. Do this with real data as early as possible; the inventory will
have surprises in it, and they should surface now rather than in M3.

---

## M2 — The solver, against real data

*The riskiest milestone. Do it third, not last. Three to four days.*

- `snapshot.ts` with the freeze-and-sort discipline
- Preflight, C1–C9
- The two generic handlers, `tagRequirements` and `tagPreferences`, replacing
  eight rule files — the generic handlers keep the implementation small
- Party formation: children's rooms first, residue, merges, the unplaceable-merge
  guard
- Placement phases 0–4
- The scoring table and the `Rule` interface, with `describe` mandatory
- Trace construction and a plain HTML rendering of it
- `derive(events, config)` and `diff` — the fold lifted clear of the database
- `PlanPublished` as a horizon marker, with the reviewed `output_hash`
- Shuffle-invariance test, golden fixtures, property tests

**No UI beyond a page that shows the trace.** Resist building the board here.

**Done when:** you can derive a plan from the real inventory and real families
(with preferences entered by hand into the database) and read the trace top to
bottom without confusion, and you can say whether the ensuite requests are
satisfiable — preflight C8.

**This is the checkpoint.** If party formation does not express the real
situation — if the families' actual arrangements do not fit the party model —
this is where you find out, and there is still time to change the model. Budget a
day for that possibility.

---

## M3 — Preferences and auth

*Families can use it. Two to three days.*

- Magic link, sessions, rate limits, the ten rules from [authentication](11-authentication.md)
- The family portal: a renderer over `familyFacing` profile tags, not
  hand-written sections — this keeps the milestone compact, and
  couples the portal to the profile by design
- htmx save-on-change with the progressive-enhancement fallback
- Invitation and reminder emails
- Admin chase list

**Done when:** you have sent yourself an invitation from the production domain,
logged in on a phone, stated preferences, and seen them in the event log.

Send the real invitations at the end of this milestone. Preferences take weeks to
arrive; the collection window should open as early as possible.

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
understand what happened each time.

Watch the line count on `client/board.ts` — the interaction code, not the shared
derivation core it bundles. Past ~600 lines, take the React escape hatch described
in [frontend](12-frontend.md) §1 rather than continuing.

---

## M5 — Publication

*Attendees get answers. Two days.*

- Plan diff, grouped by cause
- Publish flow: the horizon marker and the hash compare-and-swap
- The attendee assignment view, derived at the publication horizon, with a print
  stylesheet
- Change emails computed from the diff
- Dashboard staleness with the background derivation

**Done when:** publishing twice in a row with no intervening changes sends zero
emails. That is the test of the whole determinism argument, and it is worth
verifying explicitly.

---

## M6 — Workshops

*Two to three days.*

- Slots and workshops in inventory
- Ranking UI in the family portal
- The workshop solver with the fairness ledger
- `workshop-with` co-assignment groups (rankings unchanged)
- Cancellation sweep
- Admin workshop screen with the preference heatmap
- Workshop constraints

Separable from everything before it. If time runs out, workshops can be assigned
on paper while rooms are not.

---

## M7 — Constraint health

*One to two days. The milestone that is easiest to skip and should not be.*

- Retirement loop with the redundant / near / load-bearing buckets
- The dashboard panel, batch retirement
- Constraint health screen with missing-provider and contradiction findings
- Custom constraint definition and label application UI
- Constraint fixture export and the CI corpus
- Constraint usage and redundancy metrics

**Done when:** an admin can add, inspect, clear, and regression-test a custom
constraint without a second override model.

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

---

## Sequencing rationale

**Why derivation lands with the solver.** Lifting the fold clear of the database
costs almost nothing while the projector is being written and is an awkward retrofit
afterwards, and everything from M4 onward — the board's pending list, the plan diff,
constraint health — is a call on it.

**Why the solver before the UI.** It is the only part where the design might be
wrong in a way that invalidates other work. A board built on a party model that
turns out not to fit is wasted; a solver built without a board is merely
unpolished.

**Why real data in M1.** Entering 40 rooms from a hostel's website reveals things
no fixture will: rooms that are really two rooms, a bungalow with an outdoor
bathroom, a tent that sleeps four but only comfortably three. The model should
meet reality before it meets the solver.

**Why auth after the solver.** Nothing in M2 needs a login — admin screens sit
behind Cloudflare Access, and preferences can be inserted by hand for testing.
Auth is well-understood work with no design risk, so it waits.

**Why publication before workshops.** Room assignment is the thing people are
anxious about. Getting it published and correct is worth more than having
workshops half-built alongside.

---

## Cut lines

If time runs short, in the order they should go:

1. **htmx.** Plain forms and redirects. Loses polish, costs nothing functional.
2. **The bed-level view.** Room-level assignment is enough; bed allocation within
   a room can be a piece of paper taped to the door.
3. **Workshops entirely.** A paper sign-up sheet at the hostel is a fine fallback
   and has worked for decades.
4. **The plan diff.** Publish without it and email everyone rather than only the
   affected families. Worse, not broken.
5. **Multi-select on the board.** Drag one party at a time. Slower, still better
   than a spreadsheet.

**Never cut:** the determinism contract, the trace, human-readable constraint
definitions, or the profile. Each is cheap to build and expensive to retrofit, and each is
load-bearing for something else. A solver without a trace is a black box
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
| Scope creep into catering, transport, payments | **High** | The scope section in the README; say no |
| Profile vocabulary settles badly and needs churn mid-run-up | Medium | `aliases` from day one; C7 makes removals visible; a rename costs nothing |

The two highest-likelihood risks are both about data rather than software.
Families will not fill in the form, and the room inventory will be wrong. Plan
admin time for chasing and for a walk-through, and treat both as first-class work
rather than as things that will sort themselves out.
