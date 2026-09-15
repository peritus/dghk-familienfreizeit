# 02 — Data model

SQLite dialect, targeting Cloudflare D1. All DDL below is the real thing; it is
intended to be copied into migrations, not paraphrased.

The model has three layers:

1. `event` is the only domain write table.
2. Typed entity tables provide durable identity for families, people, rooms,
   beds, places, workshops, and slots.
3. `label` and `constraint_definition` are generic projections. Every domain
   property and every domain relationship is represented there and interpreted
   by the constraint resolver.

Typed tables deliberately contain identity and ordering only. They do not carry
domain properties or foreign keys expressing domain relationships. A typed table
is useful for stable URLs, authentication lookup, lifecycle, and query shape;
the resolver remains the only authority for what an entity means or relates to.

Conventions:

- Primary keys are text, prefixed (`fam_`, `per_`, `rm_`, `bed_`, `plc_`).
- Timestamps are ISO-8601 UTC strings. SQLite has no date type.
- Label values are canonical JSON scalars or objects, validated by event config.
- `sort_key` is the deterministic ordering anchor for every solver input.

## 1. The write side

One table. It is the source of truth and the only thing that must never be lost.

```sql
CREATE TABLE event (
  seq     INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT    NOT NULL,
  actor   TEXT    NOT NULL,          -- authenticated principal | 'system'
  type    TEXT    NOT NULL,
  subject TEXT,
  payload TEXT    NOT NULL           -- canonical JSON
);

CREATE INDEX event_type_idx    ON event(type, seq);
CREATE INDEX event_subject_idx ON event(subject, seq);
```

`seq` is the total order of the system. A snapshot fixes the solver input at one
sequence number. Events are never deleted.

`actor` identifies the authenticated principal. Admin authorization comes from
the verified login identity and a code-level allowlist, not from a domain label.

Operational data—sessions, magic links, rate limits, delivery receipts, and page
views—does not belong in this table.

## 2. Typed entity identity

The generic entity row is the common identity and lifecycle record.

```sql
CREATE TABLE entity (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  sort_key    INTEGER NOT NULL,
  created_seq INTEGER NOT NULL,
  retired_seq INTEGER
);

CREATE INDEX entity_kind_idx ON entity(kind, sort_key, id);
```

The typed tables retain their value because they give the application explicit
entity boundaries and readable query targets. They intentionally contain no
properties beyond the identity already held by `entity`.

```sql
CREATE TABLE family   (id TEXT PRIMARY KEY REFERENCES entity(id));
CREATE TABLE person   (id TEXT PRIMARY KEY REFERENCES entity(id));
CREATE TABLE building (id TEXT PRIMARY KEY REFERENCES entity(id));
CREATE TABLE room     (id TEXT PRIMARY KEY REFERENCES entity(id));
CREATE TABLE bed      (id TEXT PRIMARY KEY REFERENCES entity(id));
CREATE TABLE place    (id TEXT PRIMARY KEY REFERENCES entity(id));
CREATE TABLE slot     (id TEXT PRIMARY KEY REFERENCES entity(id));
CREATE TABLE workshop (id TEXT PRIMARY KEY REFERENCES entity(id));
```

The `kind` value must match the typed table in the projector. This is an
identity assertion, not a domain rule. Domain rules belong to event config and
the resolver.

The event config may declare additional typed kinds without changing the core
schema. For example, a festival may add `venue`, `vendor`, or `session`; a day
workshop may use only `person`, `space`, `workshop`, and `slot`.

## 3. Labels

Labels carry all properties, capabilities, preferences, and references to other
entities. A value that names another entity is still just a value; the resolver
validates it and decides whether the relationship applies.

```sql
CREATE TABLE label (
  entity_id   TEXT NOT NULL,
  key         TEXT NOT NULL,
  value_json  TEXT NOT NULL,
  value_type  TEXT NOT NULL,
  strength    TEXT CHECK (strength IN ('required','preferred')),
  set_seq     INTEGER NOT NULL,
  cleared_seq INTEGER,
  PRIMARY KEY (entity_id, key, value_json, set_seq)
);

CREATE INDEX label_lookup
  ON label(key, value_json, entity_id, cleared_seq);
CREATE INDEX label_entity_lookup
  ON label(entity_id, key, cleared_seq, set_seq);
```

