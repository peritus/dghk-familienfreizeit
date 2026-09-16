# Bettenplan — modular event planning

Working name. Replace freely.

## What this is

A small web application composed from reusable event modules. A deployment
selects one event profile, which may assign people to rooms, workshops, or both.
The first deployed profile is `familienfreizeit-2027`.

Attendees state preferences. They never assign anything. A deterministic
algorithm produces a complete proposal. Admins review it, override where their
judgement beats the algorithm's, and publish. Overrides are recorded with a
reason so the algorithm can be taught to stop needing them.

## The shape of the problem

Three things make this harder than a seating chart:

**The assignable unit is not the family.** A family of five might sleep as a
party of two adults in one room while its three children sleep in a children's
room with children from four other families. The unit that must stay together is
derived from stated preferences, not from the family structure. We call it a
*party*, and forming parties correctly is a separate problem from placing them.

**Preferences conflict and the conflicts are not symmetrical.** Two families both
asking to room together is a merge. One family asking to room with another is a
wish. A family requiring an ensuite is a hard constraint. A family preferring one
is worth six points. The distinction has to live in the data model, not in
someone's head.

**The plan changes until the day before.** People register late, drop out, change
their minds about the children's room. Each change means a re-run. If the
re-run shuffles forty families who had no reason to move, the plan is useless and
the admins will go back to a spreadsheet. Stability across runs is a feature, and
it is the reason the solver is a pure deterministic function and admin decisions
are stored as constraints rather than as edits.

## Scope

**In scope for the initial release**

- Admin-managed inventory: buildings, rooms, beds, room designations.
- Family import from a spreadsheet, invitation by email.
- Family self-service: their people, room preferences, children's-room opt-ins,
  co-rooming requests, workshop rankings.
- Magic-link authentication, one login per family, and a code-level admin allowlist.
- Deterministic room assignment with a full human-readable explanation.
- Deterministic workshop assignment with an explicit fairness objective.
- Drag-and-drop admin board that writes constraints, not assignments.
- Plan snapshots, publication, and change emails on re-publication.
- Custom, human-readable matching constraints that admins can add and clear.
- Per-person food preferences and allergy notes, as configured by the first
  deployed event profile.
- Family-contributed materials and workshop-linked supplies, as configured by
  the first deployed event profile.

**Explicitly out of scope**

- Payments, invoicing, deposits.
- Food-service execution, menus, and allergy enforcement. The first event
  records per-person dietary preferences and allergy notes; operational meal
  planning remains outside this specification.
- Arrival and departure logistics, transport, parking.
- Runtime multi-event tenancy. One event profile and one database per
  deployment. A second event is a second deployment.
- Real-time collaborative editing. Three admins, optimistic concurrency, 409 on
  conflict. Durable Objects are not needed and would not earn their complexity.
- Mobile-first admin. Attendee pages are responsive; the board is a desktop tool.

## Reading order

| # | Document | What it settles |
|---|---|---|
| 01 | [Architecture](01-architecture.md) | Module composition, request lifecycle, and boundaries |
| 02 | [Data model](02-data-model.md) | Generic identity, labels, relationships, and projections |
| 03 | [Event model](03-events.md) | Generic event envelope, replay, and lifecycle |
| 04 | [Labels and constraints](04-labels-and-constraints.md) | Tag vocabulary, resolver operators, and validation |
| 05 | [Room assignment](05-room-assignment.md) | Generic room modules and deterministic placement |
| 06 | [Workshop assignment](06-workshop-assignment.md) | Generic ranking and workshop modules |
| 07 | [Materials coordination](07-materials.md) | Generic requests, commitments, and fulfillment |
| 08 | [Constraint health](08-constraint-health.md) | Preflight, diagnostics, and regression corpus |
| 09 | [Admin interface](09-admin-interface.md) | Generic admin surfaces and module-provided screens |
| 10 | [Family portal](10-family-portal.md) | Generic family-facing controls and privacy |
| 11 | [Authentication](11-authentication.md) | Magic links, sessions, and threat model |
| 12 | [Frontend](12-frontend.md) | Rendering, enhancement, styling, and board island |
| 13 | [Deployment](13-deployment.md) | One profile per deployment, migrations, secrets, email |
| 14 | [Testing](14-testing.md) | Generic module contracts and event fixtures |
| 15 | [Roadmap](15-roadmap.md) | Delivery milestones and cut lines |
| 16 | [Event profiles](16-event-profiles.md) | Profile contract and configuration rules |
| — | [familienfreizeit-2027](events/familienfreizeit-2027.md) | First deployed event profile |

Start with 01, 02, 04, 05, 06, 07, and 16. Those documents carry the module and
profile design. The remaining documents specify its product and operations.

## Glossary

Used consistently throughout. Where a word here differs from ordinary usage, this
document wins.

**Family** — a typed entity representing the unit of identity and
authentication. Its email, display name, and membership labels are event-backed.

