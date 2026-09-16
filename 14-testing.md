# 13 — Testing

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
  const base = loadEventLog('test/fixtures/event-logs/full-event.kdl')
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
[room assignment](05-room-assignment.md) §1:

- an unsorted collection someone added and forgot to sort — **caught**
- a tiebreak that falls through to input order — **caught**
- `filter(...)[0]` where two candidates score equally — **caught**
- a `Set` or `Map` iterated where insertion order was accidental — **caught**
- floating-point comparison producing different winners — **caught**

Fifty seeds is arbitrary and enough; a real order dependence fails within a
handful. It runs in well under a second.

The one thing it does not catch is a dependence on something outside the
solver input — the clock, randomness, the environment. That is what the lint rules
in §5 are for.

### Cross-runtime agreement

Second in importance, and the one that holds the admin application honest. The same
derivation runs in two places — the Worker and the admin chunk — so the test is
that they cannot disagree.

```ts
test('the browser bundle derives what the Worker derives', async () => {
  const log = loadEventLog('test/fixtures/event-logs/full-event.kdl')
  const here  = sha256(canonical(derive(log, defaultConfig).plan))
  const there = await deriveInBundle(log)      // the built admin chunk, in a DOM env
  expect(there).toBe(here)
})
```

`deriveInBundle` runs the artefact that ships, not a re-import of the source, so it
also catches a bundler transform that changes behaviour — the one way two copies of
identical source can diverge.

This test is what permits the admin application to treat its locally derived plan as
real. If it ever fails, the board is showing admins something the server will not
agree to, and that is worse than the board being slow.

---

## 2. Canonical KDL event fixtures

Authored event-log inputs use KDL, the project’s restricted command-oriented
profile described in [the event model](03-events.md). There is one shared
`loadEventLog(path)` loader. It parses KDL, validates the event payloads and
replay invariants, and returns the same `Event[]` used by production derivation.

Every event-driven test uses this loader, including fold and solver tests,
constraint-health fixtures, API tests, D1 integration tests, and the
browser/Worker agreement test. D1 tests seed their database from the parsed KDL
events; they do not maintain a second JSON fixture for the same log.

The canonical fixture tree is:

