# 15 — Event configuration

**Status:** rev2. Supersedes [03-events](03-events.md) `SolverConfigChanged`,
[04-solver-rooms](04-solver-rooms.md) §5 `Weights`, and
[11-deployment](11-deployment.md) §1 `vars.EVENT_DATE`. See
[rev2-delta](rev2-delta.md).

The tag registry, the solver's weights, and the phase switches for **this**
event, in one TypeScript file per event. A config change requires a deploy, and
that is accepted.

---

## 1. Why TypeScript and not YAML

The registry needs embedded logic — `derive: room => room.floor === 0`,
`check: (party, room, ctx) => …`. Three facts make a data format with JS-in-strings
unworkable here.

**Workers blocks dynamic code evaluation.** `eval()`, `new Function`,
`WebAssembly.compile` and friends are disallowed at runtime for security reasons.
The `unsafe_eval` binding people used to reach for was never publicly enrolled —
`wrangler deploy` rejects it as an unknown binding type. The supported
replacement is `worker_loader` / Dynamic Workers, which spawns a separate V8
isolate per evaluation and needs the Workers Paid plan. That is the right tool
for running user-submitted templates out of a database. For `room.floor === 0`
it is absurd.

So embedded JavaScript must be **compiled, not interpreted** — which means either
plain TypeScript or a codegen step over some other source format.

**Strings defeat the determinism contract's enforcement.**
[12-testing](12-testing.md) §5 relies on `no-restricted-globals` catching `Date`
and `Math` inside `src/solver/**`. A lint rule cannot see into a string literal.
[04-solver-rooms](04-solver-rooms.md) §1's seven rules would become seven things
you hope nobody does.

Worth knowing while writing a deterministic solver on this platform: Workers'
`Date.now()` returns the time of the last I/O and does not advance during
execution. An accidental clock dependency would therefore be *stably* wrong
rather than flakily wrong — shuffle-invariance would pass and you would ship it.
Rule R4 stands.

**Types make invalid configurations non-existent.** `capability()`,
`requirement()` and `relation()` narrow so that a `derive` on a requirement, or a
`satisfiedBy` naming a tag that is not a capability, fails to compile. That is
most of what makes this feel like configuration rather than code, and no data
format offers it.

### The docs live in the config

`doc` is **mandatory** on every registry entry, enforced by the type. Same
principle as [04-solver-rooms](04-solver-rooms.md) §5: a rule that cannot explain
itself does not ship.

One source feeds three surfaces: the generated trace text, the help text in the
family portal, and the answer to "why does this constraint exist" six months
later. No separate document to drift.

---

## 2. Shape