The live label projection exposes the latest uncleared value for each configured
label. Keeping `set_seq` and `cleared_seq` makes replay and temporal snapshots
explicit; the event log remains canonical.

Examples:

```text
person:123  role=child
person:123  birthdate="2014-05-07"
person:123  occupies-bed=true
person:123  needs-accessible=true
person:123  needs=room-with-garden-view

room:456    number="14"
room:456    floor=0
room:456    kind=bungalow
room:456    has-ensuite=true
room:456    designation=child
room:456    child-min-age=8
room:456    child-max-age=14
room:456    provides=room-with-garden-view

bed:789     kind=bunk_top
bed:789     sleeps=1
place:abc   index=0
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

These labels do not become SQL joins owned by application code. The resolver
checks entity kinds, cardinality, ownership, and validity when it resolves them.

## 4. Constraint definitions

Event-specific matching vocabulary is data in the event log and has a generic
projection:

```sql
CREATE TABLE constraint_definition (
  key          TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  description  TEXT NOT NULL,
  operator     TEXT NOT NULL,
  config_json  TEXT NOT NULL,
  defined_seq  INTEGER NOT NULL,
  cleared_seq  INTEGER
);

CREATE INDEX constraint_operator_idx
  ON constraint_definition(operator, cleared_seq);
```

`operator` is selected from the fixed resolver vocabulary, such as
`needs-provides`, `excludes`, `groups-with`, `separates-from`, `capacity`, and
`ordered-choice`. `config_json` contains scopes, value types, cardinality,
strength rules, and UI metadata. It never contains executable code.

The resolver is the only component allowed to turn labels and definitions into
relationships, capabilities, parties, assignments, or diagnostics. SQL indexes
support lookup; they do not define semantics.

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

## 6. Plan snapshots

A plan snapshot is an immutable event-log artifact. The query table is only a
read projection:

```sql
CREATE TABLE plan_snapshot (
  snapshot_id    TEXT PRIMARY KEY,
  input_seq      INTEGER NOT NULL,
  solver_version TEXT NOT NULL,
  config_hash    TEXT NOT NULL,
  output_hash    TEXT NOT NULL,
  body           TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('draft','published','superseded')),
  created_at     TEXT NOT NULL,
  created_by     TEXT NOT NULL
);

CREATE UNIQUE INDEX plan_one_published_idx
  ON plan_snapshot(status) WHERE status = 'published';
```

The complete plan body is stored by `PlanSnapshotted`. Assignment tables may be
unpacked for indexed reads and uniqueness assertions, but the event-log body is
the historical source.

```sql
CREATE TABLE plan_room_assignment (
  snapshot_id TEXT NOT NULL,
  person_id   TEXT NOT NULL,
  place_id    TEXT NOT NULL,
  room_id     TEXT NOT NULL,
  party_key   TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, person_id)
);

CREATE UNIQUE INDEX plan_place_unique_idx
  ON plan_room_assignment(snapshot_id, place_id);

CREATE TABLE plan_workshop_assignment (
  snapshot_id TEXT NOT NULL,
  person_id   TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  slot_id     TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, person_id, workshop_id)
);

CREATE UNIQUE INDEX plan_slot_unique_idx
  ON plan_workshop_assignment(snapshot_id, person_id, slot_id);
```

These are solver-output assertions, not domain relationships. They are safe to
materialize because the solver and snapshot remain authoritative.

## 7. Operational tables

Operational tables may reference stable entity IDs for authentication and
delivery, but those references are not domain relationships and are never used
by the solver.

```sql
CREATE TABLE principal (
  id        TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL UNIQUE REFERENCES entity(id),
  email     TEXT NOT NULL COLLATE NOCASE
);

CREATE TABLE magic_link (
  token_hash  TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL REFERENCES principal(id),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  created_ip  TEXT
);

CREATE TABLE session (
  token_hash  TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL REFERENCES principal(id),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE rate_limit (
  bucket     TEXT PRIMARY KEY,
  count      INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE email_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email    TEXT NOT NULL,
  kind        TEXT NOT NULL,
  snapshot_id TEXT,
  sent_at     TEXT NOT NULL,
  provider_id TEXT,
  error       TEXT
);
```

## Cleanup

Expired magic links, sessions, and rate-limit buckets may be deleted. Domain
events, labels, constraint definitions, snapshots, and withdrawn entities are
never deleted.
