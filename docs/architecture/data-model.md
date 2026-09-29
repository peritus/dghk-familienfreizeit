# Data model

`event` is the only persisted domain table. Everything else the application
reads is derived in memory by `derive(events, config)`
([event kernel](events.md)); no folded domain state is stored, and no table is
queried for a domain lookup.

## The write side

```sql
CREATE TABLE event (
  seq     INTEGER PRIMARY KEY,
  at      TEXT    NOT NULL,
  actor   TEXT    NOT NULL,
  type    TEXT    NOT NULL,
  subject TEXT,
  payload TEXT    NOT NULL
);

CREATE INDEX event_type_idx ON event(type, seq);
```

Migration `0001_m1_kernel.sql` creates this table on D1. `src/events/store.ts`
implements the write side: `readEvents(db, config, untilSeq?)` selects rows in
`seq` order (optionally bounded by `untilSeq`) and parses each through
`parseEvent` using the selected profile's composed payload schemas. The same
`KernelConfig` is supplied to `appendEvents`, so reads and writes cannot silently
disagree about selected module event types. `appendEvents` computes each new
row's `seq` from a caller-supplied `expectedHead`, then submits one conditional `INSERT ... WHERE
(SELECT MAX(seq) FROM event) = <prior seq>` per event in a single D1 batch. If
the head moved between the caller's read and the append, the batch's
`WHERE` clauses match no row, `changes !== 1` for at least one statement, and
`appendEvents` throws `StaleHeadError` — nothing is written. `event.seq` being
the primary key stops the pathological case that the conditional `WHERE`
already forbids: a batch can never itself resurrect a stale row. `payload` is
canonical JSON (`canonicalJson`), so byte-identical values always append as
byte-identical rows.

`actor` records the authenticated principal that produced the event; it is
never a domain label. Operational data — sessions, magic links, rate limits,
and email delivery — is not stored in this table (see below).

## Development text representation

`src/events/kdl.ts`'s `loadKdl` and `TextFileEventSource` load the same event
model from a restricted KDL subset for development and tests, instead of D1.
One event node per top-level line; only named `key=value` properties are
allowed — no positional arguments, no child blocks, no duplicate properties.
The first token is the event type.

```kdl
FamilyInvited family_id=fam_a email="family_a@example.com" display_name="The A's" locale="de"
PersonAdded person_id=per_peter family_id=fam_a given_name="Peter" family_name="A" birthdate=#null role=adult
```

Unless a fixture explicitly supplies `seq`, `at`, `actor`, or `subject` as a
node property, `loadKdl` assigns the one-based line position as `seq`, a fixed
timestamp, `actor: 'fixture'`, and `subject: null`. Every property maps through
the same `parsePayload`/`parseEvent` path D1 replay uses, so a KDL fixture and
a D1-backed request enforce identical schema and invariant checks. `loadKdl`
also calls `derive(events, config)` once before returning, so a malformed
fixture fails at load time rather than silently producing an unreplayable log.
KDL is an authored-input format only; `Event[]` remains the sole type passed to
`derive`.

## Typed entity identity

```ts
type Entity = {
  id: string
  kind: EntityKind          // kernel: 'family' | 'person'; modules: any other string
  sort_key: number
  created_seq: number
}
```

The kernel defines `family` and `person`. A selected module contributes any
other kind through `ModuleContributions.entity_kinds`
([module contract](../../spec/modules/contract.md) §3.1); `defineOccasionProfile`
composes the selected modules' kinds and event fold functions into
`derive`'s dispatch, and `guardModuleFold` (`src/events/fold.ts`) rejects a
module fold call that creates an entity of a kind it didn't itself declare.
`world.entities_by_kind` exposes one sorted collection per kind this way,
generically, for every kind including `family`/`person`. The selected
room-inventory module exposes its typed ordered view through `inventoryWorld`;
future modules add their own typed accessors without adding persisted property
columns or relationship tables. The selected workshop modules follow the same
boundary: `workshop`, `workshop-space`, and `workshop-slot` are typed entities,
while placement, ranking, mode, capacity, audience, and leader relationships are
labels or derived solver output. A workshop has one derived placement at most; no
separate placement identity is stored.

Retirement is hard removal, not a tombstone
([D27](../../decisions.md#d27--entities-and-labels-are-hard-removed-on-retirementclear-history-is-re-derived-not-tombstoned)):
`PersonWithdrawn`, `LabelCleared`, and a module fold's `retireEntity`/
`replaceLabels` remove their target from the live `Entity`/`Label` collections
instead of flagging a `retired_seq`/`cleared_seq` field for every read site to
filter. A cross-kind id collision is rejected because it is structurally
impossible, not because a permanent ledger of past ids is kept: every id must
start with its own kind's declared prefix (kernel-reserved `fam_`/`per_`;
module prefixes are validated globally unique at profile build), enforced in
`registerEntity` against `KernelConfig.entity_kind_prefixes`. What a piece of
state used to be, or that it used to exist, is answered by re-deriving
`derive()` over a truncated event slice at the `seq` in question — release
control's reviewed-`input_seq` views already work this way — not by keeping
old state around in the live world.

The module fold capability
(`ModuleFoldCapability`, `src/events/fold.ts`) has guarded operations: `createEntity`
(with an optional source `sortKey` distinct from creation `seq`, so a module's
own ordering survives instead of always collapsing to creation order),
`retireEntity`, `clearLabel`, `setLabel`, and `replaceLabels` (an atomic full-label
restatement: clears every live label under each write's key, then sets its
new value). `clearLabel` is the explicit path for nullable full-restatement
fields. Every call is checked
against that module's own declared entity kinds and label keys before it
reaches real world state. A module event's authorization rule is a separate,
required contribution — `ModuleContributions.events[].authorize(principal,
payload, world) => boolean` — composed into `KernelConfig.event_authorize_dispatch`
and consulted by `canAppendEvent` (`src/auth/authorization.ts`) for any event
type outside the kernel's own five entity-touching types; a module event with
no declared rule is denied, not accidentally allowed or denied by a payload
shape coincidence.

The selected room-inventory module exercises this boundary with real entity
creation, guarded label writes and clears, full restatements, and retirement
reconciliation; the focused module-boundary fixtures continue to cover rejection
paths.

## Operational tables

Sessions, magic links, rate limits, and email delivery are not domain state:
`derive` never reads them, and they identify people by verified email address,
not by entity id.

```sql
CREATE TABLE magic_link (
  token_hash  TEXT PRIMARY KEY,
  email       TEXT NOT NULL COLLATE NOCASE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  created_ip  TEXT
);

CREATE TABLE session (
  token_hash   TEXT PRIMARY KEY,
  email        TEXT NOT NULL COLLATE NOCASE,
  expires_at   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE rate_limit (
  bucket     TEXT PRIMARY KEY,
  count      INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE email_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email      TEXT NOT NULL,
  kind          TEXT NOT NULL,
  communication_seq INTEGER,
  family_id     TEXT,
  delivery_key  TEXT UNIQUE,
  status        TEXT NOT NULL,
  sent_at       TEXT,
  provider_id   TEXT,
  error         TEXT
);
```

All four tables are created by migration `0001_m1_kernel.sql`. Expired magic
links, sessions, and rate-limit buckets may be deleted; events are never
deleted.

## Limits

Named per-kind entity accessors, generic labels, and their resolver semantics
are specified in [outstanding data model](../../spec/architecture/data-model.md)
§§1–3 and [labels and constraints](../../spec/architecture/labels-and-constraints.md)
— the label shapes described there are only partially implemented today (see
[event kernel](events.md) Limits). No real module exists yet to select and
exercise the entity-kind mechanism above outside tests.
