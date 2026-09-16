# 01 — Architecture

## The shape in one diagram

```
      committed events                 pending events
      the log, append-only             held by one admin, not yet applied
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
          admins read ─────────┤
          attendees read ──────┘  (published only)
```

Everything flows in one direction. There is no path by which an attendee or an
admin writes an assignment. `derive` is the only producer of assignments, and its
only inputs are a list of events and a config.

## Derivation is the read side

Two pure functions carry the whole read side of the application.

```ts
derive(events: Event[], config: Config): World   // projections, plan, diagnostics
diff(a: World, b: World): Change[]               // what moved, grouped by cause
```

Neither performs I/O, reads a clock, or uses randomness. `derive` is the fold, the
solver input builder, and the solver composed; it inherits the determinism contract in
[room assignment](05-room-assignment.md) §1 whole, so identical event lists produce
byte-identical worlds on any machine.

Three consequences are worth stating, because most of this document rests on them.

**Every question about state is a call on `derive`.** Current state is
`derive(committed)`. State as of last Tuesday is `derive(committed up to that seq)`.
What the plan would look like without one constraint is `derive(committed ∖ c)`.
Counterfactual derivation is not a special capability; it is the ordinary use.

**Every question about change is a call on `diff`.** Staleness, the plan diff
between two publications, the change emails, and whether a constraint is still
doing any work are one function over two worlds.

**Events need not be committed to be derived from.** `derive` takes a list, and it
does not care where the list came from. That is what makes the next section
possible.

## Pending events

An admin working on the board holds a list of **pending events**: ordinary events,
in the existing vocabulary, that have not been appended to the log. The board
renders `derive(committed ++ pending)`.

Usually `pending` is empty and the board shows the same world the server has. When
an admin drags a party, the move appends a constraint to `pending` and the board
re-derives locally — no request, no approximation, the real solver over the real
constraints. Applying flushes `pending` to the log in one append; discarding drops
it. An empty pending list is not a special case, so there is no second code path
and no mode to be in.

This is the difference between recording a decision and recording the search for
one. An admin who tries four arrangements before choosing appends the events for
the arrangement they chose, and the log stays a record of judgement rather than of
experiment.

**The trust boundary does not move.** A client never submits a world. It submits
events, which the server validates, authorises, and appends exactly as it does for
any other command, and then derives for itself. The world the admin saw locally is
a *prediction*; because `derive` is pure, the prediction is checkable, and the apply
request carries the `output_hash` the client derived so the server can compare after
appending. Agreement is what the determinism contract guarantees; disagreement is a
bug to report, and the server's world is authoritative either way.

Pending events live in the admin's browser for as long as that tab is open. They are
never stored on the server, never shared between admins, and never visible to
attendees.

## Plan inputs

`derive` takes a list of events, so the only question any screen has to answer is
which events count. Three answers, and they are the whole visibility model:

```
the working admin    derive(log ++ their pending events)
every other admin    derive(log)
attendees            derive(log before the latest PlanPublished)
```

One function, one list, cut at three points. The two admin cuts differ by whether a
change has been appended yet, which is what **Apply** does. The attendee cut differs
by whether it has been published, which is what **Publish** does.

**Publication is a record about a plan.** `PlanPublished` says that the plan derived
from the events before it is what attendees are being told. Its own position in the
log identifies the preceding plan's `input_seq`. The latest such event is the active
publication; earlier events remain publication history.

```
PlanPublished
  output_hash     sha256 of the plan the admin reviewed
  solver_version  semver of src/solver
  config_hash     sha256 of the canonicalised config object
  notify          whether change emails were queued
  note            optional admin note
```

`output_hash` does two jobs. It is the concurrency guard — the publish request
carries the hash the admin reviewed, and the server refuses with the diff if its own
derivation disagrees, which means the log moved while they were reading. And it is
the record of what was actually sent, which is what makes code drift detectable
rather than silent.

**A plan's identity is the input sequence it was derived at.** That, `config_hash`, and
`solver_version` name it completely, which is why there is no plan id. Those three
also mean **every difference between two plans has exactly one attributable cause** —
new events, retuned weights, or new code. You never have to wonder which.

`config_hash` is computed at runtime from the code config object. See
[event profiles](16-event-profiles.md) §4 for what goes into it, including the
requirement that function bodies are hashed by source.

## Module profiles

The application is assembled from typed modules. This resembles feature flags at
the selection boundary, but module composition is a build-time property rather
than a runtime rollout switch. It is part of the event profile and therefore part
of the configuration hash used to identify a plan.

