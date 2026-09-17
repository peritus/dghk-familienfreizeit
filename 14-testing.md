# 14 — Testing

Testing is layered like the application. Generic module contract tests prove
reusable behavior; each occasion profile supplies fixtures, golden plans, tag
validation cases, and enabled-module integration cases. A profile never needs
tests for modules it did not select.

Vitest with `@cloudflare/vitest-pool-workers`, which runs tests inside `workerd`
against a real D1 instance rather than a mock.

The testing effort is deliberately lopsided. The solver gets most of it, because
the solver is where a bug produces a wrong answer that looks right. API routes and
screens get smoke tests, because a bug there produces a 500 that someone notices
immediately.

---

## 1. The test that matters most

**Shuffle invariance.** If you write one test, write this one.

```ts
test('solver output is invariant under input permutation', () => {
  const log = loadEventLog('test/fixtures/event-logs/full-event.kdl')
  const base = buildSolverInput(log, defaultConfig)
  const expected = sha256(canonical(solve(base, defaultConfig)))

  for (let seed = 0; seed < 50; seed++) {
    const shuffled = shuffleEveryArray(base, seed)   // then re-sorted by solver-input.ts
    const got = sha256(canonical(solve(shuffled, defaultConfig)))
    expect(got).toBe(expected)
  }
})
```

Every array property of the solver input is permuted, the solver input builder re-sorts
them, and the output hash must be identical. `labels` is one of the arrays the
shuffler permutes — this proves the generic label input is order-independent.

This single test catches almost every violation of the determinism contract in
[solver contract](05-solver-contract.md) §1:

- an unsorted collection someone added and forgot to sort — **caught**
- a tiebreak that falls through to input order — **caught**
- `filter(...)[0]` where two candidates score equally — **caught**

Stable transition tests additionally derive a `before` plan from a committed
event-log prefix and an `after` plan from prospective events. They must prove:

- unchanged inputs retain all valid previous assignments;
- an unrelated change does not move unaffected people;
- invalidation or capacity loss moves no more people than necessary under the
  documented bounded-repair procedure;
- a new person does not displace an existing person when another feasible place
  exists;
- every move has one deterministic reason in the transition diff and trace;
- the absence of a previous plan uses the initial-allocation path.
- a `Set` or `Map` iterated where insertion order was accidental — **caught**
- floating-point comparison producing different winners — **caught**

Fifty seeds is arbitrary and enough; a real order dependence fails within a
handful. It runs in well under a second.

The one thing it does not catch is a dependence on something outside the
solver input — the clock, randomness, the environment. That is what the lint rules
in §5 are for.

### Cross-runtime agreement

Second in importance, and the one that holds the organiser application honest. The same
derivation runs in two places — the Worker and the organiser chunk — so the test is
that they cannot disagree.

```ts
test('the browser bundle derives what the Worker derives', async () => {
  const log = loadEventLog('test/fixtures/event-logs/full-event.kdl')
  const here  = sha256(canonical(derive(log, defaultConfig).plan))
  const there = await deriveInBundle(log)      // the built organiser chunk, in a DOM env
  expect(there).toBe(here)
})
```

`deriveInBundle` runs the artefact that ships, not a re-import of the source, so it
also catches a bundler transform that changes behaviour — the one way two copies of
identical source can diverge.

This test is what permits the organiser application to treat its locally derived plan as
real. If it ever fails, the board is showing organisers something the server will not
agree to, and that is worse than the board being slow.

---

## 2. Canonical KDL event fixtures

Authored event-log inputs use KDL, the project’s restricted command-oriented
profile described in [the event model](03-events.md). There is one shared
`loadEventLog(path)` loader. It parses KDL, validates the event payloads and
replay invariants, and returns the same `Event[]` used by production derivation.

Every event-driven test uses this loader, including fold and solver tests,
API tests, D1 integration tests, and the
browser/Worker agreement test. D1 tests seed their database from the parsed KDL
events; they do not maintain a second JSON fixture for the same log.

The canonical fixture tree is:

```text
test/fixtures/event-logs/
  minimal.kdl            6 families, 4 rooms — readable by hand
  full-event.kdl         55 families, 40 rooms — realistic
  tight.kdl              capacity == demand exactly
  oversubscribed.kdl     demand > capacity; things must be unplaced
  fragmented.kdl         many one-person families
  conflicted.kdl         constraints that contradict after a change
  constraint-heavy.kdl   many relations and organiser decisions
  infeasible.kdl         trips room-assignment.requirement-arithmetic
```

