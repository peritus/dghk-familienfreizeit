# Architecture

## The shape in one diagram

```
      committed events                 pending events
      the log, append-only             held by one organiser, not yet applied
              │                                │
              └────────────────┬───────────────┘
                               ▼
        ┌──────────────────────────────────────────────┐
        │            derive(events, config)            │
        │                                              │
        │     fold      events      → projections      │
        │     solver input  projections → frozen, sorted   │
        │     solve     solver input    → plan + trace     │
        │                                              │
        │             pure · deterministic             │
        └──────────────────────┬───────────────────────┘
                               ▼
        ┌──────────────────────────────────────────────┐
        │                    world                     │
        │      projections · plan · diagnostics        │
        └──────────────────────┬───────────────────────┘
                               │
              diff(world, world) → what changed, and why
                               │
          organisers read ─────────┤
          families read ──────┘  (live + communicated scopes)
```

Everything flows in one direction. There is no path by which a family or an
organiser writes an assignment. `derive` is the only producer of assignments, and its
only inputs are a list of events and a config. Organisers can add decisions as
event-backed labels that guide derivation.

## Derivation is the read side

Two pure functions carry the whole read side of the application.

```ts
derive(events: Event[], config: Config): World   // projections, plan, diagnostics
diff(a: World, b: World): Change[]               // what moved, grouped by cause
```

Neither performs I/O, reads a clock, or uses randomness. `derive` is the fold, the
solver input builder, and the solver composed; it inherits the determinism contract in
[solver contract](solver-contract.md) §1 whole, so identical event lists produce
byte-identical worlds on any machine.

`derive` is implemented in milestones. M3 establishes the generic folded and
resolved world plus normalized solver input. M5 composes solver stages and adds
plan output to that world. The M3 world shape is therefore an extensible
foundation, not the final plan shape.

Three consequences are worth stating, because most of this document rests on them.

**Every question about state is a call on `derive`.** Current state is
`derive(committed)`. State as of last Tuesday is `derive(committed up to that seq)`.
What the plan would look like without one constraint is `derive(committed ∖ c)`.
Counterfactual derivation is not a special capability; it is the ordinary use.

**Changes are derived comparisons.** `diff` describes world and plan changes.
Release control projects the scope content relevant to its outstanding-change report
and communication review; ordinary live-world changes are not automatically held work.

**Events need not be committed to be derived from.** `derive` takes a list, and it
does not care where the list came from. That is what makes the next section
possible.

## Pending events

An organiser working in the organiser application holds a list of **pending events**:
ordinary events, in the existing vocabulary, that have not been appended to the
log. Every organiser screen — the board, dashboard, plan diffs —
renders `derive(committed ++ pending)`.

Usually `pending` is empty and every screen shows the same world the server has.
When an organiser drags a family to a room, the action appends decision labels to
`pending` and the application re-derives locally — no request, no approximation, the real solver over the real
constraints. Applying flushes `pending` to the log in one append; discarding drops
it. An empty pending list is not a special case, so there is no second code path
and no mode to be in.

This is the difference between recording a decision and recording the search for
one. An organiser who tries four arrangements before choosing appends the events for
the arrangement they chose, and the log stays a record of judgement rather than of
experiment. Applied organiser decisions, their optional notes, authors, and
timestamps are visible to every organiser through the existing event history.

**The trust boundary does not move.** A client never submits a world. It submits
events, which the server validates, authorises, and appends exactly as it does for
any other command, and then derives for itself. The world the organiser saw locally is
a *prediction*; because `derive` is pure, the prediction is reproducible from the
same event head and configuration. Agreement is what the determinism contract
guarantees; disagreement is a bug to report, and the server's world is authoritative
either way.

Pending events live in the organiser's browser for as long as that tab is open. They are
never stored on the server, never shared between organisers, and never visible to
families.

## Planning and family reads

The working organiser renders `derive(log ++ pending)`; other organisers render
`derive(log)`. The family response combines permitted live information with the
last communicated content of each release scope, under the authoritative
[release-control contract](../application/release-control.md) §1–5. The Worker applies privacy
before responding. Reports use the same audience projection.

`Communicated` records an organiser's reviewed release decision, not a stored plan.
The kernel derives its scope references from events and uses ordinary historical
worlds to reproduce content. There remains one Plan type, identified by `input_seq`,
`build_revision`, and `compatibility_revision`. Release review uses its basis
sequence, scope selection, and these implementation identities; programme details
need not be solver output or acquire another content hash. See [release control](../application/release-control.md)
§3–4 and [deployment](../engineering/deployment.md) §1 for identity, concurrency, and verification.

