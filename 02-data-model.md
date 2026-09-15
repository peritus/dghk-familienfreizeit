# 02 — Data model

SQLite dialect, targeting Cloudflare D1. All DDL below is the real thing; it is
intended to be copied into migrations, not paraphrased.

Conventions:

- Primary keys are text, prefixed (`fam_`, `per_`, `rm_`, `bed_`, `plc_`). Human
  readable in traces and URLs, and impossible to confuse across tables when
  debugging. Generate with `crypto.randomUUID().replace(/-/g,'').slice(0,12)`.
- Timestamps are ISO-8601 UTC strings. SQLite has no date type; do not invent one.
- Booleans are `INTEGER NOT NULL` with a `CHECK (x IN (0,1))`.
- Every table that the solver reads carries a `sort_key INTEGER NOT NULL`. This
  is the determinism anchor. See [04-solver-rooms](04-solver-rooms.md).

---

## 1. The write side

One table. It is the source of truth and the only thing that must never be lost.

```sql
CREATE TABLE event (
  seq     INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT    NOT NULL,          -- ISO-8601 UTC
  actor   TEXT    NOT NULL,          -- authenticated principal | 'system'
  type    TEXT    NOT NULL,
  subject TEXT,                      -- primary entity id, for cheap filtering
  payload TEXT    NOT NULL           -- JSON
);

CREATE INDEX event_type_idx    ON event(type, seq);
CREATE INDEX event_subject_idx ON event(subject, seq);
```

`AUTOINCREMENT` matters, and is not the default. Without it SQLite reuses rowids
after deletion, which would break the monotonicity that everything downstream
assumes. We never delete events, so it is belt and braces — but it is free.

`seq` is the total order of the system. `input_seq` on a plan pins a snapshot.
"What did we know at 14:00 on the 12th" is `WHERE seq <= (SELECT MAX(seq) FROM
event WHERE at <= '...')`.

`actor` identifies the authenticated principal. Admin authorization comes from
the verified login identity and a code-level allowlist, not from a family flag.

**Nothing operational goes in here.** Sessions, magic-link tokens, rate-limit
counters, email delivery receipts and page views are not domain decisions. They
live in ordinary tables and are deleted freely. The event log holds only things a
human decided.

---

## 2. Identity

```sql
CREATE TABLE family (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL COLLATE NOCASE,
  display_name   TEXT NOT NULL,
  locale         TEXT NOT NULL DEFAULT 'de',
  invited_at     TEXT,
  first_login_at TEXT,
  sort_key       INTEGER NOT NULL
);

CREATE UNIQUE INDEX family_email_idx ON family(email);
```

`COLLATE NOCASE` on the column *and* a unique index over it: email addresses are
case-insensitive in the part people actually get wrong, and two families
registering `Mueller@` and `mueller@` must collide loudly at import time rather
than quietly become two logins for one household.

```sql
CREATE TABLE person (
  id               TEXT PRIMARY KEY,
  family_id        TEXT NOT NULL,       -- resolver relation to a family entity
  given_name       TEXT NOT NULL,
  family_name      TEXT NOT NULL,
  birthdate        TEXT,                    -- ISO date; NULL for adults who decline
  role             TEXT NOT NULL CHECK (role IN ('adult','child','infant')),
  occupies_bed     INTEGER NOT NULL DEFAULT 1 CHECK (occupies_bed IN (0,1)),
  needs_accessible INTEGER NOT NULL DEFAULT 0 CHECK (needs_accessible IN (0,1)),
  withdrawn_at     TEXT,
  sort_key         INTEGER NOT NULL
);

CREATE INDEX person_family_idx ON person(family_id, sort_key);
```

Three fields here are doing real work.

**`birthdate`, not `age`.** Age is computed at the *event date*, which is passed
into the solver as config. Storing age means a child who turns 13 between
registration and the weekend is silently in the wrong age band, and it means the
solver's output depends on when you ran it — which breaks determinism outright.
`dates.ts` exposes exactly one function: `ageAt(birthdate, eventDate)`.