An event profile explicitly selects its modules. A selected module may contribute
event schemas, labels, validation, solver stages, traces, routes, views, and test
contracts. Modules declare dependencies; a profile that omits a required
dependency fails validation before deployment. A disabled module contributes no
solver stage, trace section, route, view, or required fixture.

The generic module implementation owns mechanisms. The profile owns vocabulary
and policy: concrete tags and values, module parameters, pure derivations and
checks, scoring weights, phases, and user-facing copy. Profile functions are
deterministic evaluators only. They cannot perform I/O, read a clock, use
randomness, dynamically evaluate code, or alter module control flow.

Room and workshop capabilities are independent. A room-only event does not need
workshop entities or views; a workshop-only event does not need rooms, beds,
places, or sleeping-party formation. The first deployed profile enables both.

## Why CQRS is cheap at this size

CQRS and event sourcing usually cost a lot: incremental projections that can
drift, catch-up subscriptions, derived-state caching, eventual consistency in
the UI, and the operational burden of a log you can never fully replay because
it is too big.

None of that applies here. Concretely:

- 150 attendees, ~55 families, ~40 rooms, ~120 places, ~24 workshops.
- Every family edits preferences a handful of times. Admins add a few dozen
  times. Inventory is entered once and corrected occasionally.
- Realistic total: **2,000 to 4,000 events** for the entire life of the event.

At that size, `SELECT * FROM event ORDER BY seq` and a fold in memory is a
sub-millisecond operation. So:

**Projections are never updated incrementally. They are dropped and rebuilt.**

This removes the single largest source of bugs in event-sourced systems. A
projection cannot drift from the log, because it is never older than the last
rebuild. If you suspect a projection is wrong, you delete it. There is no repair
procedure because there is nothing to repair.

**There is no eventual consistency.** A command appends an event and then, in the
same request, rebuilds the projections it affects and returns the new state.
The user sees their write immediately. The asynchrony that usually forces
"your change may take a moment to appear" copy simply does not exist.

The same arithmetic is why the board can derive at all. Two to four thousand
events is a few hundred kilobytes of JSON, well under a hundred compressed, fetched
once when the board loads. An admin tool on a laptop can hold the entire history of
the event in memory and fold it on every drag without noticing.

If the event count ever approaches five figures — it will not, but if — the
change is to cache the folded projection in a KV namespace keyed by `max(seq)`.
That is a ten-line change. Do not pre-build it.

## Request lifecycle

Every mutating request follows the same five steps. Deviating from this shape is
how the architecture rots.

```
1. AUTHENTICATE   resolve session cookie → family, or reject
2. VALIDATE       zod-parse the body; reject with field errors on failure
3. AUTHORISE      may this family emit this event about this subject?
4. APPEND         INSERT INTO event (...) — a single statement, no transaction
5. PROJECT        rebuild affected projections; return fresh HTML
```

Step 4 is one statement on purpose. D1 has no interactive transactions, so any
write path that needs more than one statement to be atomic is a design smell.
Appending to a log never does.

### Authorisation rules

Small enough to state completely:

| Actor | May emit |
|---|---|
| Family | Label/constraint events on entities it owns, for attendee-facing controls |
| Allowlisted admin | Everything, through the admin UI |

An allowlisted admin may enter a constraint for any entity. The actor identifies
the authenticated principal and the subject identifies the affected entity. There
is no separate semantic distinction between an admin acting for themselves and
for another family.

## Read models

One kind. `entity`, `label`, `constraint_definition`, and query indexes.

These are `fold`'s output, persisted. They exist for stable URLs, authentication
lookup, and query shape — not for derivation, which folds in memory and never
reads them. Never written to directly outside the projector. If you find an
`UPDATE family SET ...` anywhere except in `src/project/`, it is a bug.

Plans are derived rather than maintained as authoritative state. Every screen derives
the plan from the events it is allowed to see, and `derive` validates assignment
uniqueness before returning a world, so there is no assignment table or plan table.

## Staleness

The distance between the latest published plan's input sequence and the log head:

```sql
SELECT (SELECT MAX(seq) FROM event) - seq AS events_behind
FROM event
WHERE type = 'PlanPublished'
ORDER BY seq DESC
LIMIT 1;
```

`events_behind > 0` means attendees may be looking at a plan older than what the
admins have. The dashboard shows it permanently. It is the single most important
number on the screen, because it is the one that answers "do I need to do anything
today".

