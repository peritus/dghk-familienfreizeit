# 02 — Data model

This document defines the generic data model shared by occasion profiles. Concrete
tags, values, module selection, and occasion policies belong in the occasion profile;
they must not require new typed property columns or domain foreign keys.

Persisted tables use the SQLite dialect and target Cloudflare D1; their DDL is
the real thing, intended to be copied into migrations. Derived shapes are
TypeScript types and are the single definition of what `fold` produces.

The model has three layers:

1. `event` is the only persisted domain table.
2. Typed entities in the derived world provide durable identity for families,
   people, rooms, beds, places, workshops, and slots.
3. Labels and constraint definitions in the derived world carry every domain
   property and every domain relationship, interpreted by the constraint
   resolver.

None of the derived layers is stored. `derive(events, config)` builds them in
memory for the events a reader may see ([architecture](01-architecture.md)).
Operational tables for sessions and delivery sit beside the log and are never
domain state.

Entities deliberately contain identity and ordering only. They do not carry
domain properties or references expressing domain relationships. Typed identity
is useful for stable URLs, authentication lookup, and lifecycle; the resolver
remains the only authority for what an entity means or relates to.

Conventions:

- Ids are text, prefixed (`fam_`, `per_`, `rm_`, `bed_`, `plc_`), and generated
  by the caller before appending.
- Timestamps are ISO-8601 UTC strings. SQLite has no date type.
- Label values are canonical JSON scalars or objects, validated by occasion config.
- `sort_key` is the deterministic ordering anchor for every solver input.

## 1. The write side

One table. It is the source of truth and the only domain data that is stored.

```sql
CREATE TABLE event (
  seq     INTEGER PRIMARY KEY,       -- head + 1 at append; see below
  at      TEXT    NOT NULL,
  actor   TEXT    NOT NULL,          -- the verified email of the authenticated principal
  type    TEXT    NOT NULL,
  subject TEXT,
  payload TEXT    NOT NULL           -- canonical JSON
);

CREATE INDEX event_type_idx    ON event(type, seq);
```

`seq` is the total order of the system. A plan records the `input_seq` through which
its solver input was built. Events are never deleted.

The append assigns `seq` explicitly: the head the request derived from, plus one
for each event in the batch. The primary key is therefore the concurrency guard. If
another request appended first, the batch collides, D1 rolls it back, and nothing
is written. Every invariant checked against the derived world before the append
holds after it.

`actor` identifies the authenticated principal. Admin authorization comes from
the verified login identity and a code-level allowlist, not from a domain label.

Operational data—sessions, magic links, rate limits, delivery receipts, and page
views—does not belong in this table.

## 2. Typed entity identity

The generic entity record is the common identity and lifecycle shape.

```ts
type Entity = {
  id: string
  kind: EntityKind          // 'family' | 'person' | 'building' | 'room' | 'bed'
                            // | 'place' | 'slot' | 'workshop' | profile-declared kinds
  sort_key: number
  created_seq: number
  retired_seq: number | null
}
```

The world exposes one typed, `sort_key`-ordered collection per kind
(`world.families`, `world.rooms`, …). The collections give the application
explicit entity boundaries without carrying any property beyond identity.

An entity's `kind` is fixed by the setup event that created it, and the fold
rejects an id reused under a different kind. This is an identity assertion, not a
domain rule. Domain rules belong to occasion config and the resolver.

The occasion config may declare additional typed kinds without changing the core
model. For example, a festival may add `venue`, `vendor`, or `session`; a day
workshop may use only `person`, `space`, `workshop`, and `slot`.

## 3. Labels

Labels carry all properties, capabilities, preferences, and references to other
entities. A value that names another entity is still just a value; the resolver
validates it and decides whether the relationship applies.

```ts
type Label = {
  entity_id: string
  key: string
  value: Json               // canonical JSON scalar or object
  value_type: string
  strength: 'required' | 'preferred' | null
  set_seq: number
  cleared_seq: number | null
}
```

The world exposes the latest uncleared value for each configured label, indexed
by entity and by key and value. Keeping `set_seq` and `cleared_seq` makes replay
and temporal derivation explicit; the event log remains canonical.

Examples:

```text
person:123  role=<profile-defined role>
person:123  birthdate="YYYY-MM-DD"
person:123  <profile-defined property>=<value>
person:123  needs=<profile-defined capability>

room:456    <profile-defined property>=<value>
room:456    provides=<profile-defined capability>

bed:789     <profile-defined bed property>=<value>
place:abc   <profile-defined place property>=<value>
```

The former `family_id`, `building_id`, `room_id`, `bed_id`, and `slot_id`
relationships are labels as well. For example:

```text
person:123  member-of=fam_27
room:456    located-in=building_3
bed:789     located-in=room_456
place:abc   located-in=bed_789
workshop:9  offered-in=slot_sat-morning
```

These labels do not become lookups owned by application code. The resolver
checks entity kinds, cardinality, ownership, and validity when it resolves them.

## 4. Constraint definitions

Event-specific matching vocabulary is data in the event log and has a generic
derived shape:

```ts
type ConstraintDefinition = {
  key: string
  label: string
  description: string
  operator: ResolverOperator
  config: Json
  defined_seq: number
  cleared_seq: number | null
}
```

`operator` is selected from the fixed resolver vocabulary, such as
`needs-provides`, `excludes`, `groups-with`, `separates-from`, `capacity`, and
`ordered-choice`. `config` contains scopes, value types, cardinality,
strength rules, and UI metadata. It never contains executable code.

The resolver is the only component allowed to turn labels and definitions into
relationships, capabilities, parties, assignments, or diagnostics. The indexes
the fold builds support lookup; they do not define semantics.

## 5. Capacity and ordered choices

Capacity remains represented by entities and labels, not special property
columns. A `place` entity is the atomic sleeping position. A double bed has two
place entities, each with a `located-in=bed` label. The resolver counts places
when testing a room assignment.

Workshop rankings are encoded as labels with structured values:

```text
person:123  prefers-workshop={"slot":"slot_sat-morning","workshop":"ws_4","rank":1}
```

The `ordered-choice` operator validates unique ranks per person and slot and
exposes the ordered list to the workshop solver. This keeps the core model
generic while preserving the invariant that an ordered preference is not an
unordered set.

## 6. Operational tables

Operational tables identify people by verified email address, never by entity
id. They are not domain state and are never read by the solver.

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
  published_seq INTEGER,
  sent_at       TEXT NOT NULL,
  provider_id   TEXT,
  error         TEXT
);
```

Every request resolves the session's address afresh: to an admin through the
allowlist, or to a family through the derived world. An address that no longer
belongs to a family resolves to nothing, so there is no mapping table to keep in
step with the log ([authentication](11-authentication.md) §3).

## Cleanup

Expired magic links, sessions, and rate-limit buckets may be deleted. Events are
never deleted.
