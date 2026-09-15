# 05 — Room assignment

This document specifies reusable room-assignment mechanisms. A profile decides
whether the room modules are enabled and supplies concrete room tags, values,
policies, and pure evaluators.

The core of the system. Everything else is plumbing around this file.

```ts
solve(snapshot: Snapshot, config: SolverConfig): Plan
```

Pure. No I/O, no clock, no randomness, no ambient state. Given identical inputs
it produces byte-identical output, on any machine, at any time, forever.

---

## 1. The determinism contract

This is not a coding-style preference. It is the property that makes re-runs
safe, constraint health computable, regression testing a hash comparison, and
publishing twice a non-event for the forty families who did not move.

Seven rules. Each has a way it actually gets broken.

### R1 — Every input array is sorted by an explicit total order

Sorting happens once, in `snapshot.ts`. Everything downstream may assume it.

```ts
const persons = [...raw].sort(by(
  p => p.family_id,
  p => p.sort_key,
  p => p.id,          // final tiebreak, guarantees totality
));
Object.freeze(persons);
```

*How it breaks:* someone adds a new collection to the snapshot and forgets to
sort it. Mitigation: `snapshot.ts` has one `freezeSorted()` helper and a test
that walks every array property of the Snapshot asserting it is sorted and
frozen.

`labels` is covered by R1 like every other array, sorted by
`entity_id`, `key`, `value`.

`Array.prototype.sort` is stable per ES2019, so a comparator chain is safe — but
do not *rely* on stability. Always terminate the chain in an id comparison so the
order is total regardless.

### R2 — Every tie-break chain terminates in an id comparison

"Whichever came first" is not an order. If two rooms score identically, the
winner is the one with the lower `sort_key`, and if those tie, the lower `id`.

*How it breaks:* `arr.filter(x => x.score === max)[0]`. Looks deterministic
because the input was sorted, and is — until someone changes the filter to a
`reduce` with `>` instead of `>=`, or inserts a `Set` somewhere upstream.
Mitigation: one `argmax()` helper that takes an explicit tiebreak comparator, and
a lint rule against `[0]` on a filtered array inside `src/solver`.

### R3 — No `Math.random()`

If randomised restarts are ever wanted, use `src/solver/rng.ts` — a seeded
xorshift32 — and store the seed on `SolverConfig`, which is recorded on every
plan. Default is no randomness at all.

*Enforced by:* `no-restricted-globals` ESLint rule scoped to `src/solver/**`.

### R4 — No `Date.now()`, no `new Date()` without an argument

The event date arrives in the config. Age is `ageAt(birthdate, config.eventDate)`.

*How it breaks:* someone adds a "registered recently" tiebreak and reaches for
the clock. The correct move is to use the `created_at` already in the snapshot,
which came from the event log and is therefore part of the input.

*Enforced by:* the same lint rule.

### R5 — Never iterate a dynamically built object's keys

`Object.keys()` order on a dynamically-constructed object is specified for string
keys but easy to get wrong when keys are numeric-looking ids. `Map` iteration is
insertion-ordered, which is deterministic only if insertion was.

Rule: **the solver's working state is arrays, sorted.** `Map` is allowed as a
lookup index built from a sorted array and never iterated.

### R6 — Integer scores only

All weights are integers. All score terms are integers. Totals are integers.

This is not about floating-point non-determinism — IEEE-754 is deterministic for
a fixed operation order. It is about *comparison*: `12.7000000000000001 > 12.7`
is a bug waiting in a tiebreak, and an integer score reads better in a trace.
"Score 22 = exact-fit +10, ensuite +6, co-request +6" is a sentence. "Score
21.9999" is not.

### R7 — Canonical JSON for hashing

```ts
function canonical(v: unknown): string   // recursively sorts object keys
const outputHash = sha256(canonical(plan))
```

Key order in `JSON.stringify` follows insertion order, which is deterministic if
construction is — but relying on that couples the hash to unrelated refactors.
Sorting keys makes the hash depend on content only.

### The test that proves all seven

In [testing](13-testing.md), but stated here because it is the point:

**Shuffle invariance.** Take a snapshot, randomly permute every array in it,
re-sort via `snapshot.ts`, solve, and assert the output hash is unchanged. Run it
with fifty different permutations in CI. Any order dependence anywhere in the
solver fails this within a handful of seeds. It is worth more than every other
test combined.

---

## 2. Snapshot

