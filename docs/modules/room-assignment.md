# Room assignment

The executable `room-assignment` module is implemented in
[`src/modules/room-assignment/index.ts`](../../src/modules/room-assignment/index.ts)
and composed by the occasion profile. It consumes the derived event-log world
and contributes immutable solver input, one deterministic placement stage,
hard rules, and a requirement preflight check. No placement result is persisted.

## Verified business logic

- Families are the indivisible placement units.
- Blocked rooms are excluded from candidates; room status is the profile-backed
  `active`/`blocked` property.
- Bed demand counts family members except those carrying the configured no-bed
  property; no-bed members receive the family room and a null place.
- Required capabilities, structural sole-occupancy requirements, exclusions,
  and required keep-apart relations reject rooms.
- Preferred requirements and relations, exact fit, near fit, orphan beds, and
  scarce capabilities contribute deterministic integer score terms.
- A previous feasible placement is retained before forced placement, greedy
  scoring, and bounded pairwise repair are attempted.
- All families are processed deterministically. Placement traces include the
  selected score terms, rejected alternatives, and runners-up; unplaced families
  get a blocking-rule diagnostic and closest near-miss trace.

The solver input is sorted and frozen at the boundary. Module contributions,
preflight checks, stage dependencies, outputs, traces, and diagnostics are
composed by pure functions in [`src/solver/`](../../src/solver/). Stage order is
deterministic and cycles are rejected.

## Placement cost

Placement is a greedy search: each family is scored against each candidate room,
so cost tracks families times rooms and grows faster than the event log does.
That product is the algorithm; what used to sit on top of it was rescanning.

Four things are now resolved once per sweep instead of once per candidate room,
and the measured effect was an order of magnitude:

- Each family's feasible-room count, which orders the families, is computed once
  per family. It was previously computed twice per comparison inside the sort's
  comparator, so ordering a hundred families meant thousands of full room
  sweeps.
- A placement's trace needs both the scored candidates and the per-room
  rejections. Both come from one pass; they were two.
- The family-dependent parts of a feasibility check — its `excludes`
  constraints, its requirements partitioned by strength and kind, and its room
  decision — are resolved before the room loop rather than inside it. The
  constraint filter in particular ran over every resolved constraint in the
  occasion, per candidate pair.
- Room occupancy and room membership come from an index derived from the
  `placements` map at the start of each sweep. They were derived by scanning
  every family, from the innermost rule.

The occupancy index is deliberately derived per sweep rather than maintained
across the stage. `place` snapshots `placements` and the repair pass mutates and
rolls it back, so an incrementally maintained index would have to be rolled back
in step with it; per-sweep derivation is linear in the placements and cannot
drift. `roomRemaining` and `roomFamilies` take it as an optional argument and
fall back to scanning, so a rule defined outside this module keeps working.

Preflight resolves inventory totals and capacity-per-capability once for the
whole run instead of per family, and reuses one feasibility sweep per family.

None of this changes a placement, a score, a rejection or a trace entry.
[`test/solver/placement-equivalence.test.ts`](../../test/solver/placement-equivalence.test.ts)
pins a digest of the whole plan — both passes, including retention and repair —
against the value recorded before the change, and separately pins the
candidate-count tiebreak, which the digest occasion does not exercise.

## Profile and fixtures

The executable family-freizeit profile selects room inventory and room
assignment with explicit scoring weights, relation and no-bed roles, priority,
scarce-capability penalties, and repair-pass limits. The KDL fixtures in
[`test/fixtures/room-assignment/`](../../test/fixtures/room-assignment/) cover
real inventory derivation, deterministic placement, retention, normalized
requirements, and pure-function edge cases.

Run the domain coverage gate with:

```sh
nix develop -c npm run test:room-assignment:coverage
```

The current gate reports 99.77% statements, 87.38% branches, 100% functions,
and 99.73% lines. The accepted 98/80 thresholds are enforced in
`vitest.config.ts`.

The organiser review projection and draft pipeline are covered by the focused
assignment-review, organiser-state, worker, and route tests. Together with the
coverage gate, these checks verify the board/print parity, fixed-assignment
diagnostics, local draft derivation, apply/discard behavior, and selected-module
route registration.

## Organiser review surface

The selected module contributes the `/organiser/accommodation/assignment` surface. It consumes the
shared organiser prospective world and the deterministic `room-assignment` solver
section. The board includes a compact browser-printable projection of the current
assignment, including room occupancy, summary metrics, unplaced families, and
diagnostic findings. Family and room configuration screens stage ordinary events
through the shared organiser reducer, so unapplied drafts are visible to the board
and its print output.

The board's fixed-assignment action writes the paired generic `needs` and
`provides` labels `${family_id}_room` through the shared organiser draft
pipeline. The solver keeps those assignments ahead of automatic placement;
capacity or requirement violations remain visible as `fixed-invalid`
diagnostics instead of dropping the assignment. Removing the action clears both
labels. Plan comparison, release control, and communication remain later scope.
