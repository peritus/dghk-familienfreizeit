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
implements the write side: `readEvents` selects rows in `seq` order (optionally
bounded by `untilSeq`) and parses each through `parseEvent`, the same payload
schemas used on append. `appendEvents` computes each new row's `seq` from a
caller-supplied `expectedHead`, then submits one conditional `INSERT ... WHERE
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

Typed entity identity, generic labels, and their resolver semantics are
specified in [outstanding data model](../../spec/architecture/data-model.md)
§§1–3 and [labels and constraints](../../spec/architecture/labels-and-constraints.md)
— the entity/label shapes described there are only partially implemented today
(see [event kernel](events.md) Limits).
