---
id: "003"
title: Three modules contribute the same organiser route with no composition mechanism
status: open
severity: build-blocking
category: module:modules
source: coherence-audit-2026-09-19
related_decisions: []
related_files:
  - ../modules/contract.md
  - ../modules/workshops.md
  - ../modules/workshop-rankings.md
  - ../modules/workshop-assignment.md
  - ../ui/screens/workshops.md
opened: 2026-09-19
---

# Three modules contribute the same organiser route with no composition mechanism

## Problem

`../modules/contract.md:143-144` fails the build when "two modules contribute the same
entity kind, event type, route, or report id". But `../modules/workshops.md:256`,
`../modules/workshop-rankings.md:142` and `../modules/workshop-assignment.md:295`
all contribute `/organiser/workshops`, and
`../ui/screens/workshops.md:7` names all three as governing specs. No panel or slot
composition mechanism exists to reconcile this, unlike solver stages, which
`../modules/contract.md:164-167` already lets multiple modules contribute to
compositionally.

## Recommendation

Either extend the existing solver-stage-style composition mechanism to
cover routes (so multiple modules can contribute panels/sections to one
route), or designate one of the three modules as the route owner with the
other two as contributors to it, and update `../modules/contract.md`'s route-collision
rule to describe the exception explicitly.

## Open questions

1. Add a composition mechanism for shared routes, or make one module the
   route owner and the others contributors to it?