## Kernel and modules

The application is a fixed kernel plus selectable modules. The kernel — the event
log, labels and the resolver, `derive` and `diff`, the solver pipeline, communication,
authentication, and the application shells — is present in every deployment. Modules
contribute the domain: room inventory, whole-family room and workshop assignment,
food preferences, materials, and the surfaces that go with them. The catalogue and
the module contract are in [modules](../modules/contract.md).

This resembles feature flags at the selection boundary, but module composition is a
build-time property rather than a runtime rollout switch. The occasion profile
selects modules explicitly, and the selection is part of the built profile identified
by `build_revision`. A module
that is not selected contributes no event type, solver stage, trace section, route,
screen, report, or required fixture.

Modules own mechanisms. The profile owns vocabulary and policy: concrete traits and
values, module parameters, pure derivations and checks, scoring weights, and
user-facing copy ([occasion profiles](../profiles/contract.md)). Profile functions
are deterministic evaluators only.

Room and workshop capabilities are independent. A room-only occasion needs no
workshop entities or views; a workshop-only occasion needs no rooms, beds, places,
or sleeping parties. The active profile selects both room inventory and
whole-family room assignment; sleeping parties and child rooms are outside the
active module set.

## Why CQRS is cheap at this size

CQRS and event sourcing usually cost a lot: incremental projections that can
drift, catch-up subscriptions, derived-state caching, eventual consistency in
the UI, and the operational burden of a log you can never fully replay because
it is too big.

None of that applies here. Concretely:

- ~55 families, ~150 people, ~40 rooms, ~160 places, ~24 workshops.
- Every family edits preferences a handful of times. Organisers add a few dozen
  times. Inventory is entered once and corrected occasionally.
- Realistic total: **2,000 to 4,000 events** for the entire life of the occasion.

At that size, `SELECT * FROM event ORDER BY seq` and a fold in memory is a
sub-millisecond operation. So:

**Projections are never stored. They are folded from the log on every read.**

This removes the single largest source of bugs in event-sourced systems. A
projection cannot drift from the log, because there is no stored copy to drift.
There is no rebuild step that can fail after an append, no two rebuilds racing each
other, and no repair procedure, because there is nothing to repair.

**There is no eventual consistency.** A command appends its events and the
response is derived from the log that includes them. The user sees their write
immediately. The asynchrony that usually forces
"your change may take a moment to appear" copy simply does not exist.

The same arithmetic is why the organiser application can derive at all. Two to four
thousand events is a few hundred kilobytes of JSON, well under a hundred compressed,
fetched once when the application loads. An organiser tool on a laptop can hold the entire history of
the event log in memory and fold it on every drag without noticing.

If the event count ever approaches five figures — it will not, but if — the
change is to memoise the fold in the Worker isolate, keyed by `max(seq)`. That is
a ten-line change and still stores nothing. Do not pre-build it.

## Request lifecycle

Every mutating request follows the same five steps. Deviating from this shape is
how the architecture rots.

```
1. AUTHENTICATE   session cookie → verified email → organiser (allowlist) or family (derived), or reject
2. VALIDATE       zod-parse the body, then check invariants against derive(log at head)
3. AUTHORISE      may this principal emit these events about these subjects?
4. APPEND         one batch(), seq = head + 1, head + 2, …
5. RESPOND        derive from the log including the new events; return the result
```

Step 4 is one `batch()` on purpose. D1 has no interactive transactions, but a batch
is atomic, and assigning `seq` from the head step 2 derived turns the primary key
into a compare-and-swap: if the log moved in between, the batch collides and
nothing is written, so the invariants step 2 checked still hold for what lands. A
write path that needs anything beyond appending events is a design smell.

### Authorisation rules

Small enough to state completely:

| Actor | May emit |
|---|---|
| Family | Person events for its own people, and label/constraint events on entities it owns, for family-facing controls; scoped deadlines do not remove this permission |
| Allowlisted organiser | Everything, through the organiser UI |

An allowlisted organiser may enter a constraint for any entity. The actor identifies
the authenticated principal and the subject identifies the affected entity. There
is no separate semantic distinction between an organiser acting for themselves and
for another family.

Deadline notices are workflow guidance, not a sixth request-lifecycle gate. The
server may include the current deadline status in a family response, but it does
not reject a late family event. A later plan or communication is an explicit
organiser decision based on a reviewed event-log prefix.

## Read models

None are stored. `World` is the read model: typed entities, labels, summaries, the
plan, diagnostics and release references, built in memory by `derive`. Resolver
constraints are derived from labels and occasion configuration. Audience responses
select permitted content. Stable URLs, authentication lookup and screens read this
derived model.

