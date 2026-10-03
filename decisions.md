# Decisions

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
See [01-architecture](spec/architecture/overview.md).

*Consequence:* the database schema is the event table and the operational tables.
Migrations are hand-written SQL and there is no ORM
([deployment](spec/engineering/deployment.md) §2).

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
organiser's draft events. Every screen re-derives with those labels as ordinary
inputs, and applying appends them to the log, so stated preferences and organiser
decisions share one path.

The solver remains the only producer of assignments. Organisers do not write an
assignment directly; they add facts that guide the next derivation. The supported
resolver mechanisms include `needs`, `provides`, `excludes`, separation, and workshop
eligibility. Grouping for sleeping placement belongs to
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
dependency list and is larger in code: the draft list is needed on the board,
which has to re-render a derived world without losing
selection or drag state, and comboboxes, dialogs, and toasts would all be written
by hand. Every screen would also need its own route, form handlers, and
full-page-or-fragment responses.

*Rejected alternative:* a React meta-framework — Next.js, React Router in framework
mode, or TanStack Start. Their value is server rendering, loaders, and file-based
routing. This application renders nothing on the server and has a dozen client
routes over one derived world.

*Rejected alternative:* React on the board only, with server-rendered pages
elsewhere. It keeps two rendering models and still strands the draft list on one
route.

*Rejected alternative:* Preact. It is smaller, but Base UI and the neobrutalism
components target React, and a compatibility layer is a second thing to debug in
exactly the components chosen so that nobody has to debug them.

*Consequence:* the family view requires JavaScript. The family view bundle excludes the
organiser screens and the solver, and saves on change with ordinary requests. See
[frontend](spec/ui/frontend.md). Implemented frontend lifecycle and navigation
invariants are maintained in [the frontend handbook](docs/ui/frontend.md).

## D9 — Vite with the Cloudflare plugin

*Chosen.* `vite` runs the Worker in `workerd` and the React application with hot
reload from one dev server; `vite build` produces both. React and Tailwind run as
Vite plugins, and Vitest reads the same configuration.

*Rejected alternative:* `wrangler dev` with a custom build hook running esbuild and
the Tailwind CLI. It lists two build packages instead of four, but it does not
remove Vite: Vitest runs on it, so the project would carry two bundlers with two
transform configurations — and the cross-runtime agreement test exists precisely
because transforms can change behaviour. It also loses hot reload, so every edit to
the board discards the draft list during development.

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

*Non-negotiable rules* are in [authentication](spec/application/authentication.md). Follow them
exactly.

## D11 — Resolver mechanisms and vocabulary live in code; organiser values live in the event log

*Chosen.* Resolver mechanisms require a deploy. Organiser decisions may supply
free-form values to the fixed generic resolver mechanisms, so a new practical fact
such as `needs=naehe_zum_eingang` and `provides=naehe_zum_eingang` needs no code
deployment. The resolver's fixed keys, value schemas, scopes, strengths, and UI
metadata belong to the occasion profile and module code. There is no runtime
definition event or derived definition state. Organisers cannot add executable
operators, vocabulary schemas, or solver rules; they add concrete `LabelSet`
events and clear them with `LabelCleared`.

## D12 — Weights live in code

*Chosen.* Scoring weights and module parameters are occasion-profile code, and changing
them is a deployment, not an event. Weight changes are reviewed offline against an
exported event log before deployment ([deployment](spec/engineering/deployment.md),
weight review). The exact build revision identifies the profile and parameters used.

<a id="d13--workshop-rankings-are-structured-labels"></a>
## D13 — Workshop rankings are structured labels for the current choice cycle

*Chosen.* A person's ranking is a set of `prefers-workshop` labels whose
structured values carry the workshop and rank for the one current occasion
choice cycle, validated by the `ordered-choice` resolver operator. There is no
round identity, session identity, dedicated ranking event, or property table.
Late edits remain valid input to a later explicit calculation review. Rationale
in [workshop rankings](spec/modules/workshop-rankings.md).

## D14 — `family_facing` in the occasion profile drives the family view