**`occupies_bed`.** An infant sleeping in a travel cot or in a parent's bed does
not consume a Place. A family of three may need two beds. Without this the solver
over-allocates and you end up with empty beds and unplaced parties at the same
time, which is the specific failure mode that makes people distrust the tool.
Default 1; admins set it to 0 during import or on review.

**`withdrawn_at` rather than deletion.** People drop out. Deleting the row breaks
every historical plan that referenced them. A withdrawn person is excluded from
the snapshot and remains visible in old plans.

---

## 3. Inventory

```sql
CREATE TABLE building (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  sort_key INTEGER NOT NULL
);

CREATE TABLE room (
  id             TEXT PRIMARY KEY,
  building_id    TEXT NOT NULL,         -- resolver relation to a space entity
  number         TEXT NOT NULL,           -- '14', 'B-3', 'Zelt 2'
  floor          INTEGER,
  kind           TEXT NOT NULL CHECK (kind IN ('room','bungalow','tent')),
  has_ensuite    INTEGER NOT NULL DEFAULT 0 CHECK (has_ensuite IN (0,1)),
  is_outside     INTEGER NOT NULL DEFAULT 0 CHECK (is_outside IN (0,1)),
  is_accessible  INTEGER NOT NULL DEFAULT 0 CHECK (is_accessible IN (0,1)),
  designation    TEXT NOT NULL DEFAULT 'general'
                 CHECK (designation IN ('general','child','staff','blocked')),
  child_min_age  INTEGER,
  child_max_age  INTEGER,
  blocked_reason TEXT,
  notes          TEXT,
  sort_key       INTEGER NOT NULL
);

CREATE UNIQUE INDEX room_number_idx ON room(building_id, number);
CREATE INDEX room_sort_idx ON room(sort_key, id);
```

`has_ensuite`, `is_outside`, `is_accessible` and `floor` are the **derivation
source** for the `ensuite`, `indoor`, `accessible` and `ground-floor`
capabilities in the tag registry — see [14-tags](14-tags.md) §3. A capability
with a `derive` rejects direct assignment; these four columns remain the only
way to set the corresponding capability.

`designation` is the mechanism behind children's rooms. A room designated
`child` with `child_min_age = 8, child_max_age = 14` is the only kind of room
the child pool can be placed into, and general parties cannot be placed there.
`blocked` removes a room from consideration entirely and requires a
`blocked_reason` — this is the "the heater in Room 7 is broken" case, and
modelling it here is what lets the corresponding constraints be cleared.

```sql
CREATE TABLE bed (
  id       TEXT PRIMARY KEY,
  room_id  TEXT NOT NULL,               -- resolver relation to a space entity
  label    TEXT NOT NULL,              -- '14-A', 'oben links'
  kind     TEXT NOT NULL CHECK (kind IN ('single','double','bunk_top','bunk_bottom','cot')),
  sleeps   INTEGER NOT NULL DEFAULT 1 CHECK (sleeps BETWEEN 1 AND 2),
  sort_key INTEGER NOT NULL
);

CREATE TABLE place (
  id       TEXT PRIMARY KEY,
  bed_id   TEXT NOT NULL,               -- resolver relation to a space entity
  room_id  TEXT NOT NULL,               -- resolver-maintained relation
  idx      INTEGER NOT NULL,                     -- 0 or 1 within a double
  sort_key INTEGER NOT NULL
);

CREATE UNIQUE INDEX place_bed_idx  ON place(bed_id, idx);
CREATE INDEX        place_room_idx ON place(room_id, sort_key);
```

`place` is generated, not entered: one row per `bed.sleeps`. It exists because a
double bed sleeps two, so `bed` cannot be the unit of capacity. Everywhere the
solver counts capacity it counts Places.