Not every event should make a plan stale — a family correcting the spelling of a
name does not change any assignment. Rather than filtering event types (fragile, and
it will be wrong the first time someone adds an event type), compute staleness
properly, by deriving the published plan and the current plan:

```
diff(derive(log before latest PlanPublished), derive(log))
```

Empty → "up to date despite N new events". Non-empty → "N changes would move M
people. Review →". That is one extra derivation per dashboard load, in the low
milliseconds, and it turns a scary number into an accurate one.

### Code drift

Events are one of three things that move a plan; the others are retuned weights and
new code, and both arrive by deploy rather than by append. Deriving the published
plan and comparing it to the recorded `output_hash` catches them:

> ⚠ Publication #7 was made under solver 2.1.0. The deployed solver derives a
> different plan from the same events. **Review and re-publish →**

This is the same loop as any other staleness — review the diff, publish, email the
families who move — and it is the reason the hash is recorded rather than the plan.
A stored plan would render happily from its own payload and let the deployed code
disagree with it in silence.

## Publication and change notification

Publishing records the current plan as the attendee plan and, optionally, runs the emails.

```
1. Admin reviews the current plan and its diff against the previously published plan.
2. Admin publishes → PlanPublished { output_hash, …, notify, note }
   — refused with the diff if the server derives a different output_hash
3. If notify: diff the previously published plan against the new plan, email only affected families
```

Step 3 is a `for` loop over `diff(previous published plan, new plan)`. A
family is affected if any of its people changed room, place, or workshop — which is
what a `Change` records.

## Module layout

```
src/
  index.ts                Hono app, route mounting
  routes/
    public.ts             login, magic-link redemption
    family.ts             the attendee portal
    admin/
      dashboard.ts  families.ts  inventory.ts
      parties.ts    board.ts     plans.ts
      constraints.ts workshops.ts
    api/
      log.ts              the committed event list, for deriving in the browser
      apply.ts            append a pending list in one batch
  events/
    types.ts              discriminated union + zod schemas
    append.ts             the only place that INSERTs into event
  derive/
    index.ts              derive(events, config) — pure
    fold.ts               events → projections — pure, no I/O
    diff.ts               diff(world, world) → Change[] — pure
  project/
    index.ts              rebuild(db) = persist(db, fold(readEvents(db)))
    entities.ts  labels.ts  constraints.ts  workshops.ts
  modules/
    <module>/             generic contract, implementation, views, and tests
  config/
    define.ts             profile builders and tag constructors
    index.ts               re-exports the active event profile
  solver/
    index.ts              solve(solverInput, config) — pure
    solver-input.ts       projections → frozen sorted SolverInput
    preflight.ts           C1–C9
    parties.ts            phase A
    place.ts              phases 0-3
    workshops.ts          the workshop solver
    trace.ts              trace construction and rendering
    canonical.ts          canonical JSON + sha256
    rng.ts                seeded xorshift32 (unused by default)
    rules/
      hard/  capacity.ts ageBand.ts designation.ts tagRequirements.ts
      soft/  exactFit.ts orphanBed.ts tagPreferences.ts
      tagRelations.ts
  views/                  hono/jsx components
  client/
    board.ts              the one browser bundle
  db/
    schema.ts             drizzle schema for projections
    raw.ts                hand-written SQL for the event log
  lib/
    auth.ts  email.ts  csv.ts  dates.ts
events/
  familienfreizeit-2027.ts  the first deployed event profile
scripts/
  tune.ts                 offline weight sweep, Node not Worker
```

Four boundaries are load-bearing and should be enforced in review:

- **`src/solver/**` imports nothing from `src/db`, `src/routes`, or `src/lib`.**
  It is pure TypeScript over plain data. It may import selected module contracts
  and the active profile, which are also pure data and pure functions with no
  I/O. The ESLint determinism rules extend to profile code.
- **`src/derive/**` is pure and holds the same restrictions.** It is imported by
  the routes, by the solver's callers, and by the browser bundle, so a stray
  import of `src/db` there would take the database with it into the client.
- **Only `src/events/append.ts` writes to `event`.**
- **Only `src/project/**` writes to projection tables.** `src/derive/fold.ts`
  computes them; nothing outside `src/project/**` persists them.

An ESLint `no-restricted-imports` rule covers the first two. The other two are a
code review habit, and a grep in CI if you want the belt as well as the braces.