*Chosen.* The preferences page is a renderer: every trait that declares
`family_facing` in the active profile produces a control, in profile order. Adding a
trait that reuses an existing control needs no family view code. See
[family view](spec/application/family-view.md) §1.

## D15 — Derivation is a named primitive, and the client may call it

*Chosen.* `derive(events, config) → World` and `diff(World, World)` are the read
side of the application. Every organiser action follows one local-first pipeline:
the client creates ordinary event drafts, adds them to its draft buffer, and renders
every screen from `derive(committed ++ drafts)` before any network response. The
draft buffer is then sent through the one ordinary apply command. Immediate mode
invokes that command automatically; drafting mode waits for the organiser to choose
**Entwürfe anwenden**. These are commit-timing policies over the same event path, not separate
event types, read models, APIs, or server-side draft state. This local derivation is an
organiser-only capability: the organiser browser may receive the committed event log,
draft events and the full organiser `World`.

The family browser must never receive the event log, draft events, the full `World`,
solver traces, organiser labels, organiser notes or other organiser-only metadata. The
Worker derives and privacy-projects the family `World` server-side before returning
`GET /api/family/view`. Family diffs, badges, reports and notification previews use
that server-side family projection. They share diff semantics with organiser views,
not the organiser's unfiltered data or execution environment.

*Rejected alternative:* a separate experiment mode on the board, where each drag
posts a constraint, the server re-solves, and the board reconciles from the
response. It needs a second derivation path, a client feasibility check that is
allowed to disagree with the real one, and a round trip per experiment.

*Why:* D3 makes the solver pure and dependency-free, and the fold is pure for the
same reason, so both run in a browser unchanged. Naming the primitive also means
staleness, plan diffs, and change emails need no machinery of their own — they are all the same two calls.

*Consequence:* draft changes stay out of the log while drafting mode is active. An
organiser who tries four arrangements can inspect them locally and append only the
events for the one they chose. In immediate mode, each click still takes the same
local-first path and is automatically submitted as the organiser's decision.

The draft buffer is ordered application state, not domain state. It may be briefly
non-empty during an immediate-mode request. Further clicks append after the submitted
prefix; a response acknowledges only the events in its own request. Successful append,
stale-head recovery, validation failure, undo, discard, and explicit apply therefore
all operate on the same buffer without dropping later local work.

*Cost:* the organiser chunk carries the derivation core, and two runtimes execute one
algorithm. The first is dependency-free TypeScript and is budgeted in
[deployment](spec/engineering/deployment.md) §1; the second is held by the cross-runtime agreement
test in [testing](spec/engineering/testing.md) §1.

## D16 — Release control determines which arrangements families see

*Chosen.* Release control holds back accommodation allocations as a whole, workshop
programme details per workshop, and solver workshop allocations per slot. Organisers
review an exact diff and choose **An Familien kommunizieren**. A `Communicated`
event identifies the reviewed log prefix and selected scopes; each scope retains
its last communicated content while organisers prepare changes. Own information,
materials and permitted live participation remain current. Privacy is independent.
Email notification is optional and does not determine visibility.

The authoritative mechanism, event contract, dependencies, reports and acceptance
scenarios are in [release control](spec/application/release-control.md). All content is derived
from the event log; the family response composes ordinary worlds without creating
another Plan type or storing a snapshot.

*Rejected alternatives:* freezing the whole family world hides successfully saved
answers; exposing the entire current world reveals unfinished arrangements; a single
global boundary prevents communicating individual workshops. Releasing individual
families' beds or individual workshops' solver participants can produce contradictory
allocations, so accommodation and slot allocations are coherent release units.

