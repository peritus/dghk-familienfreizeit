# 17 — Decisions

Recorded so that a future reader can tell which choices were considered and
which were merely inherited.

These decisions are binding on every document and on the implementation. A
decision can be revised, but only deliberately: propose the change with the
alternatives and a recommendation, and once it is accepted, update the entry and
every document that depends on it together.

## D1 — Cloudflare Workers Paid + D1

*Chosen.* The whole application is one Worker with one SQLite-backed database, on
the Workers Paid plan. At 150 attendees the event log is perhaps 3,000 rows. The
interesting engineering is in the solver, not in scale.

*Why Paid:* every request that shows domain state derives it (D2), and the family
portal and the admin dashboard run the solver to do so. The free tier allows 10 ms
of CPU per request, which a fold, a solve, and a trace will not reliably fit. The
Paid plan's per-request allowance removes the question for about five dollars a
month.

*Rejected alternative:* the free tier, with the fold memoised in the isolate by head
`seq`. A cold isolate still solves from scratch against the limit, and the cache is
code whose only purpose is to fit a billing tier.

*Consequence:* D1 has no interactive transactions. Every mutation must be a
single statement or a `batch()`. This shapes the write path throughout and is one
reason the event log is append-only: a batch whose `seq` values follow the head it
derived from is its own compare-and-swap.

## D2 — Event log with in-memory read models

*Chosen.* An append-only event log is the only stored domain state. Read models
are folded in memory for every read and never persisted.

*Rejected alternative:* direct mutation of state tables. It is simpler on day one
and loses the audit trail, the replayability, and the ability to ask "what did the
plan look like when we emailed everyone on the 14th".

*Rejected alternative:* persisted projection tables rebuilt after each append. The
rebuild is a second write that can fail after the append or race another request's
rebuild, leaving tables that disagree with the log until someone notices. Derivation
never reads them, so they would exist only for lookups the world already answers.

*Why it is cheap here:* the log will hold low thousands of rows. Folding it from
scratch takes milliseconds, so none of the hard parts of CQRS — incremental
projections, catch-up subscriptions, eventual consistency, cache invalidation —
apply.
See [01-architecture](01-architecture.md).

*Consequence:* the database schema is the event table and the operational tables.
Migrations are hand-written SQL and there is no ORM
([deployment](13-deployment.md) §2).

## D3 — The solver is a pure function

*Chosen.* `solve(solverInput, config) → plan`. No I/O, no clock, no randomness.
Identical inputs produce byte-identical output, forever.

*Why:* it makes every other good property possible. Re-runs are stable, so
publishing twice does not shuffle people arbitrarily. Counterfactuals are cheap,
so constraint health can be computed rather than guessed. Regression testing is a
hash comparison. Reproducing a complaint is `solve(solverInputAt(input_seq))`.

## D4 — Sorted greedy with bounded repair, not integer programming

*Chosen.* A documented sort order, a scored greedy pass, then capped pairwise
swaps.

*Rejected alternative:* an ILP or CP-SAT solver. It would produce better plans by
a few percent and would be completely unreviewable. An admin cannot look at a
simplex result and say "yes, that is fair". The explicit requirement here is
human reviewability, and that requirement beats optimality at this scale.

## D5 — Party formation is a separate, reviewable phase

*Chosen.* Deciding who sleeps with whom happens before, and separately from,
deciding which room they sleep in.

*Why:* who-with-whom is the judgement call, and it is where admins need to
intervene. Fitting boxes onto shelves is mechanical. Splitting the phases means
admins review a short list of parties with provenance rather than auditing 40
room placements. Merge and split add constraints to the pending list (D15), so a
party arrangement can be tried and discarded like a board move.

## D6 — Admin decisions are constraints, not edits

*Chosen.* Dragging a party on the board adds a matching constraint to the admin's
pending events. Every screen re-derives with that constraint as an ordinary input,
and applying appends it to the log, so stated preferences and admin decisions share
one path.

*Rejected alternative:* the board writes assignments directly. Then every
re-run either destroys admin work or requires merge logic, and the solver stops
being the single writer of assignments.

## D7 — Constraints carry human-readable explanations

*Chosen.* Admin-created constraints carry a label and explanation. The event log
supplies author and timing, so no separate taxonomy of admin pins is needed.

*Why:* the value of recording intent is being able to explain and review the
constraint. The resolver reports active, missing, contradictory, and redundant
constraints directly.

Admin judgement is represented directly by custom matching constraints rather
than a separate override mechanism.

## D8 — React for every screen

*Chosen.* One React application for the admin tool and the family portal, built
from neobrutalism.dev components copied in through the shadcn CLI, over a small
JSON API on the Worker.

*Rejected alternative:* server-rendered `hono/jsx` pages with htmx for partial
updates and a vanilla TypeScript island for the board. It looks smaller on a
dependency list and is larger in code: the pending list is needed on party review
as well as the board, the board has to re-render a derived world without losing
selection or drag state, and comboboxes, dialogs, and toasts would all be written
by hand. Every screen would also need its own route, form handlers, and
full-page-or-fragment responses.

*Rejected alternative:* a React meta-framework — Next.js, React Router in framework
mode, or TanStack Start. Their value is server rendering, loaders, and file-based
routing. This application renders nothing on the server and has a dozen client
routes over one derived world.

*Rejected alternative:* React on the board only, with server-rendered pages
elsewhere. It keeps two rendering models and still strands the pending list on one
route.

