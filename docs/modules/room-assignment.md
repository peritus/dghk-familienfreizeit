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

## Organiser review surface

The selected module contributes the read-only `/organiser/board` and
`/organiser/reports` surfaces. Both consume the shared organiser prospective world
and the deterministic `room-assignment` solver section; the report is a compact
browser-printable projection of the board. Family and room configuration screens
stage ordinary events through the shared organiser reducer, so unapplied drafts are
visible to both review surfaces.

Placement overrides, plan comparison, release control, and communication remain
later scope. No placement result, report snapshot, or organiser decision record is
persisted by this module.
