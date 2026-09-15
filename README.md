# Bettenplan — room and workshop assignment for a family weekend

Working name. Replace freely.

## What this is

A small web application that assigns roughly 150 people — organised as families,
one email address each — to beds in a Jugendherberge over a single weekend, and
assigns the same people to workshops across several timeslots.

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

**In scope for v1**

- Admin-managed inventory: buildings, rooms, beds, room designations.
- Family import from a spreadsheet, invitation by email.
- Family self-service: their people, room preferences, children's-room opt-ins,
  co-rooming requests, workshop rankings.
- Magic-link authentication, one login per family, admin flag on the family record.
- Deterministic room assignment with a full human-readable explanation.
- Deterministic workshop assignment with an explicit fairness objective.
- Drag-and-drop admin board that writes constraints, not assignments.
- Plan snapshots, publication, and change emails on re-publication.
- Pin taxonomy and a retirement loop that retires constraints the solver outgrows.

**Explicitly out of scope**

- Payments, invoicing, deposits.
- Catering, dietary requirements, allergies. (If these arrive, they are a new
  preference type and a new hard rule — the architecture absorbs them, but
  do not build them speculatively.)
- Arrival and departure logistics, transport, parking.
- Multi-event support. One event, one database. A second event is a second
  deployment. Do not build tenancy.
- Real-time collaborative editing. Three admins, optimistic concurrency, 409 on
  conflict. Durable Objects are not needed and would not earn their complexity.
- Mobile-first admin. Attendee pages are responsive; the board is a desktop tool.

## Reading order

| # | Document | What it settles |
|---|---|---|
| 01 | [Architecture](01-architecture.md) | CQRS shape, why full rebuilds, request lifecycle |
| 02 | [Data model](02-data-model.md) | Every table, every index, every constraint, and why |
| 03 | [Event catalogue](03-events.md) | The complete write-side vocabulary |
| 04 | [Room solver](04-solver-rooms.md) | Party formation, placement, scoring, determinism |
| 05 | [Workshop solver](05-solver-workshops.md) | Fairness objective, slot handling, cancellation |
| 06 | [Pins and evolution](06-pins-and-evolution.md) | Reason codes, retirement loop, regression corpus |
| 07 | [Admin UX](07-admin-ux.md) | Every admin screen, the board in detail |
| 08 | [Attendee UX](08-attendee-ux.md) | The family portal, copy, privacy boundaries |
| 09 | [Authentication](09-auth.md) | Magic link implementation, sessions, threat model |
| 10 | [Frontend stack](10-frontend-stack.md) | No-React decision, Hono JSX, theme, board island |
| 11 | [Deployment](11-deployment.md) | Cloudflare config, migrations, secrets, email, CI |
| 12 | [Testing](12-testing.md) | Golden plans, shuffle-invariance, property tests |
| 13 | [Roadmap](13-roadmap.md) | Milestones, what ships when, what can be cut |
| 14 | [Tags](14-tags.md) | The tag model, generic handlers, preflight |
| 15 | [Event configuration](15-event-config.md) | The registry format, phases, weights |

Start with 01, 02, 04, 14 and 15. Those five carry the design. The rest is
consequence.

## Glossary

Used consistently throughout. Where a word here differs from ordinary usage, this
document wins.

**Family** — the unit of identity and authentication. Exactly one email address.
Has a display name and one or more People. May be flagged as admin.

**Person** — one human. Belongs to exactly one Family. Has a birthdate (used to
compute age *at the event date*, never age today) and a flag for whether they
occupy a bed — an infant sharing a parent's bed does not.

**Party** — a set of People who must be placed in the same room. *Derived*, not
stored as ground truth. One Family can yield several Parties; one Party can span
several Families. Party membership is recomputed on every solver run. A
Party's requirements are derived as the union of its member Families' tags,
strictest strength winning.

**Place** — one sleeping position. A single bed is one Place. A double bed is two
Places. This is the atomic unit of capacity. Rooms have Beds; Beds have Places.

**Pin** — an admin decision recorded as a hard constraint on the solver, carrying
a reason code. Pins reference People, never Parties, because Party membership is
derived and unstable.

**Snapshot** — the complete, frozen, sorted input to the solver, built by
replaying the event log up to a specific sequence number.

**Plan** — the solver's output: assignments, unplaced parties, and a full
decision trace. Stored immutably. Either `draft`, `published`, or `superseded`.

**Trace** — the human-readable record of why the solver did what it did. One line
per decision, including the alternatives it rejected. Not a debug log; a
first-class deliverable that admins read.

**Tag** — a named fact about an entity, optionally pointing at another entity,
optionally carrying a strength. Defined in the registry, assigned in the
database.

**Registry** — the set of tags valid for this event, defined in code at
`events/<event>/event.ts`. Not a database table.

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
so pin retirement can be computed rather than guessed. Regression testing is a
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

### D6 — Admin overrides are constraints, not edits

*Chosen.* Dragging a family on the board emits a pin. The solver re-runs with
that pin as a hard constraint.

*Rejected alternative:* the board writes assignments directly. Then every
re-run either destroys admin work or requires merge logic, and the solver stops
being the single writer of assignments.

### D7 — Pins carry a closed-enum reason code

*Chosen.* Six codes, listed in [06-pins-and-evolution](06-pins-and-evolution.md).
Free-text notes sit alongside, never instead.

*Why:* the value of recording reasons is being able to query them. "Show me every
pin that exists because the solver does not understand a rule" is the product
backlog. Free text cannot answer that.

*Amended in rev2:* `MISSING_CONSTRAINT` now usually resolves to a registry
entry rather than a schema migration.

### D8 — No React in v1

*Chosen.* Server-rendered `hono/jsx`, hand-written elements on a copied
neobrutalism theme, one vanilla island for the board.

*Rejected alternative:* React with Base UI and the neobrutalism registry. Base UI
is React-only, so choosing it re-introduces the entire client runtime for an
admin tool with roughly eight distinct interactive elements.

*Revisit if:* the board's interaction model outgrows ~600 lines of vanilla
TypeScript, or the attendee preference form needs a real combobox. The escape
hatch is mounting React on the board route alone; see
[10-frontend-stack](10-frontend-stack.md).

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

*Non-negotiable rules* are in [09-auth](09-auth.md). Follow them exactly or use
the library instead.

### D11 — The tag registry lives in code, not a database table

*Chosen.* Config changes require a deploy; accepted. Rationale in
[15-event-config](15-event-config.md) §1.

### D12 — Weights live in code

*Chosen.* `SolverConfigChanged` is dropped. Tuning happens offline against an
exported event log. Rationale in [15-event-config](15-event-config.md) §4.

### D13 — Workshop rankings stay typed in `workshop_pref`

*Chosen.* Tags do not absorb dense ordered lists. Rationale in
[14-tags](14-tags.md) §7.

### D14 — `familyFacing` in the registry drives the family portal

*Chosen.* The preferences page becomes a renderer. Rationale in
[15-event-config](15-event-config.md) §5.
