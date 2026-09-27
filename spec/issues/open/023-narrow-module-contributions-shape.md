---
id: "023"
title: ModuleContributions is missing most of the contract's contribution kinds
status: open
severity: gap
category: kernel
source: M4 readiness assessment
related_decisions: []
related_milestones: [M2, M5, M6, M7, M8, M9, M10, M11, M12, M14]
opened: 2026-09-21
---

# ModuleContributions is missing most of the contract's contribution kinds

## Problem

[`modules/contract.md`](../../modules/contract.md) defines the contribution
surface a selected module may provide. The first consumers now exist, but the
contract and runtime still need to stay aligned as each new contribution kind is
introduced.

The remaining direct fields absent from the runtime type are `release_scopes`,
`change_kinds`, `family_controls`, `emails`, and `fixtures`. A module cannot
contribute those through `defineOccasionProfile` until their real consumers exist.

The contract's contribution-kind table also describes `event_mappings` and
`typed_contributions`, but they are not fields on the interface at all. The
repository therefore needs to decide whether those are deliberately internal
composition boundaries or additional typed API fields. This is a separate
contract-shape mismatch from the ten absent direct fields.

## Evidence

The inventory slice requires "buildings,
rooms, beds, places, capacity, retirement, room labels, **and
inventory world summaries", and the organiser inventory screen. Its report
contribution is consumed by the report host in M11 rather than being an M5
acceptance requirement. The end-to-end rule in [issue 019](../archived/019-module-delivery-needs-surface-staging.md)
still requires each intended audience's surface to be usable in its owning
milestone. Other fields remain deferred until their first real caller exists.

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

Extend `ModuleContributions` and `defineOccasionProfile` incrementally at the
first real consumer. Add solver fields with the solver/room-assignment slice,
screen and family-control fields with the application slices, release and
change fields with release control, reports with the report host, and email
fields only for active authentication email behavior. Do not add unused fields
speculatively. Resolve `event_mappings` and `typed_contributions` during the
same contract review as either internal composition structures or explicit API
fields.

## Open questions

None.

## M5 progress

The first real screen consumer is now implemented: `ModuleContributions.screens`
registers the selected module's organiser route, the composition layer checks
screen-route collisions, and the worker screen registry exposes the selected
screen. State-aware event invariant validation is also available to module event
contributions because the inventory fold needs parent and uniqueness checks.

The issue remains open for the unused contribution kinds: release scopes, change
kinds, family controls, emails, fixtures as a typed composition contract, and the unresolved
`event_mappings`/`typed_contributions` API decision. They should be added only with
their first real consumers.

## M6 progress

Room assignment now consumes the existing solver contribution fields and registers
two organiser screens plus the first real module report identifier. The report is a
module-owned current-state projection; the generic audience-aware report host and
release contribution fields remain later consumers.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [roadmap.md](../../roadmap.md)
