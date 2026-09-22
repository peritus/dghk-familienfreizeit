---
id: "003"
title: Three modules contribute the same organiser route with no composition mechanism
status: resolved
severity: build-blocking
category: module:modules
source: coherence-audit-2026-09-19
related_decisions: []
opened: 2026-09-19
---

# Three modules contribute the same organiser route with no composition mechanism

## Problem

[`modules/contract.md:143-144`](../../modules/contract.md) fails the build when "two modules contribute the same
entity kind, event type, route, or report id". But [`modules/workshops.md:256`](../../modules/workshops.md),
[`modules/workshop-rankings.md:142`](../../modules/workshop-rankings.md) and [`modules/workshop-assignment.md:295`](../../modules/workshop-assignment.md)
all contribute `/organiser/workshops`, and
[`ui/screens/workshops.md:7`](../../ui/screens/workshops.md) names all three as governing specs. No panel or slot
composition mechanism exists to reconcile this, unlike solver stages, which
[`modules/contract.md:164-167`](../../modules/contract.md) already lets multiple modules contribute to
compositionally.

## Recommendation

Either extend the existing solver-stage-style composition mechanism to
cover routes (so multiple modules can contribute panels/sections to one
route), or designate one of the three modules as the route owner with the
other two as contributors to it, and update [`modules/contract.md`](../../modules/contract.md)'s route-collision
rule to describe the exception explicitly.

## Resolution

Chose the second option (a route owner with declared contributors), because
this was a wording bug, not a missing mechanism. Investigation found the
composition mechanism this issue asked for already exists and is already
used correctly by three other modules: [`materials.md:192`](../../modules/materials.md),
[`food-preferences.md:95`](../../modules/food-preferences.md), and
[`change-notifications.md:87`](../../modules/change-notifications.md) all describe their
contributed content by its *host screen's identity in prose*, without
re-declaring a route — only a module that actually owns a distinct
top-level route (`workshops`, `room-assignment` → `/organiser/board`,
`room-inventory` → `/organiser/inventory`) names one in its Screen row.
[`application/organiser-view.md`](../../application/organiser-view.md) §1's screen inventory also treats
`/organiser/workshops` as a single row with no per-module ownership column,
and [`roadmap.md`](../../roadmap.md) M9 builds "the organiser workshop screen" (singular,
by `workshops`) while M10 describes the heatmap/fairness work as additions
to that existing screen, not a new one. So `workshop-rankings` and
`workshop-assignment` needed to read like `materials`/`food-preferences`,
not like `workshops`.

Changes made:
1. [`modules/contract.md`](../../modules/contract.md)'s `routes`, `screens` contribution-kind row now states
   the ownership rule explicitly: a module contributes a `screens` entry
   only for a route it renders as its own top-level screen; a contributing
   (non-owning) module's `ScreenDefinition` names the host screen it
   targets and carries no independent `route` value, so the collision check
   has nothing to compare for contributed content. This closes the gap at
   the type-description level, not just as a prose convention — a future
   module can't silently reintroduce this bug by setting a competing
   `route` while wording its docs correctly.
2. [`modules/workshop-rankings.md:142`](../../modules/workshop-rankings.md) reworded: the heatmap is now described
   as a panel within the workshops screen, owned by `workshops`.
3. [`modules/workshop-assignment.md:295`](../../modules/workshop-assignment.md) reworded: intake/fill/cancellations/
   fairness are now described as panels within the workshops screen, owned
   by `workshops`. "Workshop rows in the plan diff" is unchanged (unrelated
   surface).
4. [`ui/screens/workshops.md:7`](../../ui/screens/workshops.md) reworded from "Governing specs: workshops,
   workshop-rankings, and workshop-assignment" (implied co-equal ownership)
   to name `workshops` as the owning spec and the other two as contributing
   the heatmap / intake-fill-fairness data shown on it.

`modules/workshops.md:256`'s own Screen row needed no change — it is the
legitimate sole owner of `/organiser/workshops`.

Closing note, not further action: `materials`, `food-preferences`, and
`change-notifications` already relied on this same until-now-undocumented
convention for their own screens. The new `contract.md` sentence is written
generally (not workshop-specific), so it now covers those three as well —
no separate issue needed.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [modules/workshops.md](../../modules/workshops.md)
- [modules/workshop-rankings.md](../../modules/workshop-rankings.md)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
