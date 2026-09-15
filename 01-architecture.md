# 01 — Architecture

## The shape in one diagram

```
                            ┌─────────────────────────────────┐
  family portal ──commands──▶│           event log             │
  admin UI     ──commands──▶│  append-only, monotonic seq     │
                            └────────────────┬────────────────┘
                                             │  replay (full)
                                             ▼
                            ┌─────────────────────────────────┐
                            │          projections            │
                            │  families, people, inventory,   │
                            │  preferences, pins              │
                            └────────────────┬────────────────┘
                                             │  freeze + sort
                                             ▼
                            ┌─────────────────────────────────┐
                            │           snapshot              │
                            │   pure data, pinned at a seq    │
                            └────────────────┬────────────────┘
                                             │
                                  solve(snapshot, config)
                                             │  pure, deterministic
                                             ▼
                            ┌─────────────────────────────────┐
                            │             plan                │
                            │  assignments + unplaced + trace │
                            │  draft → published → superseded │
                            └────────────────┬────────────────┘
                                             │
                        admins read ─────────┤
                        attendees read ──────┘  (published only)
```

Everything flows in one direction. There is no path by which an attendee or an
admin writes an assignment. The solver is the only writer of assignments, and its
only inputs are the event log and a config.

## Why CQRS is cheap at this size

CQRS and event sourcing usually cost a lot: incremental projections that can
drift, catch-up subscriptions, snapshotting strategies, eventual consistency in
the UI, and the operational burden of a log you can never fully replay because
it is too big.

None of that applies here. Concretely:

- 150 attendees, ~55 families, ~40 rooms, ~120 places, ~24 workshops.
- Every family edits preferences a handful of times. Admins pin a few dozen
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
| Family (non-admin) | Preference events about **its own** people only |
| Family (non-admin) | Co-room requests **from** itself to any family |
| Admin | Everything, including preference events on behalf of a family |
| System | `PlanComputed` only |

Admins emitting preference events on a family's behalf is deliberate and needed —
it is scenario 1c from the requirements, where an admin reads an email and enters
what it said. The event records `actor: admin:3` while the subject remains
`family:17`, so the provenance stays visible in the family's own history.

## Read models

Two distinct kinds, with different lifetimes.

### Projections — derived, disposable

`family`, `person`, `room`, `bed`, `place`, `family_room_pref`,
`child_room_optin`, `co_room_request`, `keep_apart`, `pin`, `workshop_pref`,
`slot`, `workshop`.

Rebuilt from the log. Never written to directly outside the projector. If you
find an `UPDATE family SET ...` anywhere except in `src/project/`, it is a bug.

### Plans — immutable, kept forever

A plan is not a projection. It is a *record of what we computed and, sometimes,
what we told people*. It is never rebuilt, because the solver code that produced
it will have changed.

```
plan
  id              autoincrement
  input_seq       the event.seq the snapshot was cut at
  solver_version  semver of src/solver
  config_hash     sha256 of the canonicalised weights
  output_hash     sha256 of the canonicalised plan body
  body            the full Plan JSON, including trace
  status          draft | published | superseded
```

Strictly, `body` is redundant: a pure solver means `(input_seq, solver_version,
config_hash)` reproduces it exactly. Store it anyway. Six weeks and four solver
versions later you will need to answer "what did we email the Müllers on the
14th", and reconstructing that by checking out an old commit is not a thing
anyone will actually do.

Those three fields also mean **every difference between two plans has exactly one
attributable cause**: new events, retuned weights, or new code. You never have to
wonder which.

### Derived read tables

For the attendee portal and admin lists, the published plan's body is unpacked
into flat tables so the common queries are a single indexed lookup rather than a
JSON parse:

- `plan_room_assignment (plan_id, person_id, place_id, room_id, party_key)`
- `plan_workshop_assignment (plan_id, person_id, workshop_id, slot_id)`

These carry uniqueness constraints that act as an integrity check on the solver's
output — see [02-data-model](02-data-model.md). A plan that violates them cannot
be stored, which means a solver bug surfaces as a failed write rather than as a
family discovering they were double-booked.

## Staleness and publication

```sql
SELECT
  p.id,
  p.input_seq,
  (SELECT MAX(seq) FROM event) - p.input_seq AS events_behind
FROM plan p
WHERE p.status = 'published'
ORDER BY p.published_at DESC
LIMIT 1;
```

`events_behind > 0` means the published plan no longer reflects stated
preferences. The admin dashboard shows this permanently. It is the single most
important number on the screen, because it is the one that answers "do I need to
do anything today".

Note that not every event should make a plan stale — a family correcting the
spelling of a name does not change any assignment. Rather than filtering event
types (fragile, and it will be wrong the first time someone adds an event type),
compute staleness properly:

1. `events_behind > 0` → mark **potentially stale**, show the count.
2. On dashboard load, run `solve()` against the current snapshot in the
   background and compare `output_hash` to the published plan's.
3. Equal → "up to date despite N new events". Different → "N changes would move
   M people. Review →".

That is one extra solve per dashboard load, in the low milliseconds. It turns a
scary number into an accurate one.

## Publication and change notification

Publishing is a state transition plus, optionally, an email run.

```
1. Admin reviews the draft plan and its diff against the published plan.
2. Admin publishes    → PlanPublished { plan_id, notify: bool }
3. Previous published plan → status = 'superseded'
4. New plan            → status = 'published', published_at = now
5. If notify: diff old vs new, email only affected families
```

Step 5 is a `for` loop because both plans are stored and the solver is
deterministic. Compare `plan_room_assignment` rows per person between the two
plan ids; a family is affected if any of its people changed room, place, or
workshop. Unaffected families receive nothing, which is what makes re-publishing
socially acceptable rather than an event that trains people to ignore your
emails.

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
      pins.ts       workshops.ts
    api/
      board.ts            JSON endpoints for the board island
  events/
    types.ts              discriminated union + zod schemas
    append.ts             the only place that INSERTs into event
  project/
    index.ts              rebuild(db, scope) — the only writer of projections
    families.ts  inventory.ts  preferences.ts  pins.ts  workshops.ts
  solver/
    index.ts              solve(snapshot, config) — pure
    snapshot.ts           projections → frozen sorted Snapshot
    parties.ts            phase A
    place.ts              phases 0-3
    workshops.ts          the workshop solver
    trace.ts              trace construction and rendering
    canonical.ts          canonical JSON + sha256
    rng.ts                seeded xorshift32 (unused by default)
    rules/
      hard/  capacity.ts ageBand.ts keepApart.ts accessibility.ts designation.ts
      soft/  exactFit.ts ensuite.ts indoor.ts coRoom.ts orphanBed.ts crossFamily.ts
  views/                  hono/jsx components
  client/
    board.ts              the one browser bundle
  db/
    schema.ts             drizzle schema for projections
    raw.ts                hand-written SQL for the event log
  lib/
    auth.ts  email.ts  csv.ts  dates.ts
```

Three boundaries are load-bearing and should be enforced in review:

- **`src/solver/**` imports nothing from `src/db`, `src/routes`, or `src/lib`.**
  It is pure TypeScript over plain data. If it needs something, that something is
  passed in via the snapshot or the config.
- **Only `src/events/append.ts` writes to `event`.**
- **Only `src/project/**` writes to projection tables.**

An ESLint `no-restricted-imports` rule covers the first. The other two are a code
review habit, and a grep in CI if you want the belt as well as the braces.
