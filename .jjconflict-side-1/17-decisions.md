# 17 — Decisions

Recorded so that a future reader can tell which choices were considered and
which were merely inherited.

These decisions are binding on every document and on the implementation. A
decision can be revised, but only deliberately: propose the change with the
alternatives and a recommendation, and once it is accepted, update the entry and
every document that depends on it together.

## D1 — Cloudflare Workers Paid + D1

*Chosen.* The whole application is one Worker with one SQLite-backed database, on
the Workers Paid plan. At 55 families the event log is perhaps 3,000 rows. The
interesting engineering is in the solver, not in scale.

*Why Paid:* every request that shows domain state derives it (D2), and the family
view and the organiser dashboard run the solver to do so. The free tier allows 10 ms
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
communicating twice does not shuffle people arbitrarily. Counterfactuals are cheap,
so a plan diff can attribute every move to its cause. Regression testing is a
hash comparison. Reproducing a complaint is `solve(solverInputAt(input_seq))`.

## D4 — Stable sorted greedy with bounded repair, not integer programming

*Chosen.* A documented sort order, preservation of valid assignments from the
previous derived plan, a scored greedy pass for unresolved claims, then capped
pairwise swaps. The previous plan is transient comparison input, derived from
the event-log prefix; it is not persisted domain state.

The allocation priority is:

1. satisfy hard constraints;
2. maximise the number of assigned people;
3. preserve as many valid previous assignments as possible;
4. apply balanced opportunity priority to unresolved contests;
5. prefer higher-ranked choices;
6. terminate every tie with stable entity ids.

Every displacement identifies the constraint, coverage need, or bounded repair
that required it. If the previous assignment remains feasible and no coverage
improvement is needed, it remains unchanged.

*Rejected alternative:* an ILP or CP-SAT solver. It would produce better plans by
a few percent and would be completely unreviewable. An organiser cannot look at a
simplex result and say "yes, that is fair". The explicit requirement here is
human reviewability, and that requirement beats optimality at this scale.

## D5 — Sleeping parties and child rooms are outside the active placement model

*Chosen.* The active room-assignment scope places each family as one indivisible
unit. Sleeping-party formation, cross-family co-rooming, and child-room placement
belong together behind a separate module boundary.

*Why:* implementing only one of these mechanisms would make the placement unit
ambiguous. A child-room placement can split a family, while a required co-room
relation can merge families; both require the derived sleeping-party model. The
the active scope stays reviewable by keeping one family as one placement unit and
retains only constraints that do not change that unit, such as keep-apart.

## D6 — Organiser decisions guide the derived assignment

*Chosen.* Organiser decisions are event-backed inputs to the derived assignment.
Choosing a room or making another planning decision adds one or more labels to the
organiser's pending events. Every screen re-derives with those labels as ordinary
inputs, and applying appends them to the log, so stated preferences and organiser
decisions share one path.

The solver remains the only producer of assignments. Organisers do not write an
assignment directly; they add facts that guide the next derivation. The supported
resolver mechanisms include `needs`, `provides`, `excludes`, separation, workshop
eligibility, and workshop co-assignment. Grouping for sleeping placement belongs to
the separate sleeping-parties module.

*Rejected alternative:* the board writes assignments directly. Then every re-run
either destroys organiser work or requires merge logic, and the solver stops being
the single writer of assignments.

## D7 — Organiser decisions carry optional notes

*Chosen.* An organiser decision may carry one free-text note. The event log supplies
author and timing. Applied decisions are visible to every organiser through the
existing event history and derived organiser views.

*Why:* the value of recording intent is being able to explain and review a human
decision. The resolver reports active constraints, missing providers, and
contradictions directly; no additional decision metadata or report is needed.

Organiser judgement is represented directly by the existing resolver labels rather
than a separate decision mechanism.

## D8 — React for every screen

*Chosen.* One React application for the organiser tool and the family view, built
from neobrutalism.dev components copied in through the shadcn CLI, over a small
JSON API on the Worker.

*Rejected alternative:* server-rendered `hono/jsx` pages with htmx for partial
updates and a vanilla TypeScript island for the board. It looks smaller on a
dependency list and is larger in code: the pending list is needed on the board,
which has to re-render a derived world without losing
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

