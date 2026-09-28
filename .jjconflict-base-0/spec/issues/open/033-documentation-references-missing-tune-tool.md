---
id: "033"
title: Solver tuning documentation references a missing command
status: open
severity: gap
category: tooling
source: semantic-coherence-sweep-after-fix
related_decisions: [D12]
related_milestones: [M5, M6]
opened: 2026-09-25
---

# Solver tuning documentation references a missing command

## Problem

Binding decisions and deployment guidance instruct developers to export an event
log and run `npm run tune`, but the repository has no `tune` package script, no
`scripts/tune.ts`, and no `tsx` dependency. The documented solver-weight tuning
workflow therefore cannot be executed or verified.

The gap is future-facing because solver and allocation milestones are not yet
implemented, but the current documentation presents the command as an available
development procedure.

## Evidence

- D12 names `npm run tune` as the tuning workflow; see
  [`decisions.md`](../../../decisions.md) lines 214–219.
- [`deployment.md`](../../engineering/deployment.md) lines 142–154 and 357
  instruct the operator to run the command.
- [`package.json`](../../../package.json) has no `tune` script.
- The repository's `scripts/` directory contains bundle and documentation
  checkers but no tuning implementation.
- [`frontend.md`](../../ui/frontend.md) line 78 and
  [`architecture/overview.md`](../../architecture/overview.md) line 329 refer
  to `scripts/tune.ts` as if it exists.

## Recommendation

At the first solver-weight milestone, either implement the documented offline
tuning command with deterministic inputs, output, and dependency boundaries, or
mark all references explicitly as planned tooling until that milestone lands.
Add a smoke test that verifies the command exists and produces the documented
trade-off table before retaining it in deployment instructions.

## Open questions

None; implementation shape can be finalized with the solver milestone's active
weight and reproducibility contract.

## Related files

- [decisions.md](../../../decisions.md)
- [engineering/deployment.md](../../engineering/deployment.md)
- [ui/frontend.md](../../ui/frontend.md)
- [architecture/overview.md](../../architecture/overview.md)
- [package.json](../../../package.json)