The database holds the event log and operational tables
([data model](data-model.md) §6), nothing else. If you find a table holding
families, rooms, or labels, or a query that reads event payloads to answer a domain
question, it is a bug.

Plans are derived rather than maintained as authoritative state. Planning screens
read the ordinary plan; family screens use the release-control projection. `derive`
validates assignment uniqueness before returning a world. There is no assignment
or plan table.

## Event sources

The derivation boundary consumes `Event[]`, independent of where the events came
from. Production uses a D1-backed event source. Development and tests may use a
text-file event source, selected explicitly by development configuration:

```ts
interface EventSource {
  load(): Promise<Event[]>
  append(events: Event[]): Promise<void>
  export(): Promise<string>
}
```

`TextFileEventSource` is a development and test adapter. Its filesystem access
belongs to the Vite development host, not to the Worker runtime. The Worker,
browser application, fold, resolver, and solver exchange only validated
`Event[]`; none may import filesystem APIs or know which source was selected.

The text source uses KDL (the KDL Document Language) as its authored format. A
restricted project profile uses one top-level KDL node per event, with the node
name as the event type and KDL properties as payload fields. File order is the
event order. The source supplies deterministic envelope metadata when the file
omits it and validates the resulting events with the same schemas used for D1
replay.

This source exists to make local experimentation, fixture authoring, and UI
development quick. It is not an alternative production persistence mechanism,
does not bypass authentication or authorization, and must be rejected by
production configuration. The D1 event table remains the production domain
store and the only persisted domain state.

## Release control and notifications

The dashboard reads the outstanding-change report defined in
[release control](../application/release-control.md) §6. Its detailed review (§7) determines
exactly what selected scopes will make visible. Apply saves domain edits;
**An Familien kommunizieren** releases reviewed arrangements. Live inputs do not
wait for that action.

Release control owns semantic scope comparison, history verification and recipient
selection (§8). Change-notification construction and delivery remain deferred;
authentication invitations and reminders are operational kernel email. The request still
uses the ordinary authenticate/validate/authorise/append/respond lifecycle.

## Source layout

The [implemented layout](../../docs/architecture/overview.md) contains the Worker,
application shell, components, scripts, and tests. Extend it with:

```text
src/
  worker/
    routes/               auth, family and organiser commands/queries
    append.ts             the only place that INSERTs into event
    db/events.ts          log reads and sequence-guarded batch insert
    db/operational.ts     sessions, magic links, rate limits, email log
    email.ts
  app/
    family-view/          implemented placeholders gain real controls/views
    organiser/            log loading, pending reducer and domain screens
  events/types.ts         discriminated union and zod schemas, shared by both runtimes
  derive/                 pure index.ts composition, fold.ts and diff.ts; no I/O
  modules/<module-id>/    pure stages/rules, separate app/worker contributions
  config/                 define.ts: defineOccasionProfile, defineModule and trait builders
                          index.ts: re-export the active profile
  solver/                 solver-input.ts, preflight.ts, pipeline.ts, trace.ts,
                          canonical.ts (canonical JSON + SHA-256), index.ts
                          rng.ts: seeded xorshift32, unused by default
  lib/dates.ts            pure ageAt() over ISO strings
profiles/                 working occasion configuration when implemented
scripts/tune.ts           offline weight sweep, Node not Worker
```

Worker routing must gain magic-link redemption and cron; the app must gain the
session probe. The browser and Worker use the same event schemas and pure domain
implementation. Keep the canonical API and factory contracts defined throughout
this specification when adding these files.

Four boundaries are load-bearing and should be enforced in review:

- **`src/solver/**` and the pure parts of `src/modules/**` import nothing from
  `src/worker`, `src/app`, or any module's `app/` and `worker/`.** They are pure
  TypeScript over plain data. They may import module contracts and the active
  profile, which are also pure data and pure functions with no I/O. The ESLint
  determinism rules extend to profile code.
- **`src/derive/**` is pure and holds the same restrictions.** It is imported by
  the Worker and by the organiser application, so a stray import of `src/worker/db`
  there would take the database with it into the client.
- **`src/app/**` and `src/worker/**` never import each other**, nor do a module's
  `app/` and `worker/`. They share only event schemas, derivation, the solver, the
  profile, and module contracts.
- **Only `src/worker/append.ts` writes to `event`.**

An ESLint `no-restricted-imports` rule covers the first three. The fourth is a
code review habit, and a grep in CI if you want the belt as well as the braces.
