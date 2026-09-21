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
`ModuleContributions` type implements six: `entity_kinds`, `events`,
`label_keys`, `trait_roles`, `routes`, `reports`. The other thirteen have no
executable path — a module cannot contribute a world summary, a preflight
check, a solver stage, or a screen, regardless of what `defineModule` returns
for them.

## Evidence

The M4 roadmap entry ([`roadmap.md`](../../roadmap.md)) requires "buildings,
rooms, beds, places, designations, capacity, retirement, room labels, **and
inventory world summaries**" and "the organiser inventory screen and
inventory report contribution." `world_summaries` and `screens` are both
outside the six kinds that currently compose into anything — `reports`
exists as a contribution but nothing consumes it either (no report-rendering
path exists yet), so even that one is a registered-but-unconsumed shape.

This is the direct sibling of [issue 021](../archived/021-module-owned-entity-fold-boundary.md):
that issue closed the gap for `entity_kinds`/`events` specifically because
M4's inventory events were the immediate blocker. The remaining thirteen
kinds have the identical problem — declared in the module contract,
unimplemented in `defineOccasionProfile` — just not yet in the way of
anything, because no module has tried to use them.

## Recommendation

Extend `ModuleContributions` and `defineOccasionProfile`'s composition
incrementally, driven by what M4 (and the modules immediately after it)
actually need, rather than building all thirteen kinds speculatively ahead of
a real caller — the same reasoning [issue 021](../archived/021-module-owned-entity-fold-boundary.md)'s
resolution used ("built and proven against a synthetic module... not against
a real inventory module"). `world_summaries` is the one M4's own roadmap
entry names explicitly and should come first. `preflight_checks` is likely
needed once room-inventory's "invalid-reference tests" acceptance criterion
is implemented. The rest (`stages`, `rules`, `solver_input`, `release_scopes`,
`change_kinds`, `screens`, `family_controls`, `emails`, `fixtures`,
`event_mappings`) belong to later milestones per the module catalogue and
should stay unimplemented until a milestone actually needs them.

## Open questions

None.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [roadmap.md](../../roadmap.md)