```text
test/fixtures/event-logs/
  minimal.kdl            6 families, 4 rooms — readable by hand
  full-event.kdl         55 families, 40 rooms — realistic
  tight.kdl              capacity == demand exactly
  oversubscribed.kdl     demand > capacity; things must be unplaced
  fragmented.kdl         many children opted in; many size-1 parties
  conflicted.kdl         constraints that span parties after a change
  constraint-heavy.kdl   many relations, several merge cascades
  infeasible.kdl         trips preflight C8
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
`expectedHash` and fail with a clear message when the profile moved, rather
than reporting an opaque mismatch:

```ts
test.each(goldenCases)('golden: $name', ({ solverInput, expectedHash, configHash }) => {
  if (currentConfigHash() !== configHash) {
    throw new Error(`golden: $name was recorded against a different profile — re-record with npm run test:record`)
  }
  expect(sha256(canonical(solve(solverInput, defaultConfig)))).toBe(expectedHash)
})
```

**A changed hash is not a failure. It is a question.** The test output must make
the diff readable, not just report a mismatch:

```
golden: full-event — output changed
  47 assignments identical
   3 assignments differ:
     P07  rm_0014 → rm_0009
     P12  rm_0009 → rm_0014
     P22  rm_0031 → rm_0031  (place changed within room)
  totalScore 412 → 419
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
    p => unique(p.assignments.map(a => a.personId))],

  ['no place holds two people',
    p => unique(p.assignments.map(a => a.placeId))],

  ['every assigned place exists in the solver input',
    (p, s) => p.assignments.every(a => s.places.some(pl => pl.id === a.placeId))],

  ['no room exceeds its place count',
    (p, s) => /* group by room, compare */],

  ['every party is wholly placed or wholly unplaced',
    p => /* never a partial party */],

  ['every person appears exactly once across assignments + unplaced',
    (p, s) => /* conservation of people */],

  ['every active constraint is either honoured or reported as a conflict',
    (p, s) => s.constraints.every(c => honoured(p, c) || conflicted(p, c))],

  ['no person is in two workshops in one slot',
    p => /* group by (person, slot) */],

  ['no workshop exceeds capacity',
    (p, s) => /* … */],

  ['every child-room assignment satisfies the child-group requirement',
    (p, s) => /* … */],

  ['every label names a built-in or custom definition or is reported',
    (p, s) => /* … */],

  ['a capability with a derive has no assignments',
    (p, s) => /* … */],

  ["party requirements are exactly the strictest-strength union of member families' requirement tags",
    (p, s) => /* … */],
]
```

"Conservation of people" is the most valuable and the least obvious: every person
in the solver input appears exactly once in `assignments` or once in a party listed
under `unplaced`. A person who silently vanishes — dropped by a filter, lost in a
merge — is the failure mode that is hardest to notice by eye and worst to
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
rooms, one enormous family, everyone requiring an ensuite, every child opted in,
capacity exactly equal to demand, capacity one short.

---

## 5. The constraint regression corpus

From [constraint health](08-constraint-health.md) §5. Every active or
cleared custom constraint can be a test case authored by a domain expert. It is the
same counterfactual the dashboard computes, pinned to a fixed log position.

```ts
describe('constraint corpus', () => {
  const constraints = loadConstraintFixtures()

  describe('cleared constraints must remain represented by resolver rules', () => {
    test.each(constraints.filter(c => c.clearedAt))('$description', (c) => {
  const log = loadEventLog(c.seq)
      const { plan } = derive(without(log, c), defaultConfig)
      expect(satisfies(plan, c)).toBe(true)
    })
  })

  describe('active constraints — informational health checks', () => {
    test.each(constraints.filter(c => !c.clearedAt))('$description', (c) => {
  const log = loadEventLog(c.seq)
      const { plan } = derive(without(log, c), defaultConfig)
      if (satisfies(plan, c)) {
        console.log(`✨ now satisfied without custom constraint: ${c.description}`)
      }
      // not asserted — this bucket is the backlog, not a gate
    })
  })
})
```

Cleared constraints represented by built-in rules are a hard gate: absorbing a
rule and then losing it again is a regression and must break the build.

Active constraints are informational. When one starts passing, CI prints it, and
the build output can report that three load-bearing constraints are now
satisfied.

---

## Profile tests

Cheap, and they catch the failure mode where the Worker boots and solves
wrongly:

- every entry has a non-empty `doc`;
- every `satisfiedBy` names a tag whose kind is `capability`;
- every `param` names a valid entity type;
- no alias collides with another tag or alias;
- every `attendeeFacing.control` has a renderer in `src/app/portal/controls/`;
- every tag depending on a phase is disabled when that phase is;
- `defineEvent` throws on each of the above when deliberately broken.

---

## Preflight tests

One fixture per check C1–C9, asserting the finding fires with the right
severity and names the right entities. C8's message should be asserted
verbatim, since it is the one an organiser acts on.

---

## 6. Lint rules as tests

Some parts of the determinism contract are better enforced statically.

```jsonc
{
  "overrides": [{
    "files": ["src/solver/**/*.ts", "src/derive/**/*.ts", "src/config/**/*.ts"],
    "rules": {
      "no-restricted-globals": ["error",
        { "name": "Date",   "message": "Pass eventDate in via config." },
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

These overrides extend to `src/derive/**` and `src/config/**`. Profile evaluators
(`derive`, `check`, `validFor`) run inside the solver and are bound by the same
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
the most likely way the contract degrades over six weeks of changes.

---

## 7. Integration tests

Against a real D1 in `workerd`. Fewer, chunkier, covering the paths where a bug
would be silent rather than loud.

```ts
test('the full loop: import → constraints → solve → plan → publish', async () => {
  const db = await freshDb()

  await importFamilies(db, csvFixture)           // 55 families
  await setLabels(db, labelFixture)              // LabelSet events
  const plan1 = await computePlan(db)

  await addConstraint(db, ['per_a1','per_a2'], 'rm_0014')
  const plan2 = await computePlan(db)

  expect(roomOf(plan2, ['per_a1'])).toBe('rm_0014')
  expect(movedCount(plan1, plan2)).toBeLessThan(6)   // constraints are surgical

  await publish(db, plan2.inputSeq)
  expect(await publishedCount(db)).toBe(1)
})
```

That `movedCount` assertion is worth more than it looks. It encodes the property
that makes the whole design worthwhile: **a constraint moves the constrained party and very
little else.** If a future change makes the solver chaotic — where a small input
change produces a large output change — this test catches it, and nothing else
would.

Also covered:

- **Auth**: magic link redeems exactly once; a second attempt fails; expiry
  works; rate limits bite; changing an email kills sessions.
- **Fold**: a pure test, no database. Fold a fixture log, compare against a
  hand-written expectation, then fold twice and assert identical. Persisting it is
  a separate, smaller integration test.
- **Constraint enforcement**: attempt to give two people the same place and assert
  solver-input validation fails.
- **Publication concurrency**: publishing while another plan is published fails
  the event-sequence compare-and-swap.

---

## 8. What is not tested

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
- **Load.** 150 people, three admins. There is no load.

---

## 9. Fixtures as documentation

`test/fixtures/event-logs/minimal.kdl` should be readable and hand-checkable: six
families, four rooms, one children's room, one mutual co-room request, one
`prefer_not`. Small enough that a person can work out the right answer with a
pencil and verify the solver agrees.

When someone new asks how party formation works, that fixture plus its trace is a
better answer than any prose — including this specification. Keep it small enough
that it stays true.
