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
- Fixed room decisions are applied first. Automatic placement then runs in
  rounds: configured opportunity priority descending, currently feasible room
  count ascending, bed demand descending, persisted family order ascending, and
  family ID ascending. Opportunity priority is the strongest configured weight
  for the profile's priority trait; required needs count twice as much as
  preferences.
- Each family is assigned its highest-scoring feasible room; ties use persisted
  room order and room ID. The trace records these room tie-break factors too.
  Feasible candidates and their scores are refreshed after every placement, so
  a room becoming occupied can change the next family in line.
- Preferred requirements and relations, exact fit, near fit, orphan beds, and
  scarce capabilities contribute deterministic integer score terms.
- Each automatic trace entry records the round and every family-order factor,
  the chosen room and score terms, every other feasible room in score order, and
  every rejected room with its rule ID. Fixed and unplaced outcomes have their
  own trace entries. Organisers can inspect them at
  `/organiser/accommodation/assignment/trace`.

The solver input is sorted and frozen at the boundary. Module contributions,
preflight checks, stage dependencies, outputs, traces, and diagnostics are
composed by pure functions in [`src/solver/`](../../src/solver/). Stage order is
deterministic and cycles are rejected.

## Placement cost

Placement is a deterministic greedy search. It evaluates every family/room pair
once to establish feasible candidates, then refreshes only the room whose
occupancy changed after each placement. Rules that do not declare target-room
locality use full recomputation, so the optimization cannot hide an input
dependency.

The implementation groups or reuses the following work:

- Candidate counts are recomputed from the current feasible-room sets every
  round. Updating one room's occupancy refreshes that room for each remaining
  family, rather than re-running every room check for every family.
- A placement's trace needs both the scored candidates and the per-room
  rejections. Both come from one pass; they were two.
- The family-dependent parts of a feasibility check — its `excludes`
  constraints, its requirements partitioned by strength and kind, and its room
  decision — are resolved before the room loop rather than inside it. The
  constraint filter in particular ran over every resolved constraint in the
  occasion, per candidate pair.
- Room occupancy and room membership come from one index derived from the
  `placements` map after each placement and shared by all candidate checks in
  that state. They were derived by scanning every family from the innermost
  rule.
- Bed demand per family and each family's `excludes` constraints are derived
  once per solve and memoised on the input's identity, rather than rebuilt per
  sweep.

The occupancy index is deliberately derived per sweep rather than maintained
across the stage. Per-sweep derivation is linear in the placements and cannot
drift from the placement map. `roomRemaining` and `roomFamilies` take it as an
optional argument and fall back to scanning, so a rule defined outside this
module keeps working.

Room candidates group places and capabilities once. Placement traces retain all
feasible alternatives and rejection reasons from the same evaluation used to
choose the room. Unplaced explanations share a placement context. Place
assignment uses a room-keyed lookup.
See [scale evidence](../engineering/performance-scale.md) for the completed
20k/50k cases and the remaining large-population search cost.

Preflight resolves inventory totals and capacity-per-capability once for the
whole run instead of per family, and reuses one feasibility sweep per family.

The placement stage remains deterministic and its output is covered directly.
[`test/solver/placement-equivalence.test.ts`](../../test/solver/placement-equivalence.test.ts)
pins a digest of the whole current plan and separately pins the dynamic
candidate-count tiebreak and the order factors, which the digest occasion does
not exercise.

## Closing the accommodation area

The module owns the `room-assignment.review` phase, its readiness, and the
accommodation area's closed result: `AccommodationClosed` records each family's
room and places and the unplaced families as the Worker computes them, and
`AccommodationReopened` opens the area again. The assignment board shows the
difference from the latest closed result. See
[phases](../architecture/phases.md#organiser-decisions).

## Profile and fixtures

The executable family-freizeit profile selects room inventory and room
assignment with explicit scoring weights, relation and no-bed roles, priority,
and scarce-capability penalties. The KDL fixtures in
[`test/fixtures/room-assignment/`](../../test/fixtures/room-assignment/) cover
real inventory derivation, deterministic placement, normalized
requirements, and pure-function edge cases.

Run the domain coverage gate with:

```sh
nix develop -c pnpm run test:room-assignment:coverage
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
