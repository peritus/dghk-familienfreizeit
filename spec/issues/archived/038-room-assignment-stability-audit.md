---
id: "038"
title: Room assignment stability audit
status: resolved
severity: contract-contradiction
category: module:room-assignment
source: room-assignment solver review
related_decisions: [D4]
related_milestones: []
opened: 2026-10-01
---

# Room assignment stability audit

## Problem

Room placement must be reproducible from the current derived world. A solver
path that accepts a prior plan as an implicit placement input makes the result
depend on execution history rather than on the event log and profile
configuration.

## Resolution

The room-assignment stage now recomputes all placements from its current solver
input and then applies only its deterministic bounded repair step. It accepts
no prior plan and does not retain placements from an earlier solve. The plan
digest and candidate-order tests cover repeated-solve determinism and stable
tie-breaking.

## Related files

- [decisions.md#d4](../../../decisions.md#d4--stable-sorted-greedy-with-bounded-repair-not-integer-programming)
- [docs/modules/room-assignment.md](../../../docs/modules/room-assignment.md)
- [modules/room-assignment.md](../../modules/room-assignment.md)
- [test/solver/placement-equivalence.test.ts](../../../test/solver/placement-equivalence.test.ts)