*Consequence:* the family view requires JavaScript. The family view bundle excludes the
organiser screens and the solver, and saves on change with ordinary requests. See
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
`@cloudflare/vitest-pool-workers` must be on compatible versions; the repository
must verify that pairing.

## D10 — Hand-rolled magic link, no auth library

*Chosen.* Roughly 120 lines using Web Crypto. Sessions and magic links store the
verified email address, and every request resolves it — against the organiser
allowlist, or to a family in the derived world — so there is no user table beside
the event log (D2).

*Rejected alternative:* Better Auth. It is a good library, but this application
has no passwords, no OAuth, no registration, no organisations and no 2FA. What
remains is one flow, fully under our control. The library would also bring its own
user, account, and session tables — a second, stored record of who the families are
— and a per-request instantiation dance on Workers.

*Non-negotiable rules* are in [authentication](11-authentication.md). Follow them
exactly.

## D11 — Resolver mechanisms live in code; organiser values live in the event log

*Chosen.* Resolver mechanisms require a deploy. Organiser decisions may supply
free-form values to the fixed generic resolver mechanisms, so a new practical fact
such as `needs=naehe_zum_eingang` and `provides=naehe_zum_eingang` needs no code
deployment. Organisers cannot add executable operators or solver rules.

## D12 — Weights live in code

*Chosen.* Scoring weights and module parameters are occasion-profile code, and changing
them is a deployment, not an event. Tuning happens offline: export the log, run
`npm run tune`, and deploy the weights chosen ([deployment](13-deployment.md),
weight tuning). `config_hash` makes every change visible in plan metadata
([occasion profiles](16-occasion-profiles.md) §4–5).

## D13 — Workshop rankings are structured labels

*Chosen.* A person's ranking for a slot is a set of `prefers-workshop` labels whose
structured values carry the slot, the workshop, and the rank, validated by the
`ordered-choice` resolver operator. There is no dedicated ranking event and no
property table. Rationale in [workshop rankings](20.5-workshop-rankings.md).

## D14 — `family_facing` in the occasion profile drives the family view

*Chosen.* The preferences page is a renderer: every tag that declares
`family_facing` in the active profile produces a control, in profile order. Adding a
tag that reuses an existing control needs no family view code. See
[family view](10-family-view.md) §1.

## D15 — Derivation is a named primitive, and the client may call it

*Chosen.* `derive(events, config) → World` and `diff(World, World)` are the read
side of the application. The organiser application holds a list of pending events and
renders every screen from `derive(committed ++ pending)`, deriving locally as the
organiser works and appending only when they apply.

*Rejected alternative:* a sandbox mode on the board, where each drag
posts a constraint, the server re-solves, and the board reconciles from the
response. It needs a second derivation path, a client feasibility check that is
allowed to disagree with the real one, and a round trip per experiment.

*Why:* D3 makes the solver pure and dependency-free, and the fold is pure for the
same reason, so both run in a browser unchanged. Naming the primitive also means
staleness, plan diffs, and change emails need no machinery of their own — they are all the same two calls.

*Consequence:* experiments stay out of the log. An organiser who tries four
arrangements appends the events for the one they chose, so constraints in the log
are decisions rather than sediment.

*Cost:* the organiser chunk carries the derivation core, and two runtimes execute one
algorithm. The first is dependency-free TypeScript and is budgeted in
[deployment](13-deployment.md) §1; the second is held by the cross-runtime agreement
test in [testing](14-testing.md) §1.

## D16 — Release control determines which arrangements families see

*Chosen.* Release control holds back accommodation allocations as a whole, workshop
programme details per workshop, and solver workshop allocations per slot. Organisers
review an exact diff and choose **An Familien kommunizieren**. A `Communicated`
event identifies the reviewed log prefix and selected scopes; each scope retains
its last communicated content while organisers prepare changes. Own information,
materials and permitted live participation remain current. Privacy is independent.
Email notification is optional and does not determine visibility.

The authoritative mechanism, event contract, dependencies, reports and acceptance
scenarios are in [release control](06-release-control.md). All content is derived
from the event log; the family response composes ordinary worlds without creating
another Plan type or storing a snapshot.

*Rejected alternatives:* freezing the whole family world hides successfully saved
answers; exposing the entire current world reveals unfinished arrangements; a single
global boundary prevents communicating individual workshops. Releasing individual
families' beds or individual workshops' solver participants can produce contradictory
allocations, so accommodation and slot allocations are coherent release units.