The parser reports file and line locations, rejects duplicate properties, and
uses deterministic envelope defaults unless a fixture supplies historical
metadata explicitly. JSON remains valid for API messages, serialized rows,
canonical hashes, and derived results, but authored event-log JSON must not be
maintained alongside KDL. If a boundary requires JSON, generate it from the
parsed KDL events in the test rather than adding a parallel fixture.

## 3. Golden plans

Fixture event logs with their expected output hashes, checked on every change.
Each case is `derive(log, config)`, so a golden test exercises the fold, the
solver input builder, and the solver together rather than the solver alone.

Golden fixtures must record the profile they were recorded against, since a
profile change legitimately changes output. Store `config_hash` alongside
`expected_hash` and fail with a clear message when the profile moved, rather
than reporting an opaque mismatch:

```ts
test.each(goldenCases)('golden: $name', ({ log_path, expected_hash, config_hash }) => {
  if (currentConfigHash() !== config_hash) {
    throw new Error(`golden: $name was recorded against a different profile — re-record with npm run test:record`)
  }
  const world = derive(loadEventLog(log_path), defaultConfig)
  expect(sha256(canonical(world.plan))).toBe(expected_hash)
})
```

**A changed hash is not a failure. It is a question.** The test output must make
the diff readable, not just report a mismatch:

```
golden: full-event — output changed
  47 assignments identical
   3 assignments differ:
     fam_0007  rm_0014 → rm_0009
     fam_0012  rm_0009 → rm_0014
     fam_0022  rm_0031 → rm_0031  (place changed within room)
  total_score 412 → 419
  Re-record with: npm run test:record
```

Without that diff renderer, developers re-record goldens reflexively and the
tests stop meaning anything. With it, the diff is the review.

Re-recording is an explicit command, never automatic, and the recorded hashes are
committed so the change shows up in the pull request.

---

## 4. Property tests

Invariants that must hold for every plan from every solver input. These are the
assertions that catch bugs the golden fixtures happen not to exercise.

```ts
const invariants = [
  ['no person is assigned twice',
    p => unique(roomAssignmentSection(p).assignments.map(a => a.person_id))],

  ['no place holds two people',
    p => unique(roomAssignmentSection(p).assignments
      .map(a => a.place_id).filter(place_id => place_id !== null))],

  ['every assigned place exists in the solver input',
    (p, s) => roomAssignmentSection(p).assignments.every(a => s.places.some(pl => pl.id === a.place_id))],

  ['no room exceeds its place count',
    (p, s) => /* group by room, compare */],

  ['every family is wholly placed or wholly unplaced',
    p => /* never a partial family */],

  ['every person appears exactly once across assignments + unplaced',
    (p, s) => /* conservation of people */],

  ['no-bed people have a room and no place',
    (p, s) => /* no_bed_tag => room_id exists and place_id is null */],

  ['bed demand equals non-null place assignments',
    (p, s) => /* no null place consumes bed capacity */],

  ['every required constraint is honoured or reported as a conflict',
    (p, s) => s.constraints.filter(c => c.strength === 'required')
      .every(c => honoured(p, c) || conflicted(p, c))],

  ['preferred constraints affect configured soft terms and remain traceable',
    (p, s) => /* no preferred decision becomes a forced placement */],

  ['no person is in two workshops in one slot',
    p => /* group by (person, slot) */],

  ['no solver-assigned workshop exceeds capacity',
    (p, s) => /* … */],

  ['every label key names a fixed resolver, profile tag, or declared custom definition, or is reported',
    (p, s) => /* … */],

  ['a capability with a derive has no assignments',
    (p, s) => /* … */],

  ['every family placement unit contains all of its non-withdrawn people',
    (p, s) => /* no family is split in the active scope */],
]
```

"Conservation of people" is the most valuable and the least obvious: every person
in the solver input appears exactly once in `assignments` or once in a family listed
under `unplaced`. A person who silently vanishes — dropped by a filter, lost in a
rewrite — is the failure mode that is hardest to notice by eye and worst to
discover at the hostel.

Run every invariant against every golden fixture, and against generated
solver inputs:

```ts
test('invariants hold on generated solver inputs', () => {
  for (let seed = 0; seed < 200; seed++) {
    const s = generateSolverInput(seed)  // varies sizes, ratios, constraints
    const p = solve(s, defaultConfig)
    for (const [name, check] of invariants) {
      expect(check(p, s), `${name} (seed ${seed})`).toBe(true)
    }
  }
})
```

The generator should produce hostile inputs as readily as reasonable ones: zero
rooms, one enormous family, everyone requiring an ensuite,
capacity exactly equal to demand, capacity one short.

---

## Profile tests

Cheap, and they catch the failure mode where the Worker boots and solves
wrongly:

- every tag has a non-empty `label`;
- every `satisfied_by` names a tag built with `capability`;
- every `ref` names an entity kind of the kernel or a selected module;
- no alias collides with another tag or alias, or with a module-owned key;
- every `family_facing.control` has a renderer contributed by a selected module;
- every `_tag` parameter names a tag of the shape its module role requires;
- every selected module's `requires` is satisfied and stage order has no cycle;
- `defineOccasionProfile` throws on each of the above when deliberately broken.

Each module additionally ships contract tests and names the fixtures a profile
selecting it must supply (module specification §12).

---

## Preflight tests

One fixture per preflight check — the kernel's and each selected module's —
asserting the finding fires with the right severity and names the right entities.
The requirement arithmetic message should be asserted verbatim, since it is the one
an organiser acts on.

## Organiser decision cases

Use the ordinary KDL fixtures and module/integration tests for these cases:

- `fam_42 needs=naehe_zum_eingang` and `rm_07 provides=naehe_zum_eingang`
  work without a profile tag or `ConstraintDefined`. Underscores are retained;
  an empty matching token fails append validation.
- Required and preferred needs have distinct hard/soft behavior. Multiple
  providers leave a candidate set; the first provider is not silently pinned.
- `fam_42 excludes=rm_14` prevents placement there in every solver phase, even
  when another label requests that room. Contradictory required inputs produce
  diagnostics. Place and workshop exclusions receive equivalent coverage.
- Separation uses stable entities and resolver scope. Sleeping grouping is outside
  the active fixture contract;
  workshop groups never merge room placement units.
- Workshop decisions preserve eligibility, capacity, and per-slot uniqueness
  through manual cancellation and fill. Cancelled required targets are reported.
- Clear removes the selected label's effect from the current plan; replay before
  the clear reproduces its prior effect. Pending undo removes a whole action's
  events, including both halves of a needs/provides pair.
- Omitting a note equals `null`. Varying only note text with the event envelope
  and other inputs held fixed changes organiser display but not solver input,
  assignment, scores, or plan hash. Appending any event still advances `input_seq`.
- Applied tokens, optional notes, authors, and timestamps are visible to a second
  organiser in existing views/history; pending events are local. Family payloads
  never expose internal tokens or organiser notes, and family attempts to write
  unrestricted decision labels fail authorisation.
- Kernel/module setup-only keys remain protected, and a decision requiring an
  unselected module is rejected or diagnosed on replay.
- The same cases pass shuffle invariance and browser/Worker agreement.

These are ordinary feature regression cases, with no separate decision-analysis
corpus, reporting module, or retrospective UI.

---

## 5. Lint rules as tests

Some parts of the determinism contract are better enforced statically.

```jsonc
{
  "overrides": [{
    "files": [
      "src/solver/**/*.ts", "src/derive/**/*.ts", "src/config/**/*.ts",
      "src/modules/**/*.ts", "profiles/**/*.ts",
      "!src/modules/*/app/**", "!src/modules/*/worker/**"
    ],
    "rules": {
      "no-restricted-globals": ["error",
        { "name": "Date",   "message": "Pass event_date in via config." },
        { "name": "Math",   "message": "No Math.random in the solver. Use rng.ts." }
      ],
      "no-restricted-imports": ["error", {
        "patterns": ["**/worker/**", "**/app/**"],
        "message": "The solver is pure. Pass data in via the solver input."
      }]
    }
  }]
}
```

A repository-wide `@typescript-eslint/naming-convention` rule enforces the
naming decision (D18): camelCase variables, parameters, and functions; PascalCase
types; snake_case properties in type declarations and object literals; and quoted
kebab-case keys only where a key is vocabulary. Library-defined names such as React
props are exempt through the rule's `filter` option.

