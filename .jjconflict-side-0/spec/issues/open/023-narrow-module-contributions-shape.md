---
id: "023"
title: ModuleContributions is missing most of the contract's contribution kinds
status: open
severity: gap
category: kernel
source: M4 readiness assessment
related_decisions: []
opened: 2026-09-21
---

# ModuleContributions is missing most of the contract's contribution kinds

## Problem

[`modules/contract.md`](../../modules/contract.md) §3.1 defines nineteen
contribution kinds a module may carry: `entity_kinds`, `events`,
`event_mappings`, `label_keys`, `trait_roles`, `solver_input`, `stages`,
`rules`, `preflight_checks`, `world_summaries`, `world_checks`,
`release_scopes`, `change_kinds`, `routes`, `screens`, `family_controls`,
`reports`, `emails`, `fixtures`. `src/config/define.ts`'s
`ModuleContributions` type implements eight: `entity_kinds`, `events`,
`label_keys`, `trait_roles`, `routes`, `reports`, `world_summaries`,
`world_checks`. The other eleven have no executable path — a module cannot
contribute a preflight check, a solver stage, or a screen, regardless of what
`defineModule` returns for them.

## Evidence

The M4 roadmap entry ([`roadmap.md`](../../roadmap.md)) requires "buildings,
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
eleven kinds have the identical problem this issue originally described —
declared in the module contract, unimplemented in `defineOccasionProfile` —
just not yet in the way of anything, because no module has tried to use them.

## Recommendation

Extend `ModuleContributions` and `defineOccasionProfile`'s composition
incrementally, driven by what M4 (and the modules immediately after it)
actually need, rather than building all eleven kinds speculatively ahead of
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
`fixtures`, `event_mappings`) belong to later milestones per the module
catalogue and should stay unimplemented until a milestone actually needs
them.

## Open questions

None.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [roadmap.md](../../roadmap.md)