*Rejected alternative:* persist communicated snapshots or a second plan type.
They create competing domain state and bypass ordinary deterministic derivation.
The reviewed `input_seq`, selected scopes, `build_revision`, and
`compatibility_revision` identify the action. Release control needs no additional
content hash; the reviewed prefix and deterministic derivation protect exact
confirmation content even when the live head advances.

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
D1 rows, canonical regression-test hashes, and derived output. D1 remains the only production
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
| Vocabulary identifiers: label and trait keys, enum and trait values, module ids, entity kinds, resolver operators, controls, rule ids | `kebab-case` | `apart-from`, `needs-private-sanitary`, `shared-floor`, `room-inventory`, `material-request`, `needs-provides`, `tri-state`, `hard.trait-requirements` |
| Entity ids | kind prefix, `_`, then a free suffix | `fam_27`, `per_peter`, `slot_sat-morning` |
| Environment variables and bindings | `SCREAMING_SNAKE_CASE` | `PUBLIC_URL`, `DB` |
| Files and directories | `kebab-case` | `solver-input.ts`, `src/modules/room-inventory/`, `trait-requirements.ts` |
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
and the constraint screen.

In KDL a kebab-case identifier is a valid bare value, so vocabulary needs no quoting
in event logs:

```kdl
LabelSet entity_id=fam_mueller key=needs-private-sanitary value=private-sanitary strength=preferred
```

In TypeScript a kebab-case key is quoted where it is an object key
(`'apart-from': relation({ … })`), and a profile's trait type is derived from those
keys, so a misspelt trait is still a compile error.

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
data rules ([testing](spec/engineering/testing.md) §5); the profile builder rejects vocabulary
identifiers that are not kebab-case.

## D19 — One monolith in one repository, deployed as a whole

*Chosen.* The application is a single monolith in a single monorepo: the kernel,
every module, every occasion profile, the Worker, and the browser application. One
build from one revision produces everything a deployment runs, and a deployment
ships all of it together. The occasion profile selects which modules are active
(D12, [modules](spec/modules/contract.md)); selection happens inside that one build, not by
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
([deployment](spec/engineering/deployment.md) §1).

## D20 — Builds and compatibility have separate identities

*Chosen.* The deployed build is identified by `build_revision`, the exact commit id
of the monorepo revision it was built from, injected at build time. The client and
Worker compare this value to detect stale artifacts. The project also carries a
manually maintained `compatibility_revision`, initially `1`, which increments only
when an incompatible API, event, derived-shape, or cross-runtime contract change is
made. It is not a semantic version and does not identify a build.

Configuration is repository code and is identified by `build_revision`; there is no
separate `config_hash`. A plan is identified by `input_seq`, `build_revision`, and
`compatibility_revision`.

*Rejected alternative:* semver for the application or per module. Version numbers
communicate compatibility to independent consumers; a monolith deployed as a whole
(D19) has no independent module consumers. The compatibility revision is retained
only for the explicit contract boundary; it is separate from the exact build
identity so stale-build detection does not depend on a manual bump.

*Why:* a commit id names the exact code that ran, costs nothing to maintain, and is
what someone needs to reproduce a plan: check out that revision and derive at
`input_seq`.

*Consequence:* third-party dependency versions are unaffected; they are pinned by
the lockfile. Change within the code is tracked by version control, and rule
identity by rule id: a rule is never edited to mean something different; a new rule
id replaces it ([solver contract](spec/architecture/solver-contract.md) §4).

## D21 — Print through the browser: no export, no print button, perfect print stylesheets

*Chosen.* The application offers no PDF export, no download, no file attachment, and
no print button. People print with the browser — `Ctrl+P` or the browser menu — and
save a PDF from the browser's print dialog if they want one. In exchange, every
report and every page families are expected to print ships a print stylesheet that
produces a correct paper document, and that stylesheet is a requirement with
acceptance criteria, not a polish item ([reports](spec/application/reports.md) §5–6).

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

## D22 — Documentation follows implementation status

*Chosen.* `docs/` describes implemented and verified repository behavior;
`spec/` describes outstanding requirements. Implementation is established by
repository code and relevant verification, not deployment. Hosted execution and
production availability are separate claims requiring separate evidence.

Both trees are organized by topic, with matching paths where helpful. Indexes
supply reading order; filenames do not carry ordering numbers. Binding decisions
remain in this document because they govern both current and future work.