*Rejected alternative:* persist communicated snapshots or a second plan type.
They create competing domain state and bypass ordinary deterministic derivation.
The reviewed sequence, selected scopes and code/config identities identify the
action. Release control needs no additional content hash; the head guard and
deterministic derivation protect confirmation.

*Consequence:* family reads combine live information with scope-specific historical
content and apply current authorisation/privacy. Organisers need an outstanding-change
report and a detailed confirmation preview, not a whole-log age indicator.

## D17 — KDL is the canonical development and test event-log format

*Chosen.* Development and tests use a shared KDL event-log loader, and may select
`TextFileEventSource` instead of `D1EventSource`. The restricted format has one
top-level node per event, uses the node name as the event type and properties as
payload fields, and preserves file order as event order. The loader applies the
ordinary event schemas and replay invariants before passing `Event[]` to
`derive(events, config)`.

The development application also provides a non-production textarea debug view
over the same parser and source. Editing valid KDL re-derives the ordinary world,
plan, diagnostics, and trace; it does not create a separate sandbox state model.

*Rejected alternative:* maintain hand-authored JSON event fixtures and a custom
line-oriented grammar for the local file source. That duplicates the event input
language and makes fixtures less useful for direct UI experimentation.

*Why:* KDL already provides node names, `key=value` properties, quoting, typed
values, comments, and a parser/stringifier ecosystem. A project-specific profile
can restrict its broader document features without reimplementing lexical parsing.

*Consequence:* KDL is the canonical authored event-log representation across
development, fixtures, and tests. JSON remains valid for API messages, serialized
D1 rows, canonical hashes, and derived output. D1 remains the only production
domain store; filesystem access and the textarea route are rejected from
production builds and configuration.

## D18 — Naming: snake_case data, camelCase code, kebab-case vocabulary

*Chosen.* One naming rule per kind of name, applied across the database, the wire,
TypeScript, KDL, and these documents:

| Kind of name | Case | Examples |
|---|---|---|
| Data fields: SQL columns, event payloads, KDL properties, API JSON, derived shapes (`World`, `Plan`, trace), profile and module configuration objects, fixtures | `snake_case` | `family_id`, `input_seq`, `bed_demand`, `family_facing`, `max_repair_passes` |
| Code identifiers: variables, parameters, functions, methods, module factories | `camelCase` | `ageAt`, `buildSolverInput`, `roomInventory()` |
| Types, interfaces, classes, React components | `PascalCase` | `SolverInput`, `RoomInventoryParams`, `FamilyView` |
| Event types | `PascalCase` | `PersonAdded`, `LabelSet` |
| Vocabulary identifiers: label and tag keys, enum and tag values, module ids, entity kinds, resolver operators, controls, rule ids | `kebab-case` | `apart-from`, `needs-private-sanitary`, `shared-floor`, `room-inventory`, `material-request`, `needs-provides`, `tri-state`, `hard.tag-requirements` |
| Entity ids | kind prefix, `_`, then a free suffix | `fam_27`, `per_peter`, `slot_sat-morning` |
| Environment variables and bindings | `SCREAMING_SNAKE_CASE` | `PUBLIC_URL`, `DB` |
| Files and directories | `kebab-case` | `solver-input.ts`, `src/modules/room-inventory/`, `tag-requirements.ts` |
| Human-readable copy | free text from the profile | `Eigenes Bad` |

Organiser-supplied free-form matching tokens are data values, not declared
vocabulary identifiers. They retain their entered spelling, such as
`naehe_zum_eingang` in D11. The kebab-case rule does not reject or rename them;
the fixed resolver validates their shape and matches their value exactly.

The data rule is a boundary rule: a value keeps one spelling from the D1 row through
`derive` to the browser, so hashes, fixtures, API responses, and the documents all
read the same. Code identifiers follow the TypeScript ecosystem so that our names do
not clash with React, Hono, zod, and the DOM, which are all camelCase.

Vocabulary identifiers are values, not fields. They appear inside data
(`LabelSet key=apart-from`) and name things a person refers to in review, the trace,
and the constraint screen. Setup-event payload fields that the fold turns into labels
change only their separator: the payload field `does_not_need_a_bed` becomes the
label key `does-not-need-a-bed`.