`place.room_id` is denormalised so that capacity queries do not join through
`bed`. The projector maintains it; nothing else writes it.

### Adjacency

Used only by the adjacency resolver and the `room-with` soft term. In rev3 this
is a generic relation projection rather than a domain table.

```sql
CREATE TABLE room_adjacency (
  room_a   TEXT NOT NULL REFERENCES room(id),
  room_b   TEXT NOT NULL REFERENCES room(id),
  distance INTEGER NOT NULL,          -- 1 = next door, 2 = same corridor, 3 = same floor
  PRIMARY KEY (room_a, room_b)
);
```

Generated by the projector from `(building_id, floor, number)` with a documented
heuristic, then overridable by an admin event. "Next door" in a hostel is not
reliably derivable from the numbering, and an organiser who has walked the
building knows better than any rule. Both directions are stored, so lookups never
need to normalise the pair.

---

## 4. Labels and constraints

All current facts and preferences are represented by generic label events. The
following projection is disposable and exists only for indexed reads:

```sql
CREATE TABLE label (
  entity_id   TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  strength    TEXT          CHECK (strength IN ('required','preferred')),
  set_at      TEXT NOT NULL,
  set_by      TEXT NOT NULL,             -- actor string from the event
  PRIMARY KEY (entity_id, key, value)
);

CREATE INDEX label_by_key_value ON label(key, value, entity_id);
```

Three pieces of rationale from rev1's per-preference tables survive the change
and are load-bearing:

- **The three-value scale argument.** rev1 distinguished `required` (hard rule,
  prunes rooms), `preferred` (scored term) and `indifferent` (absent from
  scoring). This is now expressed as strength versus absence: a tag assignment
  at `required` or `preferred`, or no row at all. Collapsing this to a boolean
  destroys the solver's ability to distinguish "cannot" from "would rather
  not" — which is exactly the distinction admins need to see when the plan is
  tight.
- **The mutuality-is-derived argument.** rev1 derived mutual co-room requests
  and keep-apart symmetry from directed rows. This is now a self-join over
  `tag_assignment`; see [14-tags](14-tags.md) §2.
- **The `free_text` distinction.** Free text is the family's and visible to
  them; admin notes are separate. This is now a `descriptive` tag plus a note
  field, and the privacy boundary in [08-attendee-ux](08-attendee-ux.md) §2 is
  unchanged.

---

## 5. Workshops

```sql
CREATE TABLE slot (
  id        TEXT PRIMARY KEY,
  label     TEXT NOT NULL,             -- 'Samstag Vormittag'
  starts_at TEXT NOT NULL,
  ends_at   TEXT NOT NULL,
  sort_key  INTEGER NOT NULL
);

CREATE TABLE workshop (
  id           TEXT PRIMARY KEY,
  slot_id      TEXT NOT NULL REFERENCES slot(id),
  title        TEXT NOT NULL,
  description  TEXT,
  capacity     INTEGER NOT NULL CHECK (capacity > 0),
  min_capacity INTEGER NOT NULL DEFAULT 0,
  min_age      INTEGER,
  max_age      INTEGER,
  room_id      TEXT REFERENCES room(id),
  cancelled_at TEXT,
  sort_key     INTEGER NOT NULL
);

CREATE INDEX workshop_slot_idx ON workshop(slot_id, sort_key);

CREATE TABLE workshop_pref (
  person_id   TEXT NOT NULL REFERENCES person(id),
  slot_id     TEXT NOT NULL REFERENCES slot(id),
  workshop_id TEXT NOT NULL REFERENCES workshop(id),
  rank        INTEGER NOT NULL CHECK (rank >= 1),
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (person_id, workshop_id)
);

CREATE UNIQUE INDEX workshop_pref_rank_idx ON workshop_pref(person_id, slot_id, rank);
```