These overrides cover everything pure: `src/solver/**`, `src/derive/**`,
`src/config/**`, the active profile, and every module directory outside its `app/`
and `worker/` ([modules](20-modules.md) §6). Profile evaluators
(`derive`, `check`, `valid_for`) run inside the solver and are bound by the same
contract, and the fold is bound by it because the same code runs in a browser,
where a stray `src/worker` import would be a bundling failure rather than a subtle one.

Plus one structural test, which catches the case a lint rule cannot:

```ts
test('every solver input array is sorted and frozen', () => {
  const s = buildSolverInput(fixtureDb)
  for (const [key, value] of Object.entries(s)) {
    if (!Array.isArray(value)) continue
    expect(Object.isFrozen(value), `${key} not frozen`).toBe(true)
    expect(isSortedByDeclaredKey(key, value), `${key} not sorted`).toBe(true)
  }
})
```

This is the test that catches "someone added a collection and forgot", which is
the most likely way the contract degrades as the code changes.

---

## 6. Integration tests

Against a real D1 in `workerd`. Fewer, chunkier, covering the paths where a bug
would be silent rather than loud.

```ts
test('the full loop: import → constraints → solve → plan → communicate', async () => {
  const db = await freshDb()

  await importFamilies(db, csvFixture)           // 55 families
  await setLabels(db, labelFixture)              // LabelSet events
  const plan1 = await computePlan(db)

  await addConstraint(db, ['per_a1','per_a2'], 'rm_0014')
  const plan2 = await computePlan(db)

  expect(roomOf(plan2, ['per_a1'])).toBe('rm_0014')
  expect(movedCount(plan1, plan2)).toBeLessThan(6)   // constraints are surgical

  const preview = await previewCommunication(db, [{ kind: 'accommodation' }])
  await communicate(db, preview.confirmation)   // reviewed basis, scopes, identities and options
  expect(await communicationCount(db)).toBe(1)
  expect(await familyArrangements(db)).toEqual(preview.familyArrangements)
})
```

That `movedCount` assertion is worth more than it looks. It encodes the property
that makes the whole design worthwhile: **a constraint moves the constrained family and very
little else.** If a future change makes the solver chaotic — where a small input
change produces a large output change — this test catches it, and nothing else
would.

Also covered:

- **Auth**: magic link redeems exactly once; a second attempt fails; expiry
  works; rate limits bite; changing an email kills sessions.
- **Fold**: a pure test, no database. Fold a fixture log, compare against a
  hand-written expectation, then fold twice and assert identical. Appending and replaying its source events is
  a separate integration test; the fold itself is never persisted.
- **Constraint enforcement**: attempt to give two people the same place and assert
  solver-input validation fails.
- **Release control**: implement every scenario in [release control](06-release-control.md)
  §9, including unchanged-head preview equality, selection changes, concurrent appends,
  per-scope history, dependencies, privacy and code/config mismatch. Communication
  carries no extra content hash. Selected-scope errors require their acknowledgements;
  hard consistency gates cannot be acknowledged away.
- **Live coordination**: cover last-place races, over-capacity preservation, inactive
  rankings, sign-up fairness exclusion, interest privacy and immediate material saves
  under the module fixture contracts. These behaviours do not need a second Plan.
- **Report contract**: check detailed initial/before/after content, unselected changes,
  exact recipients and no writes from preview/report requests. A reverted edit clears
  its outstanding difference; world-only changes do not create release backlog.

---

## 7. What is not tested

Recorded so the gaps are deliberate.

- **Screens.** Smoke tests that every API route returns 200 for an authorised
  principal and 401/404 otherwise, and that every screen renders from a fixture
  world without throwing. No snapshot tests of markup — they break on every copy
  change and catch nothing.
- **The board's drag interaction.** Manually tested. A Playwright suite for
  pragmatic-drag-and-drop would cost more to maintain than the feature and would
  be flaky. The *server* side of every board action is tested through the API.
- **Email rendering.** Sent to a real address and looked at. Litmus-style
  cross-client testing is not worth it for four plain emails.
- **Load.** 150 people, three organisers. There is no load.

---

## 8. Fixtures as documentation

`test/fixtures/event-logs/minimal.kdl` should be readable and hand-checkable: six
families, four rooms, one keep-apart decision, and one preferred `sole-occupancy`.
Small enough that a person can work out the right answer with a pencil and verify
the solver agrees.

Sleeping-party and child-room fixtures belong to their separate module contracts and
are not part of the active fixture contract.