```ts
// events/2026-familienwochenende/event.ts

import { defineEvent, capability, requirement, relation, descriptive } from '@/config/define'

export default defineEvent({
  meta: {
    name: 'Familienwochenende 2026',
    date: '2026-10-16',                 // every age in the solver is computed against this
    preferenceDeadline: '2026-09-20T23:59:59Z',
    locale: 'de',
  },

  phases: {
    childRooms:    { enabled: true, minOccupants: 2 },
    coRoomMerging: { enabled: true },
    repair:        { enabled: true, maxPasses: 50 },
    workshops:     { enabled: true },
  },

  weights: {
    exactFit:  10,
    nearFit:    4,
    orphanBed: -8,
  },

  tags: {
    // ── room capabilities ──────────────────────────────────────────────
    'ensuite': capability({
      doc: 'Room has its own bathroom.',
      label: 'Eigenes Bad',
      derive: room => room.has_ensuite,
    }),

    'indoor': capability({
      doc: 'Not a tent or a bungalow. Derived, never assigned.',
      label: 'Drinnen',
      derive: room => !room.is_outside,
    }),

    'ground-floor': capability({
      doc: `Derived from the floor number. Added in 1.3.0 after three
            MISSING_CONSTRAINT pins all turned out to be about stairs.`,
      label: 'Erdgeschoss',
      derive: room => room.floor === 0,
    }),

    'accessible': capability({
      doc: 'Step-free, wide door, accessible bathroom.',
      label: 'Barrierefrei',
      derive: room => room.is_accessible,
      wasteWhenUnneeded: -4,             // scarce; mild penalty for using it needlessly
    }),

    // ── family requirements ────────────────────────────────────────────
    'needs-ensuite': requirement({
      doc: `Families with small children often ask for this. Roughly a third
            request it and we have 14 ensuite beds, so preflight C8 will say
            in week two whether it is satisfiable.`,
      satisfiedBy: 'ensuite',
      weight: 6,
      familyFacing: { label: 'Eigenes Bad', control: 'tri-state' },
    }),

    'needs-indoor': requirement({
      doc: 'Some families will not accept a tent in October.',
      satisfiedBy: 'indoor',
      weight: 6,
      penalty: -6,
      familyFacing: { label: 'Drinnen schlafen', control: 'tri-state' },
    }),

    'needs-ground-floor': requirement({
      doc: 'Mobility. Replaced three pins in 1.3.0.',
      satisfiedBy: 'ground-floor',
      weight: 5,
      familyFacing: { label: 'Erdgeschoss', control: 'tri-state' },
    }),

    'sole-occupancy': requirement({
      doc: `The family will not share a room with another family. At 'required'
            this prunes rooms; at 'preferred' it costs 12 points, which the
            solver will pay if the plan is tight. rev1 called this
            sharing = refuse / prefer_not.`,
      check: (party, room, ctx) =>
        ctx.occupants(room).every(p => p.partyKey === party.key),
      penalty: -12,
      familyFacing: { label: 'Zimmer teilen', control: 'tri-state', invert: true },
    }),

    // ── person requirements ────────────────────────────────────────────
    'child-room-ok': requirement({
      doc: `This child may sleep in a children's room. Per child, not per
            family — siblings frequently disagree.`,
      scope: 'person',
      validFor: p => p.role === 'child',
      structural: true,                  // consumed by party formation, not scored
      familyFacing: { label: 'Möchte ins Kinderzimmer', control: 'toggle' },
    }),

    // ── relations ──────────────────────────────────────────────────────
    'room-with': relation({
      doc: `Mutual requests at 'required' merge the two families into one party.
            One-sided or 'preferred' requests are a preference worth 6. The
            asymmetry is deliberate — see 08-attendee-ux §2.`,
      param: 'family',
      kind: 'same-room',
      symmetry: 'mutual-required',
      oneSidedWeight: 6,
      adjacentWeight: 3,
      familyFacing: { label: 'Zimmer teilen mit', control: 'family-picker' },
    }),

    'apart-from': relation({
      doc: `Never share a room. One row binds both directions. Never shown to
            families, and the reason stays in the admin note.`,
      param: 'family',
      kind: 'not-same-room',
      symmetry: 'implied-mutual',
      adminOnly: true,
    }),

    'workshop-with': relation({
      doc: `Co-assignment in workshops. Group preference is the sum of member
            ranks — see 14-tags §7.`,
      scope: 'person',
      param: 'person',
      kind: 'same-workshop',
      symmetry: 'mutual-required',
      familyFacing: { label: 'Workshops zusammen mit', control: 'person-picker' },
    }),

    // ── notes the solver ignores ───────────────────────────────────────
    'called-them': descriptive({
      doc: 'An organiser spoke to this family by phone. Admin note only.',
      adminOnly: true,
    }),
  },
})
```

`defineEvent` validates at module load and throws on a bad registry — a
`satisfiedBy` naming a non-capability, a `derive` on a requirement, a scope that
contradicts a `validFor`. The Worker fails to boot rather than solving wrongly,
and [12-testing](12-testing.md) asserts the same thing in CI so it never reaches
a deploy.

`type Tag = keyof typeof tags` flows everywhere. A typo in a rule file is a
compile error; a zod enum derived from the same object makes a typo from a
request a validation error.

---

## 3. `phases` — mechanism switches

Vocabulary is *which constraints exist*. Phases are *which mechanisms run at
all*: no children's rooms in 2027, no workshops this year.