That second unique index is worth pausing on. It makes "person 4 ranked two
different workshops as their first choice in the same slot" a storage error
rather than something the solver has to defend against. Ranks are per person per
slot, dense from 1.

`min_capacity` drives cancellation: a workshop that attracts fewer than its
minimum is cancelled and its slot is re-solved. Handled deterministically in
[05-solver-workshops](05-solver-workshops.md).

`workshop_pref` is deliberately not folded into the tag model — see
[14-tags](14-tags.md) §7, so a future reader does not assume it was an
oversight.

---

## 6. Constraint history

There is no separate pin table. Admin decisions are ordinary constraint and
label events. They may be cleared by a later `LabelCleared` event, while the
original event and all plan snapshots remain in the event log. Stable people and
spaces are referenced; derived party keys are never persisted as identity.

---

## 7. Plan snapshots

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

The table is a disposable projection of `PlanSnapshotted` and
`PlanPublished` events. The partial unique index still enforces **at most one
published plan** in the query model; publication commands also use an event
sequence compare-and-swap so concurrent admins cannot append two publications.

```sql
CREATE TABLE plan_room_assignment (
  snapshot_id TEXT    NOT NULL,
  person_id TEXT    NOT NULL,
  place_id  TEXT    NOT NULL,
  room_id   TEXT    NOT NULL,
  party_key TEXT    NOT NULL,
  PRIMARY KEY (snapshot_id, person_id)
);

CREATE UNIQUE INDEX plan_place_unique_idx
  ON plan_room_assignment(snapshot_id, place_id);

CREATE TABLE plan_workshop_assignment (
  snapshot_id TEXT    NOT NULL,
  person_id   TEXT    NOT NULL,
  workshop_id TEXT    NOT NULL,
  slot_id     TEXT    NOT NULL,
  PRIMARY KEY (snapshot_id, person_id, workshop_id)
);

CREATE UNIQUE INDEX plan_slot_unique_idx
  ON plan_workshop_assignment(snapshot_id, person_id, slot_id);
```

These two unique indexes are the most valuable lines in this document.

`plan_place_unique_idx` makes double-booking a bed **structurally impossible**. A
solver bug that assigns two people to one Place fails at write time, loudly, in
the admin's face — not three weeks later when two families arrive at Room 14 with
the same key.

`plan_slot_unique_idx` does the same for timetable clashes. The solver should
never produce one; this guarantees that if it does, nobody finds out the hard way.

Neither index is a performance optimisation. They are assertions about the
solver's correctness, expressed somewhere the solver cannot argue with them.

---

## 8. Operational tables

Not event-sourced. Deleted freely. See [09-auth](09-auth.md) for the protocol.

```sql
CREATE TABLE magic_link (
  token_hash TEXT PRIMARY KEY,        -- sha256(raw token), hex
  family_id  TEXT NOT NULL REFERENCES family(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_ip TEXT
);

CREATE TABLE session (
  token_hash  TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES family(id),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE INDEX session_family_idx ON session(family_id);

CREATE TABLE rate_limit (
  bucket     TEXT PRIMARY KEY,        -- 'magiclink:user@example.com:2026-09-15T14'
  count      INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE email_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email   TEXT NOT NULL,
  kind       TEXT NOT NULL,           -- 'magic_link' | 'invite' | 'plan_change'
  snapshot_id TEXT,
  sent_at    TEXT NOT NULL,
  provider_id TEXT,
  error      TEXT
);
```

`email_log` earns its place: when someone says they never received their room
assignment, you need to know whether you sent it. It is operational, not domain,
so it stays out of the event log.

---

## Cleanup

A daily scheduled Worker, ten lines:

```sql
DELETE FROM magic_link WHERE expires_at < :now;
DELETE FROM session    WHERE expires_at < :now;
DELETE FROM rate_limit WHERE expires_at < :now;
```

Nothing else is ever deleted. Not events, not plan snapshots, not cleared
constraints, not withdrawn people.