Illustrative code with missing dependencies remains explicitly labeled in
`spec/` as `*.example.ts`. Working runtime code belongs in the normal source or
configuration directories. Deferred ideas are not approved scope and require an
explicit user scope decision before promotion; affected decisions retain their
review gate.

*Rejected alternative:* mixing intended and implemented behavior in one numbered
document tree. It makes a design example look like a working feature and makes
current operational instructions difficult to find.

*Rejected alternative:* copying whole specifications into documentation as soon
as any part is implemented. It duplicates authority and implies that unfinished
requirements have been delivered.

*Consequence:* implementation changes update documentation and remove fulfilled
specification sections together. Partial delivery leaves explicit outstanding
requirements linked to the implemented foundation. Reorganization must account
for every affected section and preserve requirements, acceptance criteria and
unresolved findings. Local link and heading checks run in CI; source and review
establish semantic accuracy. The mandatory maintenance rules live in
[AGENTS.md](AGENTS.md#documentation-and-specification), with the practical
[documentation workflow](docs/engineering/documentation.md).

## D23 — Profile vocabulary entries are called traits, not tags

*Chosen.* The profile-vocabulary concept previously called "tag" is renamed
"trait" throughout the specification, code identifiers, and diagnostics
(`type Trait`, `traits: {...}`, `_trait`-suffixed parameters, `trait_roles`,
`kernel.unknown-trait`, `hard.trait-requirements`). The stored-value concept
("label," `LabelSet`/`LabelCleared`) is unchanged.

"Tag" and "label" are close enough in ordinary English that the specification
itself accumulated real drift: the glossary's own "Tag" definition
([architecture/glossary.md](spec/architecture/glossary.md)) was contradicted twice in the same
file, and the identical error was repeated in
[labels-and-constraints.md](spec/architecture/labels-and-constraints.md) — three sentences that
said "tag" while describing the held/stored labels on an entity. Separately,
[profiles/contract.md](spec/profiles/contract.md) named a tag's organiser-facing display-copy
field `label`, directly colliding with the unrelated storage-mechanism
`label`; that field is renamed `title` as part of the same change (D23 covers
only the tag→trait rename; the `label`→`title` field rename is a distinct
fix applied alongside it, tracked in [issue 012](spec/issues/archived/012-tag-vs-label-terminology.md)).

*Rejected alternative:* key/value. `LabelSet` events already have literal
`key` and `value` fields — a label already is a key/value pair on an entity,
so this pairing would create a second, worse collision rather than resolve
the first.

*Rejected alternative:* question/answer. Reads naturally for family
preferences and is lightly echoed by existing informal prose
([application/family-view.md](spec/application/family-view.md)), but overclaims a binding the
system doesn't have: free-form organiser-supplied values are labels with no
corresponding tag/trait at all
([labels-and-constraints.md](spec/architecture/labels-and-constraints.md) §"Free-form matching
values": "No event defines or retires the token"). Calling every label an
"answer" to a trait's "question" would misdescribe that case.

*Consequence:* this was done as a repository-wide mechanical rename rather
than fixed narrowly, because the repository has zero installs and no real
`defineOccasionProfile` implementation yet (only the illustrative
`profiles/familienfreizeit-2027.example.ts`) — the cheapest point at which a
naming change of this size can happen. D14 and D18 (both of which discuss
this vocabulary) are updated in the same change to say "trait."

## D24 — Every family self-service action has an organiser equivalent

*Chosen.* Any event a family may author about its own people or entities must
also be reachable from the organiser UI, entered against the same subject
with the organiser as actor: every `family_facing` trait's control, person
management (add, edit, withdraw), and workshop self-service (sign-up,
interest, ranking) has an organiser-facing entry point, for organisers taking
a request by phone or email. This is not a new authorisation rule — the
existing table in [overview](spec/architecture/overview.md) §"Authorisation
rules" already grants an allowlisted organiser "Everything, through the
organiser UI," and states there is no separate semantic distinction between
an organiser acting for themselves and for another family. `PersonAdded` is
already "Emitted by the family or by an allowlisted organiser"
([events](spec/architecture/events.md) §"Setup and identity"). D24 is a
UI-completeness and design-review obligation: no family-facing trait or
family-authorable event type is spec-complete without a matching
organiser-facing entry point.

*Mechanism.* The organiser family-detail screen renders the same
trait-driven control union as the family view
([family preferences](spec/modules/family-preferences.md) §6), editable,
plus person management and workshop self-service controls, writing the
identical event types (`LabelSet`/`LabelCleared`,
`PersonAdded`/`PersonUpdated`/`PersonWithdrawn`, `signed-up-for`/
`interested-in` labels) with the organiser as actor and the family or person
as subject. One renderer, two authenticated contexts.

*On provenance:* no separate out-of-band marker is added. The event
envelope's `actor` (organiser) versus `subject` (family) already
distinguishes an organiser-entered fact from a family-entered one, and the
organiser's event history already shows actor and timestamp. A parallel note
field would duplicate D7's organiser-decision-note mechanism for a purpose it
does not serve here.

*Rejected alternative:* a bespoke "record phone call" free-text organiser
form that does not emit the real structured event. It produces an untyped
record the solver, reports, and derivation cannot consume, breaking D2 (the
event log is the only domain state) and D3 (the solver takes well-typed
input).

*Rejected alternative:* an impersonation session, where an organiser signs in
as the family. Unneeded complexity — actor/subject separation already
carries the needed semantics, and a session swap would require its own auth
surface for no behavioural gain.

*Consequence:* every future `family_facing` trait or family-authorable event
type is reviewed against this requirement before being considered
spec-complete, mirroring D14's generator-not-form framing for the organiser
surface. [Organiser view](spec/application/organiser-view.md) and
[family preferences](spec/modules/family-preferences.md) are updated to
state the family-detail screen's coverage explicitly.

## D25 — Canonical email identity

*Chosen.* The application canonicalizes every email identity by Unicode NFC
normalization, trimming surrounding whitespace, and locale-independent
lowercasing. It validates syntax after canonicalization and uses that result for
family event payloads, event actors, sessions, magic links, rate limits, email
delivery records, and organiser allowlists.

Provider-specific transformations are not applied: dots, plus-addresses, and
other mailbox-provider conventions remain part of the supplied address. The raw
submitted spelling is not persisted as identity data.

*Why:* family uniqueness, session revocation after an email change, organiser
authorization, and event provenance must compare the same identity value. A
single application rule avoids relying on inconsistent database collations or
provider behavior.

## D26 — Validation boundary and pure domain core

*Chosen.* Boundary validation may use Zod, including event payload schemas and
the compiled profile-validation view consumed by the kernel. The fold, derived
world, resolver, and solver remain dependency-free pure TypeScript. The KDL
parser is confined to the development/test event-source adapter and never enters
the Worker production bundle or pure domain layer.

*Why:* schema validation is a boundary concern and benefits from one explicit,
tested contract. Keeping it outside the fold preserves deterministic browser and
Worker execution without importing I/O, framework, or adapter code into the
domain core.

## D27 — Entities and labels are hard-removed on retirement/clear; history is re-derived, not tombstoned

*Chosen.* `BedRemoved`, `PersonWithdrawn`, `LabelCleared`, and any module fold's
equivalent retirement operation remove their target from the derived world's
live collections (`entities_by_kind`, `families`, `persons`, `labels`, and the
indexes built from them) instead of marking a `retired_seq`/`cleared_seq`
tombstone that every read site must then filter out. Cross-kind id collisions
are prevented structurally instead of by remembering retired ids: every entity
id must start with its kind's declared prefix (kernel-reserved `fam_`/`per_`;
module prefixes are already validated globally unique at profile build), so a
retired id can never be picked up by an unrelated kind. No permanent id ledger
is kept for this.

*Rejected alternative:* soft-delete tombstones (`retired_seq`/`cleared_seq`
fields kept forever on otherwise-removed entities/labels, filtered at every
read site). Easy to reason about locally ("was this ever set") but pushes the
same filter into the resolver, `diff`, and every future module's fold, and
duplicates what re-derivation already gives for free.

*Why:* historical and reviewed views already work by re-deriving `derive()`
over a truncated event slice at a specific `seq`
([release control](spec/application/release-control.md) — confirmation
"submits the reviewed `input_seq`" and later access is "ordinary derivation at
the reviewed `input_seq`, using the same Plan type"). Nothing needs the
*current* world to remember what used to be true; that question is answered by
re-deriving at the seq in question, not by keeping a tombstone around forever.
Removing entries at fold time instead of tombstoning them means the resolver,
`diff`, and every module's fold only ever see what is currently live — no
`retired_seq !== null` / `cleared_seq === null` checks scattered through
read-side code.

*Consequence:* `Entity` drops `retired_seq`; `Label` drops `cleared_seq`;
`World` drops `withdrawn_person_ids` (nothing outside the fold itself
consumed it). `world.entities_by_kind` and `world.labels` only ever contain
what is live at `head_seq`. A module's fold capability gets a `retireEntity`
operation with these same hard-removal semantics, not a soft-retire.

## D28 — Workshops have one direct identity and one placement

*Chosen.* The active product uses one typed `workshop` identity owned by the
official-workshops boundary. A workshop may have one schedule placement made of
one slot and one physical space; there is no separate programme-session or
scheduled-offering identity. Rankings and attendance refer directly to the
workshop.

The workshop lifecycle is represented by independent event-backed facts:
authoring, choice visibility, calculation review, attendance/schedule release,
and cancellation. The organiser UI summarizes those facts as four visible
phases, but the phases do not collapse programme, schedule, attendance, or
communication state into one flag.

Self-organized workshops remain deferred. A future source may contribute the
same direct workshop boundary without introducing a second identity. The
event-log, pure-solver, resolver, privacy, and typed-module boundaries remain
mandatory.

## D29 — Demonstration fixtures avoid historically loaded surnames

*Chosen.* Fixture identities used in Storybook stories, tests, documentation
examples, and deferred UI examples must use neutral example surnames. The
historically loaded surname previously used by the accommodation example is
removed; the shared example uses `Seidel` instead. This rule applies to display
names, person names, fixture identifiers, email addresses, and references that
describe the same example.

*Why:* German-language product examples should avoid surnames with avoidable
historical associations. Fixture data is part of the product's visible language,
so choosing neutral identities prevents an unnecessary distraction from the
behavior being demonstrated.

*Consequence:* Repository-wide fixture and example searches must not reintroduce
the removed surname; new examples follow the same neutral-identity rule.

## D30 — Workshop capacity reduction blocks, never displaces

*Chosen.* Reducing a workshop's capacity below its current attendance (solver
assignments, live sign-ups, or fixed attendance decisions) is rejected outright.
Existing attendance names are preserved unchanged; the workshop simply stays
over its nominal capacity until the organiser either raises capacity back up or
removes attendees through the ordinary attendance/sign-up path. No recomputation,
displacement, or reassignment is triggered by a capacity edit.

*Rejected alternative:* recompute and displace or reassign affected people using
fairness rules. This would silently move people who were never touched by the
capacity edit, and it conflicts with fixed attendance decisions being meant to
take precedence over automatic ones ([D4](#d4--stable-sorted-greedy-with-bounded-repair-not-integer-programming)):
an automatic displacement pass has no principled way to leave fixed decisions
alone while still resolving the overflow.

*Rejected alternative:* select the reduction behavior through occasion-profile
policy. Only one profile is active today, so the flexibility has no consumer,
and branching solver behavior on a profile-selected policy value risks becoming
the kind of runtime-supplied executable rule occasion configuration must not
contain ([modules/contract.md](spec/modules/contract.md) §1 kernel/profile
boundary).

*Consequence:* the capacity editor must surface the over-capacity state clearly
(so organisers can see and resolve it) rather than hiding it behind a silently
correct-looking number. This closes [issue 036](spec/issues/archived/036-workshop-capacity-reduction-policy.md).