**Person** — a typed entity representing one human. Birthdate, role, bed demand,
and family membership are labels interpreted by event configuration.

**Party** — a set of People who must be placed in the same room. *Derived*, not
stored as ground truth. One Family can yield several Parties; one Party can span
several Families. Party membership is recomputed on every solver run. A
Party's requirements are derived as the union of its member Families' tags,
strictest strength winning.

**Place** — one sleeping position. A single bed is one Place. A double bed is two
Places. This is the atomic unit of capacity. Rooms have Beds; Beds have Places.

**Constraint** — an event-backed, human-readable matching fact such as a person
needing a room capability or two people needing to stay together. Constraints
reference stable entities, never derived Parties.

**Snapshot** — the complete, frozen, sorted input to the solver, built by folding
the event log up to a specific sequence number. A stage inside `derive`, not
something stored.

**Plan** — the solver's output: assignments, unplaced parties, and a full decision
trace. Derived on demand at a horizon, never stored. Identified by that horizon
together with `config_hash` and `solver_version`.

**Horizon** — the position in the log that decides which events count for one
audience. Admins derive at the log head; attendees derive at the latest
publication; the admin doing the work derives past the head, at their own pending
events.

**World** — the complete derived state for one list of events: projections, plan,
diagnostics, and trace. Produced by `derive(events, config)`. Never stored, always
recomputed; the published plan body is the one frozen copy.

**Pending events** — events an admin has created on the board and not yet applied.
Held in their browser, never on the server. The board derives from
`committed ++ pending`.

**Sandbox** — the board with a non-empty pending list. Not a mode: an empty pending
list is the ordinary case and needs no separate code path.

**Trace** — the human-readable record of why the solver did what it did. One line
per decision, including the alternatives it rejected. Not a debug log; a
first-class deliverable that admins read.

**Tag** — a named fact in an event profile's vocabulary, optionally pointing at
another entity and optionally carrying a strength. Stored as a generic label.

**Event profile** — the typed composition of modules and the event-specific
vocabulary, policy, parameters, and copy for one deployment. The first profile
is `events/familienfreizeit-2027.ts`.

**Strength** — `required` (prunes rooms) or `preferred` (scored). An absent tag
assignment means indifferent.

**Preflight** — checks run on the snapshot before party formation, catching
infeasibility and contradictions before any placement runs.

## Decision log

Recorded so that a future reader can tell which choices were considered and
which were merely inherited.

### D1 — Cloudflare Workers + D1

*Chosen.* The whole application is one Worker with one SQLite-backed database.
At 150 attendees the data is perhaps 3,000 rows total. The interesting engineering
is in the solver, not in scale.

*Consequence:* D1 has no interactive transactions. Every mutation must be a
single statement or a `batch()`. This shapes the write path throughout and is one
reason the event log is append-only — appends never need a transaction.

### D2 — CQRS with full projection rebuilds

*Chosen.* An append-only event log is the source of truth. Read models are
derived and disposable.

*Rejected alternative:* direct mutation of state tables. It is simpler on day one
and loses the audit trail, the replayability, and the ability to ask "what did the
plan look like when we emailed everyone on the 14th".

*Why it is cheap here:* the log will hold low thousands of rows. Projections
rebuild from scratch in milliseconds, so none of the hard parts of CQRS —
incremental projections, catch-up subscriptions, eventual consistency — apply.
See [01-architecture](01-architecture.md).

### D3 — The solver is a pure function

*Chosen.* `solve(snapshot, config) → plan`. No I/O, no clock, no randomness.
Identical inputs produce byte-identical output, forever.

*Why:* it makes every other good property possible. Re-runs are stable, so
publishing twice does not shuffle people arbitrarily. Counterfactuals are cheap,
so constraint health can be computed rather than guessed. Regression testing is a
hash comparison. Reproducing a complaint is `solve(snapshot@seq)`.

### D4 — Sorted greedy with bounded repair, not integer programming

*Chosen.* A documented sort order, a scored greedy pass, then capped pairwise
swaps.

*Rejected alternative:* an ILP or CP-SAT solver. It would produce better plans by
a few percent and would be completely unreviewable. An admin cannot look at a
simplex result and say "yes, that is fair". The explicit requirement here is
human reviewability, and that requirement beats optimality at this scale.

### D5 — Party formation is a separate, reviewable phase

*Chosen.* Deciding who sleeps with whom happens before, and separately from,
deciding which room they sleep in.

*Why:* who-with-whom is the judgement call, and it is where admins need to
intervene. Fitting boxes onto shelves is mechanical. Splitting the phases means
admins review a short list of parties with provenance rather than auditing 40
room placements.

### D6 — Admin decisions are constraints, not edits

*Chosen.* Dragging a family on the board emits a matching constraint. The solver
re-runs with that constraint as an ordinary input, so stated preferences and
admin decisions share one path.

*Rejected alternative:* the board writes assignments directly. Then every
re-run either destroys admin work or requires merge logic, and the solver stops
being the single writer of assignments.

