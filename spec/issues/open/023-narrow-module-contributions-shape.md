---
id: "023"
title: Module contribution API still has contract gaps
status: open
severity: gap
category: kernel
source: M4 readiness assessment
related_decisions: []
related_milestones: [M12, M13, M14]
opened: 2026-09-21
---

# Module contribution API still has contract gaps

## Problem

[`modules/contract.md`](../../modules/contract.md) describes a broader module
contribution API than the runtime currently exposes in
[`ModuleContributions`](../../../src/config/define.ts#L209-L243). The runtime
already supports `family_controls`, `phases`, and `closed_results`; they are not
remaining gaps. It still has no fields for `event_mappings`,
`typed_contributions`, `change_kinds`, `emails`, or `fixtures`.

Some existing fields also expose narrower shapes than the contract describes:
`routes` carries only a route string, `screens` currently allows organiser
screens, and `reports` carries only an id. The contract describes worker route
handlers, organiser or family screens, and report definitions with audience and
sensitivity. The runtime and contract therefore need to be reconciled at those
boundaries as well.

## Evidence

- `family_controls` is validated during profile composition and consumed by the
  family-preferences module. `phases` and `closed_results` are validated and
  consumed by the phase configuration. These are implemented in
  [`define.ts`](../../../src/config/define.ts#L542-L552) and
  [`phases.ts`](../../../src/config/phases.ts#L58-L72).
- M12 names profile contribution registration and fixtures as active-profile
  integration requirements. M13 owns the remaining report catalogue, including
  differences from a fixed result. M14 owns hosted authentication email
  delivery; module notification contributions remain deferred.
- [Issue 024](../archived/024-module-fold-lifecycle-gap.md) records that
  `event_mappings` is unnecessary until a real module needs declarative identity
  field mapping. No current consumer has established the runtime shape for
  `typed_contributions` either.

## Recommendation

Add each missing contribution at its first active consumer rather than adding
unused fields speculatively: fixture contracts with M12 integration, any needed
change-kind API with the M13 comparison/report consumer, and email contributions
only if the active M14 behavior requires module-owned email kinds. Add
`event_mappings` and `typed_contributions` when a real module needs them, and
resolve whether routes, screens, and reports carry full definitions or registry
references in the same contract review. Keep this issue open until those runtime
and contract shapes agree.

## Open questions

1. Should `event_mappings` and `typed_contributions` be explicit profile-facing
   contribution fields, or internal composition boundaries?
2. Should route, screen, and report contributions carry executable/typed
   definitions in `ModuleContributions`, or reference definitions registered
   elsewhere?

## Related files

- [modules/contract.md](../../modules/contract.md)
- [roadmap.md](../../roadmap.md)
- [engineering/testing.md](../../engineering/testing.md)
