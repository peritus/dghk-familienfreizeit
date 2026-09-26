# Room assignment

The executable `room-assignment` module is implemented in
[`src/modules/room-assignment/index.ts`](../../src/modules/room-assignment/index.ts)
and composed by the occasion profile. It consumes the derived event-log world
and contributes immutable solver input, one deterministic placement stage,
hard rules, and a requirement preflight check. No placement result is persisted.

## Verified business logic

- Families are the indivisible placement units.
- Staff and blocked rooms are excluded from candidates.
- Bed demand counts family members except those carrying the configured no-bed
  property; no-bed members receive the family room and a null place.
- Required capabilities, structural sole-occupancy requirements, exclusions,
  and required keep-apart relations reject rooms.
- Preferred requirements and relations, exact fit, near fit, orphan beds, and
  scarce capabilities contribute deterministic integer score terms.
- A previous feasible placement is retained before forced placement, greedy
  scoring, and bounded pairwise repair are attempted.
- All families are processed deterministically and every unplaced family gets a
  blocking-rule diagnostic and trace entry.

The solver input is sorted and frozen at the boundary. Module contributions,
preflight checks, stage dependencies, outputs, traces, and diagnostics are
composed by pure functions in [`src/solver/`](../../src/solver/). Stage order is
deterministic and cycles are rejected.

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

The gate currently reports 100% statements, functions, and lines, with the
accepted branch threshold enforced in `vitest.config.ts`.

## Remaining scope

The organiser board, placement-decision controls, reports, plan diff, and
communications are not part of this verified business-logic slice. They must
continue to use event-backed labels and derived plans when implemented.
