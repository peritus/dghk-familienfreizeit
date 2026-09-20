---
id: "007"
title: Module contributions mix pure definitions with browser/Worker code
status: resolved
severity: gap
category: module:modules
source: coherence-audit-2026-09-19, spec-review-2026-09-19
related_decisions: [D26]
opened: 2026-09-19
---

# Module contributions mix pure definitions with browser/Worker code

## Problem

Module contributions ([`modules/contract.md`](../../modules/contract.md) §52 region) combine domain
registration, validation, Worker routes and application (React) components in
one registry, while [`architecture/overview.md`](../../architecture/overview.md) requires a pure shared
derive/solver boundary. Eagerly importing a single registry could pull
browser components into the Worker or Worker-only libraries into the client,
despite the strict import boundaries the architecture doc otherwise
requires.

## Recommendation

Specify separate pure, Worker and app contribution entry points, with
type-only cross-boundary references, in M2. Clarify whether "zero
dependencies" for the pure layer permits a schema library. Retain emitted
transitive-import boundary tests when real modules land — the current M0
checks cover only the implemented shell, not the eventual per-module
registries.

## Open questions

None.

## Resolution

M1 establishes the boundary used by later module composition:

- the fold, derived world, and solver remain dependency-free pure TypeScript;
- payload and profile-boundary schemas may use Zod at the validation boundary;
- KDL parsing remains isolated in the development/test event-source adapter;
- pure, Worker, and app module contributions remain separate entry points and
  are linked only by type-only contracts.

This resolves the open question in [D26](../../../decisions.md#d26--validation-boundary-and-pure-domain-core).

## Related files

- [modules/contract.md](../../modules/contract.md)
- [architecture/overview.md](../../architecture/overview.md)
