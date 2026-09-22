---
id: "023"
title: ModuleContributions is missing most of the contract's contribution kinds
status: open
severity: gap
category: kernel
source: M4 readiness assessment
related_decisions: []
related_milestones: [M2, M4, M5, M9, M10, M11, M12, M13, M14]
opened: 2026-09-21
---

# ModuleContributions is missing most of the contract's contribution kinds

## Problem

[`modules/contract.md`](../../modules/contract.md) defines the contribution
surface a selected module may provide. Its `ModuleContributions` interface
declares eighteen direct fields, while `src/config/define.ts`'s
`ModuleContributions` type currently implements only eight:
`entity_kinds`, `events`, `label_keys`, `trait_roles`, `routes`, `reports`,
`world_summaries`, and `world_checks`.

The ten direct fields declared by the contract but absent from the runtime type
are `solver_input`, `stages`, `rules`, `preflight_checks`, `release_scopes`,
`change_kinds`, `screens`, `family_controls`, `emails`, and `fixtures`. A module
cannot contribute any of those through `defineOccasionProfile`, regardless of
what its specification declares.

The contract's contribution-kind table also describes `event_mappings` and
`typed_contributions`, but they are not fields on the interface at all. The
repository therefore needs to decide whether those are deliberately internal
composition boundaries or additional typed API fields. This is a separate
contract-shape mismatch from the ten absent direct fields.

## Evidence

The M4 roadmap entry ([`roadmap.md`](../../roadmap.md#m4--inventory-and-real-occasion-data)) requires "buildings,
rooms, beds, places, capacity, retirement, room labels, **and
inventory world summaries**" and "the organiser inventory screen and
inventory report contribution." `world_summaries` and `world_checks` were
added and wired into `derive` as kernel work landed for M3 (`config: compile
M3 resolver and world contributions`), closing the part of this gap M4's
roadmap entry names explicitly. `screens` remains unimplemented — correctly:
[issue 018](018-m7-organiser-surfaces-depend-on-later-milestones.md) and
[issue 019](019-module-delivery-needs-surface-staging.md) cover whether M4
owes a renderable organiser screen at all, or only a domain contract that M7
later renders; that question is process/milestone-ordering, not this issue's
to resolve. `reports` still exists as a contribution but nothing consumes it
either (no report-rendering path exists yet), so it remains a
registered-but-unconsumed shape.

This is the direct sibling of [issue 021](../archived/021-module-owned-entity-fold-boundary.md):
that issue closed the gap for `entity_kinds`/`events` specifically because
M4's inventory events were the immediate blocker; [issues 022](../archived/022-module-event-authorization-contribution-gap.md)
and [024](../archived/024-module-fold-lifecycle-gap.md) later closed the
authorization and lifecycle gaps within those same two kinds. The remaining
ten direct kinds have the same problem this issue originally described —
declared in the module contract, unimplemented in `defineOccasionProfile` —
but they are not all equally urgent. No selected module can use them until the
corresponding consumer and composition checks exist.

## Recommendation

Extend `ModuleContributions` and `defineOccasionProfile`'s composition
incrementally, driven by what M4 (and the modules immediately after it)
actually need, rather than building all ten absent direct fields speculatively ahead of
a real caller — the same reasoning [issue 021](../archived/021-module-owned-entity-fold-boundary.md)'s
resolution used ("built and proven against a synthetic module... not against
a real inventory module"). `preflight_checks` is the next one likely needed,
once room-inventory's "invalid-reference tests" acceptance criterion is
implemented — but only once `solve()`'s preflight step exists to consume it
(M5); wiring the contribution kind ahead of that consumer would be
unverifiable dead code, so it should wait for a real caller on both ends, not
just the module side. `screens` should wait for [018](018-m7-organiser-surfaces-depend-on-later-milestones.md)/[019](019-module-delivery-needs-surface-staging.md)
to settle which milestone owns rendering it. The rest (`stages`, `rules`,
`solver_input`, `release_scopes`, `change_kinds`, `family_controls`, `emails`,
`fixtures`) belong to later milestones per the module catalogue and should stay
unimplemented until a milestone actually needs them. Resolve the separate
`event_mappings`/`typed_contributions` question at the same contract review so
the table and interface do not continue to describe different API shapes.

## Open questions

None.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [roadmap.md](../../roadmap.md)