### D7 — Constraints carry human-readable explanations

*Chosen.* Admin-created constraints carry a label and explanation. The event
the event log supplies author and timing; a separate pin taxonomy is unnecessary.

*Why:* the value of recording intent is being able to explain and review the
constraint. The resolver reports active, missing, contradictory, and redundant
constraints directly.

Admin judgement is represented directly by custom matching constraints rather
than a separate override mechanism.

### D8 — No React in the initial release

*Chosen.* Server-rendered `hono/jsx`, hand-written elements on a copied
neobrutalism theme, one vanilla island for the board.

*Rejected alternative:* React with Base UI and the neobrutalism registry. Base UI
is React-only, so choosing it re-introduces the entire client runtime for an
admin tool with roughly eight distinct interactive elements.

*Revisit if:* the board's interaction model outgrows ~600 lines of vanilla
TypeScript, or the attendee preference form needs a real combobox. The escape
hatch is mounting React on the board route alone; see
[frontend](12-frontend.md).

### D9 — No Vite

*Chosen.* `wrangler dev` (which bundles TypeScript and JSX via esbuild), the
Tailwind CLI, and one direct `esbuild` invocation for the board island.

*Why:* three watchers and no plugin ecosystem. The Vite plugin exists to solve
problems this project does not have.

### D10 — Hand-rolled magic link, no auth library

*Chosen.* Roughly 120 lines using Web Crypto.

*Rejected alternative:* Better Auth. It is a good library, but this application
has no passwords, no OAuth, no registration, no organisations and no 2FA. What
remains is one flow, fully under our control, and a per-request instantiation
dance on Workers.

*Non-negotiable rules* are in [authentication](11-authentication.md). Follow them exactly or use
the library instead.

### D11 — Built-in rules live in code; custom matching keys live in the event log

*Chosen.* Built-in solver mechanisms require a deploy. Admin-created matching
keys use only the fixed generic resolver and are event-backed, so they need no
dynamic evaluation or code deployment.

### D12 — Weights live in code

*Chosen.* `SolverConfigChanged` is dropped. Tuning happens offline against an
exported event log. Rationale in [event profiles](16-event-profiles.md) §4.

### D13 — Workshop rankings are structured labels

*Chosen.* Structured label values and the `ordered-choice` resolver operator
preserve dense ordered lists without a special property table. Rationale in
[labels and constraints](04-labels-and-constraints.md) §7.

### D14 — `familyFacing` in the event profile drives the family portal

*Chosen.* The preferences page becomes a renderer. Rationale in
[event profiles](16-event-profiles.md) §6.

### D16 — Publication is a horizon, not a stored plan

*Chosen.* `PlanPublished` marks a position in the log. Everything before it is what
attendees are told, so the marker carries a hash of what the admin reviewed and no
plan body. Every audience — the working admin, the other admins, the attendees —
derives from the same list cut at a different point.

*Rejected alternative:* store the full plan body on publication, so a published
result stays readable even after the solver or profile changes.

*Why it loses:* it is a code-versioning problem answered inside the event log.
`solver_version` and git already answer it, and the stored body actively hides the
one thing worth knowing — that deployed code has stopped agreeing with what
attendees were told. Comparing a recorded `output_hash` against a fresh derivation
surfaces that as ordinary staleness; a stored body renders happily and says nothing.
The body is also the only thing large enough to matter in a log the admin board now
downloads whole: a hundred kilobytes with its trace, several times over, against a
decision log measured in hundreds of kilobytes total.

*Consequence:* attendee privacy stops being a rule and becomes a data path. There is
no filter to forget, because an attendee's derivation cannot reach past its horizon.

### D15 — Derivation is a named primitive, and the client may call it

*Chosen.* `derive(events, config) → World` and `diff(World, World)` are the read
side of the application. The board holds a list of pending events and renders
`derive(committed ++ pending)`, deriving locally as the admin works and appending
only when they apply.

*Rejected alternative:* a sandbox mode beside the existing board, where each drag
posts a constraint, the server re-solves, and the board reconciles from the
response. It needs a second derivation path, a client feasibility check that is
allowed to disagree with the real one, and a round trip per experiment.

*Why:* the property was already bought and not spent. D3 makes the solver pure and
dependency-free, so it runs in a browser unchanged; only the fold had to be lifted
out of the database to follow it. Naming the primitive also collapses machinery
that existed because it was missing — staleness, plan diffs, change emails,
constraint redundancy, and the regression corpus are all the same two calls.

*Consequence:* experiments stay out of the log. An admin who tries four
arrangements appends the events for the one they chose, so constraints in the log
are decisions rather than sediment, and [constraint health](08-constraint-health.md)
reasons only about constraints someone meant.

*Cost:* the admin bundle carries the derivation core, and two runtimes execute one
algorithm. The first is dependency-free TypeScript and is budgeted in
[deployment](13-deployment.md); the second is held by a cross-runtime agreement
test in [testing](14-testing.md).