```ts
type Snapshot = Readonly<{
  eventSeq: number
  families:        readonly Family[]
  persons:         readonly Person[]
  rooms:           readonly Room[]
  places:          readonly Place[]
  adjacency:       readonly Adjacency[]
  labels:          readonly Label[]
  capabilities:    ReadonlyMap<RoomId, ReadonlySet<Tag>>
  constraints:     readonly Constraint[]
}>
```

`capabilities` and active constraints are materialised once by the resolver,
from typed labels and built-in derivations ([labels and constraints](04-labels-and-constraints.md) §3).

```ts
type SolverConfig = Readonly<{
  solverVersion: string
  eventDate: string            // ISO date; all ages computed against this
  weights: GeometryWeights     // exactFit, nearFit, orphanBed — see §5
  profile: EventProfile        // from events/<event>.ts
  phases: Phases
  seed: number | null          // default null
}>
```

`eventDate` now comes from `meta.date` in the registry rather than an
environment variable.

Withdrawn people are excluded when the snapshot is built, not filtered later.
Blocked rooms likewise. The solver never sees data it must remember to ignore.

---

## 3. Preflight, then Phase A — Party formation

**Preflight runs first**, before any placement, over the snapshot alone. C1–C9
per [labels and constraints](04-labels-and-constraints.md) §6. Error severity does not block computing a plan —
an admin needs to see the plan to understand the error — but it blocks
publishing without an explicit acknowledgement.

Phase A is the judgement-heavy phase. Runs before any placement.

### A.0 Definitions

```ts
type Party = {
  key: string                  // sha256(sorted person ids).slice(0,12)
  personIds: readonly string[] // sorted
  size: number                 // headcount
  bedDemand: number            // count of persons with occupies_bed = 1
  requirements: readonly { tag: Tag, strength: 'required' | 'preferred' }[]
  provenance: readonly string[]   // human-readable lines, per requirement
}
```

`requirements` is the strictest-strength union of member families'
requirement tags ([labels and constraints](04-labels-and-constraints.md) §5.3), consumed by
`rules/hard/tagRequirements.ts` and `rules/soft/tagPreferences.ts`.

`size` and `bedDemand` differ whenever an infant is present. Capacity checks use
`bedDemand`. Everything a human reads shows `size`.

`key` is derived and therefore **unstable** — it changes when membership changes.
Nothing may persist a party key as a reference. Constraints reference people. The key
exists only to correlate a party across the phases of a single run and to label
rows in the trace.

### A.1 Children's rooms, allocated first

This ordering is the single most important sequencing decision in the solver.

A child who opts into a children's room but does not get a place must fall back
to their family. If family parties are formed first, that fallback mutates a
party's size after placement reasoning has begun, and determinism dies in the
patching.

So: **allocate children's-room places, then form family parties from the
residue.**

```
eligible = persons where
    role = 'child'
  and has tag 'child-room-ok'
  and not constrained to a non-child room
  and ageAt(birthdate, eventDate) within some child room's band

sort eligible by:
  1. needs_accessible desc
  2. age asc
  3. family_id asc
  4. person_id asc

childRooms = rooms where designation = 'child', sorted by (sort_key, id)

for each childRoom in order:
    candidates = eligible not yet placed, whose age fits this room's band
    take up to childRoom.placeCount, in eligible order
    if taken count < phases.childRooms.minOccupants: release them back to the pool
    else: place them, emit trace
```

**The lone-child rule.** A children's room with fewer occupants than
`phases.childRooms.minOccupants` is worse than no children's room: an isolated
child, and a wasted bed. Refuse it. The released children return to their
family parties.

Because there is no adult-supervision requirement, a children's room needs no
further constraint beyond the age band. If that changes, it becomes one more hard
rule in `rules/hard/`; the generic constraints that expressed the workaround can
then be cleared.

**Trace output for this step, per child room:**

> `K3` (Haus B, Raum 22, 6 places, ages 8–14) ← 5 children: Müller Jonas (9),
> Schmidt Lena (11), Weber Ada (10), Weber Nils (13), Braun Mia (8).
> 1 place left empty. Braun Tim (7) not eligible: age below band.

**Trace output for a released child:**

> Müller Jonas (9) opted into a children's room; `K3` and `K7` were full.
> Returned to family party. Müller party size 2 → 3.

That second line is exactly what an admin needs when the family emails asking why
Jonas is not with his friends.

### A.2 Family residue parties

For each family, the persons not placed in a children's room form one party.