*Rejected alternative:* Preact. It is smaller, but Base UI and the neobrutalism
components target React, and a compatibility layer is a second thing to debug in
exactly the components chosen so that nobody has to debug them.

*Consequence:* the family portal requires JavaScript. The portal bundle excludes the
admin screens and the solver, and saves on change with ordinary requests. See
[frontend](12-frontend.md).

## D9 — Vite with the Cloudflare plugin

*Chosen.* `vite` runs the Worker in `workerd` and the React application with hot
reload from one dev server; `vite build` produces both. React and Tailwind run as
Vite plugins, and Vitest reads the same configuration.

*Rejected alternative:* `wrangler dev` with a custom build hook running esbuild and
the Tailwind CLI. It lists two build packages instead of four, but it does not
remove Vite: Vitest runs on it, so the project would carry two bundlers with two
transform configurations — and the cross-runtime agreement test exists precisely
because transforms can change behaviour. It also loses hot reload, so every edit to
the board discards the pending list during development.

*Rejected alternative:* a meta-framework's build (see D8). It brings server
rendering and routing conventions this application does not use.

*Cost:* the plugin writes the deployable Worker configuration into the build output,
which is one more place to look when deployment misbehaves, and the plugin and
`@cloudflare/vitest-pool-workers` must be on compatible versions. M0 proves that
pairing before anything else is built on it ([roadmap](15-roadmap.md)).

## D10 — Hand-rolled magic link, no auth library

*Chosen.* Roughly 120 lines using Web Crypto. Sessions and magic links store the
verified email address, and every request resolves it — against the admin
allowlist, or to a family in the derived world — so there is no user table beside
the event log (D2).

*Rejected alternative:* Better Auth. It is a good library, but this application
has no passwords, no OAuth, no registration, no organisations and no 2FA. What
remains is one flow, fully under our control. The library would also bring its own
user, account, and session tables — a second, stored record of who the families are
— and a per-request instantiation dance on Workers.

*Non-negotiable rules* are in [authentication](11-authentication.md). Follow them
exactly.

## D11 — Built-in rules live in code; custom matching keys live in the event log

*Chosen.* Built-in solver mechanisms require a deploy. Admin-created matching
keys use only the fixed generic resolver and are event-backed, so they need no
dynamic evaluation or code deployment.

## D12 — Weights live in code

*Chosen.* Scoring weights and module parameters are event-profile code, and changing
them is a deployment, not an event. Tuning happens offline: export the log, run
`npm run tune`, and deploy the weights chosen ([deployment](13-deployment.md),
weight tuning). `config_hash` makes every change visible in plan metadata
([event profiles](16-event-profiles.md) §4–5).

## D13 — Workshop rankings are structured labels

*Chosen.* A person's ranking for a slot is a set of `prefers-workshop` labels whose
structured values carry the slot, the workshop, and the rank, validated by the
`ordered-choice` resolver operator. There is no dedicated ranking event and no
property table. Rationale in [labels and constraints](04-labels-and-constraints.md) §7.

## D14 — `familyFacing` in the event profile drives the family portal

*Chosen.* The preferences page is a renderer: every tag that declares
`familyFacing` in the active profile produces a control, in profile order. Adding a
tag that reuses an existing control needs no portal code. See
[family portal](10-family-portal.md) §1.

## D15 — Derivation is a named primitive, and the client may call it

*Chosen.* `derive(events, config) → World` and `diff(World, World)` are the read
side of the application. The admin application holds a list of pending events and
renders every screen from `derive(committed ++ pending)`, deriving locally as the
admin works and appending only when they apply.

*Rejected alternative:* a sandbox mode on the board, where each drag
posts a constraint, the server re-solves, and the board reconciles from the
response. It needs a second derivation path, a client feasibility check that is
allowed to disagree with the real one, and a round trip per experiment.

*Why:* D3 makes the solver pure and dependency-free, and the fold is pure for the
same reason, so both run in a browser unchanged. Naming the primitive also means
staleness, plan diffs, change emails, constraint redundancy, and the regression
corpus need no machinery of their own — they are all the same two calls.

*Consequence:* experiments stay out of the log. An admin who tries four
arrangements appends the events for the one they chose, so constraints in the log
are decisions rather than sediment, and [constraint health](08-constraint-health.md)
reasons only about constraints someone meant.

*Cost:* the admin chunk carries the derivation core, and two runtimes execute one
algorithm. The first is dependency-free TypeScript and is budgeted in
[deployment](13-deployment.md) §1; the second is held by the cross-runtime agreement
test in [testing](14-testing.md) §1.

## D16 — Publication identifies a plan; it does not create another plan

*Chosen.* `PlanPublished` identifies the plan derived from the events before the
publication event. It carries the hash of what the admin reviewed. Every audience
derives the same kind of plan from the events visible to that audience: the working
admin may include pending events, other admins use the log head, and attendees use
the events before the latest publication.

*Rejected alternative:* store a second published-plan type alongside the ordinary
plan, so publication would have a separate result shape.

*Why it loses:* publication is a state of a plan, not a second domain object.
`solver_version`, `config_hash`, and `output_hash` identify and verify the plan
without introducing another vocabulary layer.

*Consequence:* keeping unpublished work from attendees is a data path, not a rule.
There is no filter to forget, because the Worker derives an attendee's view from the
events before the latest publication and cannot reach past them. What a family may
see of *other* families within that plan is a filter, applied by the Worker before
the view leaves it ([family portal](10-family-portal.md) §2).
