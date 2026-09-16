# 17 — Decisions

Recorded so that a future reader can tell which choices were considered and
which were merely inherited.

These decisions are binding on every document and on the implementation. A
decision can be revised, but only deliberately: propose the change with the
alternatives and a recommendation, and once it is accepted, update the entry and
every document that depends on it together.

## D1 — Cloudflare Workers + D1

*Chosen.* The whole application is one Worker with one SQLite-backed database.
At 150 attendees the event log is perhaps 3,000 rows. The interesting engineering
is in the solver, not in scale.

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
room placements.

## D6 — Admin decisions are constraints, not edits

*Chosen.* Dragging a family on the board emits a matching constraint. The solver
re-runs with that constraint as an ordinary input, so stated preferences and
admin decisions share one path.

*Rejected alternative:* the board writes assignments directly. Then every
re-run either destroys admin work or requires merge logic, and the solver stops
being the single writer of assignments.

## D7 — Constraints carry human-readable explanations

*Chosen.* Admin-created constraints carry a label and explanation. The event
the event log supplies author and timing; a separate pin taxonomy is unnecessary.

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

*Consequence:* the family portal requires JavaScript. The portal bundle excludes the
admin screens and the solver, and saves on change with ordinary requests. See
[frontend](12-frontend.md).

## D9 — Vite with the Cloudflare plugin

*Chosen.* `vite` runs the Worker in `workerd` and the React application with hot
reload from one dev server; `vite build` produces both. Tailwind runs as a Vite
plugin.

*Why:* one tool runs the Worker, the application, and Tailwind, and it is the build
the React and shadcn toolchains already assume.

## D10 — Hand-rolled magic link, no auth library

*Chosen.* Roughly 120 lines using Web Crypto.

*Rejected alternative:* Better Auth. It is a good library, but this application
has no passwords, no OAuth, no registration, no organisations and no 2FA. What
remains is one flow, fully under our control, and a per-request instantiation
dance on Workers.

*Non-negotiable rules* are in [authentication](11-authentication.md). Follow them exactly or use
the library instead.

## D11 — Built-in rules live in code; custom matching keys live in the event log

*Chosen.* Built-in solver mechanisms require a deploy. Admin-created matching
keys use only the fixed generic resolver and are event-backed, so they need no
dynamic evaluation or code deployment.

## D12 — Weights live in code

*Chosen.* `SolverConfigChanged` is dropped. Tuning happens offline against an
exported event log. Rationale in [event profiles](16-event-profiles.md) §4.

## D13 — Workshop rankings are structured labels

*Chosen.* Structured label values and the `ordered-choice` resolver operator
preserve dense ordered lists without a special property table. Rationale in
[labels and constraints](04-labels-and-constraints.md) §7.

## D14 — `familyFacing` in the event profile drives the family portal

*Chosen.* The preferences page becomes a renderer. Rationale in
[event profiles](16-event-profiles.md) §6.

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

*Consequence:* attendee privacy stops being a rule and becomes a data path. There is
no filter to forget, because an attendee's derivation cannot reach past its input sequence.

## D15 — Derivation is a named primitive, and the client may call it

*Chosen.* `derive(events, config) → World` and `diff(World, World)` are the read
side of the application. The admin application holds a list of pending events and
renders every screen from `derive(committed ++ pending)`, deriving locally as the
admin works and appending only when they apply.

*Rejected alternative:* a sandbox mode beside the existing board, where each drag
posts a constraint, the server re-solves, and the board reconciles from the
response. It needs a second derivation path, a client feasibility check that is
allowed to disagree with the real one, and a round trip per experiment.

*Why:* the property was already bought and not spent. D3 makes the solver pure and
dependency-free, so it runs in a browser unchanged, and the fold is pure for the
same reason. Naming the primitive also collapses machinery
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