In KDL a kebab-case identifier is a valid bare value, so vocabulary needs no quoting
in event logs:

```kdl
LabelSet entity_id=fam_mueller key=needs-private-sanitary value=private-sanitary strength=preferred
```

In TypeScript a kebab-case key is quoted where it is an object key
(`'apart-from': relation({ … })`), and a profile's tag type is derived from those
keys, so a misspelt tag is still a compile error.

*Rejected alternative:* snake_case for every identifier, Python-style. Every file
would mix our names with library camelCase, and React hooks and component props
cannot follow the rule at all.

*Rejected alternative:* camelCase for every TypeScript field, with snake_case only
in SQL and KDL. Every boundary would need a renaming step, and a field would have
two spellings depending on which document or layer is being read.

*Rejected alternative:* snake_case vocabulary identifiers. They read as field names
and blur the line between a field and the value it holds; kebab-case keeps
vocabulary visibly distinct.

*Consequence:* `typescript-eslint`'s `naming-convention` rule enforces the code and
data rules ([testing](14-testing.md) §5); the profile builder rejects vocabulary
identifiers that are not kebab-case.

## D19 — One monolith in one repository, deployed as a whole

*Chosen.* The application is a single monolith in a single monorepo: the kernel,
every module, every occasion profile, the Worker, and the browser application. One
build from one revision produces everything a deployment runs, and a deployment
ships all of it together. The occasion profile selects which modules are active
(D12, [modules](20-modules.md)); selection happens inside that one build, not by
combining separately built parts.

*Rejected alternative:* modules as separately built or distributed packages with
their own release cycles. It buys independent releases that nobody here needs and
costs compatibility ranges, a matrix of module combinations to test, and a
dependency resolver deciding what actually runs.

*Rejected alternative:* separately deployed services per module. Derivation is one
pure function over one event list (D2, D15); splitting it across deployments would
turn a function call into a distributed consistency problem.

*Consequence:* modules depend on each other by id only, never on a compatible
range. A change that spans the kernel and several modules is one change, reviewed
and deployed together. The Worker and the browser bundle always come from the same
revision, and the organiser application refuses to derive when they do not
([deployment](13-deployment.md) §1).

## D20 — Code is identified by its revision, not by a version number

*Chosen.* Nothing in this project carries a semantic or any other multi-part version
number: not the application, the kernel, a module, a rule, or a profile. Deployed code
is identified by `code_revision`, the commit id of the monorepo revision the
deployment was built from, injected at build time. Configuration is identified by
`config_hash` (D12). A plan is identified by `input_seq`, `config_hash`, and
`code_revision`.

*Rejected alternative:* semver for the application or per module. Version numbers
communicate compatibility to independent consumers; a monolith deployed as a whole
(D19) has none. Numbers would be bumped by hand, drift from what actually changed,
and still not name the exact code that produced a plan.

*Why:* a commit id names the exact code that ran, costs nothing to maintain, and is
what someone needs to reproduce a plan: check out that revision and derive at
`input_seq`.

*Consequence:* third-party dependency versions are unaffected; they are pinned by
the lockfile. Change within the code is tracked by version control, and rule
identity by rule id: a rule is never edited to mean something different; a new rule
id replaces it ([solver contract](05-solver-contract.md) §4).

## D21 — Print through the browser: no export, no print button, perfect print stylesheets

*Chosen.* The application offers no PDF export, no download, no file attachment, and
no print button. People print with the browser — `Ctrl+P` or the browser menu — and
save a PDF from the browser's print dialog if they want one. In exchange, every
report and every page families are expected to print ships a print stylesheet that
produces a correct paper document, and that stylesheet is a requirement with
acceptance criteria, not a polish item ([reports](19-reports.md) §5–6).

*Rejected alternative:* generated PDF exports. A second rendering path for the same
data, a PDF library in the Worker or the bundle, and files that outlive the
visibility rules and the scope references they were rendered from.

*Rejected alternative:* a print button calling `window.print()`. It adds a control to
every printable page, tempts special cases such as confirmation dialogs or
print-only modes, and does nothing the browser does not already do.

*Consequence:* anything that must happen when a page is printed has to live in the
print stylesheet itself. A confidential report therefore carries its confidentiality
label on screen and on every printed page, rather than asking for confirmation
before printing.