```ts
phases: {
  childRooms:    { enabled: false },
  coRoomMerging: { enabled: true },
  repair:        { enabled: true, maxPasses: 50 },
  workshops:     { enabled: false },
}
```

**A disabled phase is absent from the trace, not present-and-empty.** An
organiser reading a 2027 trace must not see "Children's rooms: 0 allocated" for
something that was never offered. `trace.ts` skips the section entirely.

Disabling a phase also removes its surface: `workshops: { enabled: false }` hides
the ranking section of the family portal and the workshop screen in the admin UI.
One switch, whole feature.

Registry entries that depend on a disabled phase — `child-room-ok` without
`childRooms` — are a `defineEvent` validation error, not a silent no-op.

---

## 4. Weights

Two kinds, in two places, on purpose.

**Geometry weights** live in `weights` because they are not about any tag:
`exactFit`, `nearFit`, `orphanBed`. They describe how well a party fits a room's
remaining places.

**Tag weights live on the tag**, because that is where they are read and argued
about:

| Field | Applies | Sign |
|---|---|---|
| `weight` | added when a `preferred` requirement is satisfied | positive |
| `penalty` | added when a `preferred` requirement is violated | negative |
| `oneSidedWeight` | a non-mutual `same-room` relation lands in the same room | positive |
| `adjacentWeight` | a `same-room` relation lands next door instead | positive |
| `wasteWhenUnneeded` | a capability is consumed by a party that did not need it | negative |

Declaring both `weight` and `penalty` is legal and means the term is worth
`weight − penalty` in total swing. Most tags declare one.

`required` strengths are never scored. They prune. That distinction is the whole
reason the three-value scale exists and it survives rev2 intact.

### Weights are code, not data

rev1 had `SolverConfigChanged` carrying the weight table as an event.
**rev2 drops that event.** Weights live in `event.ts`.

The argument that settles it: because the solver is pure and the snapshot is
derivable from the event log, weight tuning never has to happen in production.

```bash
wrangler d1 execute bettenplan --remote --json \
  --command "SELECT * FROM event ORDER BY seq" > events.json
npm run tune
```

`scripts/tune.ts` builds the real snapshot offline and sweeps combinations:

```
orphanBed  room-with.oneSided │ orphans  wishes  unplaced  moved-vs-published
    -8              6         │    5      19/24     0            —
   -12              6         │    2      18/24     0           14 people
   -12             10         │    3      22/24     0           21 people
   -16             10         │    2      22/24     1           33 people
```

Strictly better than an admin screen: you see the trade-off surface rather than
poking one number at a time, and `moved-vs-published` states the human cost of
each change before you commit. Then one deploy.

It also means the repo is readable — `orphanBed: -8` is visible in the file
rather than being whatever row happens to be in a table.

### `config_hash` survives

Computed at runtime from the config object, stored on every plan
([01-architecture](01-architecture.md)):

```ts
const configHash = sha256(canonical({
  weights, phases, meta,
  tags: mapValues(tags, stripFunctions),      // functions by name + source hash
}))
```

In principle `solver_version` already covers this, since the config is code — but
only if you remember to bump the version on every weight tweak, and you will not.
A hash computed from the object is automatic, and it keeps
[01-architecture](01-architecture.md)'s "every plan difference has exactly one
attributable cause" working without relying on discipline.

`stripFunctions` must hash the function *source*, not just its name, or a changed
`derive` slips past. `fn.toString()` is stable enough here; it is compared only
against other builds of the same file.

---

## 5. `familyFacing` drives the portal

[08-attendee-ux](08-attendee-ux.md)'s preferences page is a **renderer over the
registry**. Sections 2, 3 and 4 of that page are generated: every tag declaring
`familyFacing` produces a control, in registry order, grouped by scope.

`control` is a closed union, and this is the thing to think about up front:

| `control` | Renders | Writes |
|---|---|---|
| `tri-state` | three radios — unbedingt / gerne / egal | strength `required`, `preferred`, or `TagCleared` |
| `toggle` | one checkbox | `TagSet` with no strength, or `TagCleared` |
| `family-picker` | searchable family list, multi-select | one `TagSet` per selection, `value` = family id |
| `person-picker` | people within the same family | one `TagSet` per selection, `value` = person id |

Adding a tag that reuses an existing control is a **one-file change**: registry
entry, and the constraint, the rule, and the form control all appear. Adding a
*new kind* of control is two files: registry plus renderer.

`invert: true` on `sole-occupancy` flips the labels so the portal reads
"Zimmer teilen: gerne / lieber nicht / auf keinen Fall" while the stored tag
remains positively named. Presentation only; storage is unaffected.

`adminOnly: true` tags never render in the portal regardless of `familyFacing`,
and `apart-from` declares no `familyFacing` at all — belt and braces, because
accidentally exposing keep-apart relations to families would be the single worst
privacy failure this application could have.

`doc` supplies the help text. Keep the first sentence of every `familyFacing`
tag's `doc` readable by a non-technical parent, because it will be.

---

## 6. Year over year

```
events/
  2026-familienwochenende/  event.ts   CONSTRAINTS.md   # hand-written notes
  2027-familienwochenende/  event.ts   CONSTRAINTS.md
src/
  config/define.ts                                      # the builders
  solver/                                               # mechanisms, stable
```

`src/config/index.ts` re-exports the active event; which one is a build-time
import, not an environment variable. [README](README.md) already establishes one
event per deployment, so 2027 is a new deployment with a new database and a new
config — not a runtime switch.

That also resolves the unknown-tag problem cleanly. A 2027 log never contains
2026's retired tags, so C7 only ever fires for tags removed *mid-run-up*, within
one event's life. That is a much smaller case: retain the assignment in the
projection, ignore it in the solver, report it.

### Renames are free

```ts
'needs-ensuite': requirement({
  aliases: ['ensuite-required', 'needs-bathroom'],
  …
})
```

Aliases resolve on append and on replay. Worth adding from the start — the first
rename otherwise means either a data migration over `tag_assignment` or a log
that no longer replays. `defineEvent` rejects an alias colliding with another
tag or alias.

### Removing a tag

1. Delete the registry entry.
2. Existing assignments stay in the projection and are ignored by the solver.
3. Preflight C7 reports them with counts.
4. Optionally clean up with `TagCleared` events.

Never delete rows from `tag_assignment` directly. The projection is rebuilt from
the log, so a direct delete is undone on the next rebuild.

---

## 7. Boundaries

`src/solver/**` may import `src/config/**`. The config is pure data and pure
functions with no I/O, so this does not weaken
[01-architecture](01-architecture.md)'s purity boundary. The other two rules are
unchanged: the solver still imports nothing from `src/db`, `src/routes` or
`src/lib`.

The ESLint restriction in [12-testing](12-testing.md) §5 extends to
`src/config/**` — no `Date`, no `Math`, no I/O in a `derive` or a `check`. They
run inside the solver and are bound by the same contract.

`scripts/tune.ts` is a Node script, not Worker code. It imports the solver and
the config and nothing else, which is only possible because both are pure.

---

## 8. What rev2 removes

| rev1 | rev2 |
|---|---|
| `SolverConfigChanged` event | `event.ts` `weights` + tag weights |
| `Weights` in `SolverConfig` (11 terms) | `weights` (3 geometry terms) + per-tag weights |
| `vars.EVENT_DATE` in `wrangler.jsonc` | `meta.date` |
| `vars.PREFERENCE_DEADLINE` | `meta.preferenceDeadline` |
| `config.maxRepairPasses` | `phases.repair.maxPasses` |
| Hand-written portal sections 2–4 | rendered from `familyFacing` |

`EVENT_NAME`, `PUBLIC_URL` and `EMAIL_FROM` stay in `wrangler.jsonc` — they are
deployment facts, not solver inputs, and they must not enter `config_hash`.
`EVENT_DATE` moves because every age in the solver is computed against it, which
makes it a solver input that belongs in the hash.
