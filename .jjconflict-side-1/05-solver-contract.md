# 05 — Solver contract

The solver is the kernel pipeline that turns a solver input into a plan by running the
stages of the selected modules ([modules](20-modules.md) §4). This document defines
what every stage must obey: the determinism contract, the solver input and
configuration, the rule interface, preflight, and the trace. What each stage decides
is specified by its module.

```ts
solve(solverInput: SolverInput, config: SolverConfig): Plan
```

Pure. No I/O, no clock, no randomness, no ambient state. Given identical inputs
it produces byte-identical output, on any machine, at any time, forever (D3).

---

## 1. The determinism contract

This is not a coding-style preference. It is the property that makes re-runs
safe, counterfactual diffs cheap, regression testing a hash comparison, and
publishing twice a no-op for the forty families who did not move.

Seven rules. Each has a way it actually gets broken.

### R1 — Every input array is sorted by an explicit total order

Sorting happens once, in `src/solver/solver-input.ts`, using the sort key each
array declares. Everything downstream may assume it.

```ts
const persons = [...raw].sort(by(
  p => p.family_id,
  p => p.sort_key,
  p => p.id,          // final tiebreak, guarantees totality
));
Object.freeze(persons);
```

*How it breaks:* someone adds a new collection to the solver input and forgets to
sort it. Mitigation: `solver-input.ts` has one `freezeSorted()` helper and a test
that walks every array property of the SolverInput asserting it is sorted and
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
a lint rule against `[0]` on a filtered array inside `src/solver` and module stages.

### R3 — No `Math.random()`

If randomised restarts are ever wanted, use `src/solver/rng.ts` — a seeded
xorshift32 — and store the seed on `SolverConfig`, which is recorded on every
plan. Default is no randomness at all.

*Enforced by:* `no-restricted-globals` ESLint rule scoped to `src/solver/**` and
the pure parts of `src/modules/**`.

### R4 — No `Date.now()`, no `new Date()` without an argument

The occasion date arrives in the config. Age is `ageAt(birthdate, config.event_date)`.

*How it breaks:* someone adds a "registered recently" tiebreak and reaches for
the clock. The correct move is to use the `created_at` already in the solver input,
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
"Score 22 = exact fit +10, ensuite +6, co-room wish +6" is a sentence. "Score
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

In [testing](14-testing.md), but stated here because it is the point:

**Shuffle invariance.** Take a solver input, randomly permute every array in it,
re-sort via `solver-input.ts`, solve, and assert the output hash is unchanged. Run it
with fifty different permutations in CI. Any order dependence anywhere in the
solver fails this within a handful of seeds. It is worth more than every other
test combined.

---

## 2. Solver input and configuration

```ts
type SolverInput = Readonly<{
  input_seq: number
  families: readonly SolverFamily[]      // sort: sort_key, id
  persons: readonly SolverPerson[]       // sort: family_id, sort_key, id
  labels: readonly Label[]               // sort: entity_id, key, value
  capabilities: ReadonlyMap<EntityId, ReadonlySet<string>>
  constraints: readonly Constraint[]     // sort: defined_seq, key
}> & ModuleSolverInputs                  // arrays contributed by selected modules
```

`capabilities` and active constraints are materialised once by the resolver, from
labels and profile derivations ([labels and constraints](04-labels-and-constraints.md) §3).
Each selected module adds its own arrays with a declared sort key; for example
[room inventory](20.1-room-inventory.md) §7 adds `buildings`, `rooms`, and `places`.

Withdrawn people are excluded when the solver input is built, not filtered later, and
each module excludes what its specification says it excludes, such as blocked rooms.
No stage sees data it must remember to ignore.

```ts
type SolverConfig = Readonly<{
  code_revision: string                  // commit id of the deployed monorepo revision (D20)
  config_hash: string
  event_date: string                     // meta.starts_on; every age is computed against it
  profile: OccasionProfile               // the built profile, parameters defaulted
  seed: number | null                    // default null
}>
```

---

## 3. Pipeline

```
solve(input, config):
  findings = kernel preflight checks + selected modules' preflight checks
  stages   = selected stages, ordered topologically, ties by stage id
  for each stage in order:
    result = stage.run(input, outputs of the stages it reads, config)
    record result.output under the stage's module id
    append result.trace and result.diagnostics
  assert assignment uniqueness declared by the selected modules
  return { meta, preflight: findings, sections, trace }
```

Preflight runs before any stage, over the solver input alone. Its value is timing: it
says "19 beds required, 14 available" in week two, before a single placement runs.
Finding severities behave as follows:

- **error** — the plan still computes, but publishing requires an explicit
  acknowledgement. Never block computing: an organiser needs to see the plan to
  understand the error.
- **warning** — shown on the dashboard, no gate.
- **info** — shown on the relevant screen only.

---

## 4. Rules

Every scored or pruning rule, hard or soft, in any module, implements one shape:

```ts
interface Rule<Candidate = unknown, Target = unknown, Ctx = unknown> {
  id: string                    // 'hard.<name>' or 'soft.<name>', kebab-case
  evaluate(candidate: Candidate, target: Target, ctx: Ctx): number | Infeasible
  describe(candidate: Candidate, target: Target, ctx: Ctx): string | null
}
```

**`describe` is mandatory. A rule that cannot explain itself does not ship.** Tag
rules take their wording from the profile's tag copy. Explanation lives next to the
logic, in the same file and the same diff, so it cannot rot separately.

**Integer scores only** (R6). Every weight lives in the profile, on the module
parameter or on the tag it belongs to, and is recorded in `config_hash`.

**Hard rules are binary.** A `required` requirement is not worth points; it prunes.

Adding a rule is a new file with a new rule id. Never edit an existing rule to mean
something different; add a new rule id and retire the old one. Weight changes go
through the profile, never through code (D12).

---

## 5. Plan and trace

```ts
type Plan = {
  meta: {
    input_seq: number
    code_revision: string
    config_hash: string
    event_date: string
  }
  preflight: PreflightFinding[]
  sections: Readonly<Partial<Record<ModuleId, unknown>>>   // typed per module
  trace: TraceEntry[]
}

type PreflightFinding = {
  check: string                 // '<module-id>.<check>' or 'kernel.<check>'
  severity: 'error' | 'warning' | 'info'
  subjects: readonly string[]   // entity ids or constraint keys, sorted
  text: string
}

type TraceEntry = {
  stage: string                 // stage id, e.g. 'room-assignment.place'
  step: string                  // module-defined, e.g. 'greedy'
  subject: string               // party key, person id, workshop id, or constraint key
  text: string                  // the human-readable line
  detail?: {
    chosen?: { target: string, score: number, terms: Array<[string, number]> }
    runners_up?: Array<{ target: string, score: number, terms: Array<[string, number]> }>
    rejected?: Array<{ target: string, rule: string }>
  }
}
```

The trace is a first-class deliverable, not a debug log: one line per decision,
including the alternatives rejected. Every number in it traces to a named weight in a
stored configuration, so an organiser who disagrees can point at the term rather than
the outcome.

Plan sections are specified by their modules: [sleeping parties](20.2-sleeping-parties.md) §10,
[room assignment](20.3-room-assignment.md) §10,
[workshop assignment](20.6-workshop-assignment.md) §10, and [materials](20.8-materials.md) §10.