A family with zero residue (all members in children's rooms) produces no party.
A family reduced to one person produces a party of one, and those fragment the
plan badly — see the `orphanBed` penalty in §5 and the warning in §7.

Requirements are lifted from the family's requirement-tag assignments
directly: each `needs` label at strength `required` or `preferred` becomes
one entry in `party.requirements`.

### A.3 Merges from mutual-required relation tags

Build an undirected graph over families where an edge exists iff **both**
directions carry a relation tag with `kind: 'same-room'` and
`symmetry: 'mutual-required'`, both at strength `required`. Union-find over
that graph. Each connected component merges its member families' residue
parties into one.

```
merged.requirements = strictest-strength union of members' requirements
merged.bedDemand = sum
```

**Guard against unplaceable merges.** If a merged party's `bedDemand` exceeds the
largest room's place count, the merge cannot be honoured. Refuse it, downgrade
the request to a soft preference, and warn loudly in the trace:

> Refused merge of Müller (3) + Schmidt (3) + Weber (4): combined demand 10
> exceeds largest room capacity 6. Treated as a preference; the solver will try
> to place them adjacently. **Needs admin attention.**

Without this guard the solver produces a party that no room can hold, reports it
unplaced, and gives an admin no idea why.

Non-mutual relation tags, and mutual `preferred` ones, do not merge. They
become the `room-with.oneSidedWeight` / `room-with.adjacentWeight` soft terms.

### A.4 Admin constraints, applied last in event order

Custom `groups-with` and `separates-from` labels are applied in `event.seq` order
after preference-derived formation. Later label clears and definitions determine
the active constraint set. Each emits provenance:

> `P07` size 5 — Müller (2 adults) + Schmidt (2 adults, 1 infant).
> Merged: mutual co-room request `e1183` / `e1201`.
> Bed demand 4 (1 infant does not occupy a bed).

> `P12` size 2 — Weber (2 adults).
> Separated by admin constraint (`e1340`): "Grandparents need ground floor."

### A.5 Output

A sorted `Party[]`. Sort order: `bedDemand` desc, then first member's
`family_id`, then `key`. Admins review this list on the party screen before
looking at any room.

Party requirements are derived as a strictest-strength union of member
families' requirement tags ([labels and constraints](04-labels-and-constraints.md) §5.3), and party provenance
names which member contributed each requirement — a merged party's `required`
tag came from one specific family, and admins reviewing the party screen need
to know which one.

---

## 4. Phases 0–4 — Placement

### Phase 0 — Admin constraints as hard constraints

For each active required admin constraint, in event sequence then constraint-key
order:

1. Resolve the constraint's people to parties.
2. **If the constraint's people span more than one party** → conflict. Skip it,
   record it in `plan.conflicts`, trace it. Do not attempt a partial placement.
   This happens when a constraint was created and then party formation changed
   under it, and the admin needs to know rather than have it silently half-applied.
3. If the matching room has insufficient free places → conflict, skip, trace.
4. Otherwise place the party, decrement the room's free places, mark the party
   placed.

Conflicts are surfaced on the dashboard as a blocking review item. A plan with
unresolved constraint conflicts can be computed but should not be publishable without an
explicit acknowledgement.

### Phase 1 — Forced placements, to fixpoint

```
repeat:
  changed = false
  for each unplaced party, in party sort order:
    feasible = rooms where allHardRules(party, room) pass
                          and freePlaces(room) >= party.bedDemand
    if feasible.length == 0: continue        // handled in phase 4
    if feasible.length == 1:
      place it; changed = true
      trace: "forced — only feasible room"
until not changed, or iterations > partyCount
```

The iteration cap guarantees termination. Placing one party can force another
(by consuming the alternative), so a single pass is not enough; `partyCount`
passes is a generous bound since each pass places at least one party or stops.

Forced placements carry no score and need no justification. That is the point of
separating them: they shorten the list of decisions an admin must actually read.

### Phase 2 — Sorted greedy

Sort remaining parties by:

1. `requires.accessible` desc — the hardest constraint, placed while options remain
2. `feasibleRoomCount` asc — most constrained first
3. `bedDemand` desc — big parties before small; small ones fit in gaps, big ones do not
4. first member's `family_id` asc
5. `key` asc

For each party in that order:

```
candidates = feasible rooms
scored     = candidates.map(room => ({ room, score: score(party, room, ctx) }))
best       = argmax(scored, tiebreak: room.sort_key asc, then room.id asc)
place(party, best.room)
trace(party, best, runnersUp = next two by score)
```

Scoring is recomputed each time because the context changes as rooms fill — an
exact fit is only an exact fit against *current* free places.

### Phase 3 — Bounded repair

Pairwise swap hill-climbing.

```
for pass in 1..config.maxRepairPasses:
    improved = false
    for i in 0..n-2:                 // party array, fixed sort order
      for j in i+1..n-1:
        if swap(i,j) is feasible for both
           and totalScore(after) > totalScore(before):
             apply; record; improved = true
    if not improved: break
```

Deterministic scan order, strict improvement only, hard cap. Record the pass
count and whether the cap was reached — hitting the cap is a signal to tune, and
the dashboard should say so.

**Swaps only, not 3-cycles or ejection chains.** A swap is one sentence in the
trace: "Moved P07 and P12 between Rooms 14 and 9: +7 total." A 3-cycle needs a
diagram. Reviewability beats the extra percent. If plan quality ever demands
more, add 3-cycles as a separately-labelled step so the trace stays honest about
what kind of move it was.

### Phase 4 — Report the unplaceable

For each still-unplaced party, evaluate every room and report:

- the most common blocking rule across all rooms;
- the **closest near-miss**: the room that failed the fewest hard rules, and
  which ones.

> `P14` (Braun ×5, requires ensuite) — unplaced.
> 38 rooms rejected on capacity (needs 5 places, largest free is 4).
> 2 rooms rejected on ensuite.
> Closest: Room 31 (5 places free, no ensuite). Relaxing the ensuite requirement
> would place this party.

That last sentence is the product. An admin reads it and either calls the family
or adds a matching constraint for Room 31.

---

## 5. Scoring

A short table of named integer terms, living in config, stored with every plan.

The `Weights` type loses eight terms to the registry — each now lives as a
field on its tag ([event profiles](15-event-profiles.md) §4):

| Geometry term | Configured as |
|---|---|
| `ensuitePreferred` | `needs-ensuite.weight` |
| `indoorPreferred` | `needs-indoor.weight` |
| `coRoomSameRoom` | `room-with.oneSidedWeight` |
| `coRoomAdjacent` | `room-with.adjacentWeight` |
| `coRoomSameFloor` | folded into `adjacentWeight`, scaled by distance |
| `crossFamilyWhenPreferNot` | `sole-occupancy.penalty` |
| `accessibleRoomWasted` | `accessible.wasteWhenUnneeded` |
| `outsideWhenIndoorPreferred` | `needs-indoor.penalty` |

```ts
type GeometryWeights = {
  exactFit: number                    //  +10  bedDemand == free places
  nearFit: number                     //   +4  leaves exactly 2+ free places
  orphanBed: number                   //   -8  leaves exactly 1 free place
}
```

`exactFit`, `nearFit` and `orphanBed` **stay** in `GeometryWeights` — they are
geometry, not tag matching, and describe how well a party fits a room's
remaining places regardless of which tags are involved.

Defaults shown. They are a starting point, not a truth; expect to tune them in
the first week with `scripts/tune.ts` against an exported event log
([event profiles](15-event-profiles.md) §4), and to record each change as a
deployment of the event profile rather than an event.

Three notes explain why these particular terms carry the scale they do:

**`orphanBed` is a penalty, not a missing bonus.** A room left with exactly one
free place is nearly always wasted — a single leftover place fits almost nobody,
since most remaining parties are families of two or more. Penalising it heavily
pushes the packer toward clean fits. This is the term most worth tuning first.

**`accessible.wasteWhenUnneeded` is small and negative.** Accessible rooms are
scarce. Using one for a party that does not need it is not wrong, it is just a
waste when alternatives exist. A small penalty expresses "prefer not to, but do
it rather than leave someone unplaced".

**`sole-occupancy.penalty` is large and negative but not a hard rule.** That is
the whole point of the three-value preference scale: `required` prunes,
`preferred` costs 12 points. If the plan is tight, the solver will do it, and
the trace will say so, and an admin can make a phone call.

Hard rules are *not* in this table. A requirement tag at `required` is not
worth points; it prunes the room from consideration entirely. Anything in
`rules/hard/` is binary.

### Rule interface

Every rule, hard or soft, implements the same shape:

```ts
interface Rule {
  id: string                    // 'soft.exactFit'
  since: string                 // solver version that introduced it
  evaluate(party: Party, room: RoomState, ctx: Ctx): number | Infeasible
  describe(party: Party, room: RoomState, ctx: Ctx): string | null
}
```

**`describe` is mandatory. A rule that cannot explain itself does not ship.**
The two generic handlers, `tagRequirements` and `tagPreferences`, get their
`describe` text from `registry[tag].label`.

That single constraint is what keeps the trace readable as the rule set grows
from eleven terms to thirty. Explanation lives immediately next to logic, in the
same file, reviewed in the same diff — so it cannot rot separately, which is the
normal fate of explanation code.

Adding a rule is a new file plus a version bump. Never edit an existing rule to
mean something different; add a new one and retire the old. Weight changes go
through config and never through code.

---

## 6. Output

```ts
type Plan = {
  meta: {
    inputSeq: number
    solverVersion: string
    configHash: string
    eventDate: string
  }
  parties: Party[]                       // with provenance
  assignments: Array<{
    partyKey: string
    personId: string
    placeId: string
    roomId: string
  }>
  unplaced: Array<{
    partyKey: string
    reason: string
    nearMiss: { roomId: string, failedRules: string[] } | null
  }>
  conflicts: Array<{                     // constraints that could not be applied
    constraintKey: string
    reason: string
  }>
  preflight: PreflightFinding[]
  trace: TraceEntry[]
  stats: {
    partiesPlaced: number
    placesUsed: number
    placesFree: number
    orphanBeds: number
    repairPasses: number
    repairCapHit: boolean
    totalScore: number
    coRoomWishesSatisfied: number
    coRoomWishesTotal: number
    unsatisfiedRequirements: number
  }
}
```

`stats` is what the dashboard graphs over time. `orphanBeds` and
`coRoomWishesSatisfied / Total` are the two numbers that best express plan
quality to a non-technical organiser.

### Trace entries

```ts
type TraceEntry = {
  phase: 'parties' | 'constraints' | 'forced' | 'greedy' | 'repair' | 'unplaced'
  subject: string           // party key or constraint key
  text: string              // the human-readable line
  detail?: {
    chosen?: { roomId: string, score: number, terms: Array<[string, number]> }
    runnersUp?: Array<{ roomId: string, score: number, terms: Array<[string, number]> }>
    rejected?: Array<{ roomId: string, rule: string }>
  }
}
```

A rendered greedy entry:

> **Room 14** (Haus B, 5 places, ensuite) ← **P07** (Müller ×2, Schmidt ×3).
> Score **22** — exact fit +10, ensuite preferred +6, co-room wish +6.
> Runner-up: Room 09, score 11 (no ensuite, leaves 1 orphan bed).
> Rejected: Room 22 — capacity (4 places, needs 5).

Every number in that block traces to a named weight in a stored config. An admin
who disagrees can point at the term rather than at the outcome, which is a much
more productive conversation and usually ends in a weight change rather than a
constraint.

---

## 7. Known sharp edges

Things that will go wrong, recorded so they are recognised rather than
rediscovered.

**Fragmentation from children's rooms.** A family of two whose only child opts
into a children's room leaves a party of one. Several of these and the plan fills
with single-person parties that waste beds. The `orphanBed` penalty helps, but
the real fix is the party review screen: admins see the size-1 parties listed
first and can merge them or talk to the families. Consider a dashboard warning at
more than five size-1 parties.

**Constraint conflicts after party changes.** A constraint created when Jonas was
in his family's party may span parties once he moves to a children's room. Phase
0 reports the conflict; it does not guess. Admins clear or revise the labels.

**Merge cascades.** Mutual `must` requests are transitive through union-find:
A↔B and B↔C produces one party of all three, even though A and C never asked for
each other. This is correct — they must all be in one room — but it surprises
people. The party provenance shows the chain, and the unplaceable-merge guard
catches the case where the cascade grows past any room.

**Weight tuning is a live wire.** Changing a weight re-solves everything and can
move dozens of families. Always review the diff before publishing after a weight
change. The dashboard should refuse to publish a plan whose `config_hash`
differs from the published one without an explicit "I have reviewed the diff"
confirmation.

**Capacity exactly equal to headcount.** If total places equals total bed demand,
almost every soft term becomes irrelevant and the solver degenerates into "find
any feasible packing", which may take the full repair budget without improving.
Expected and fine; the trace will show `repairCapHit: true` with a near-zero
improvement, and that is the honest report.

**Typos become silence.** `room-with=fam_72` for `fam_27` — nothing errors, the
merge simply never happens. Append-time validation and preflight C2 both catch
it; neither is optional. See [labels and constraints](04-labels-and-constraints.md) §9.

**Derived-and-assigned drift.** A capability with a `derive` must reject direct
assignments, or you get two answers to "does Room 14 have an ensuite". See
[labels and constraints](04-labels-and-constraints.md) §9.

**Requirement inflation through merges.** The strictest-strength union of a
merged party's requirements is correct and surprising — see A.5 above and
[labels and constraints](04-labels-and-constraints.md) §9.
