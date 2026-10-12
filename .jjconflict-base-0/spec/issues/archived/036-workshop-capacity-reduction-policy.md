---
id: "036"
title: Workshop capacity reduction policy
status: resolved
severity: contract-contradiction
category: module:workshops
source: workshop prototype alignment
related_decisions: [D30]
related_milestones: [M8]
opened: 2026-09-29
---

# Workshop capacity reduction policy

## Problem

The workshop editor allows capacity changes, but reducing capacity below live
attendance requires a product decision. The event log keeps explicit attendance
as input while automatic attendance is recomputed by the solver.

## Evidence

The workshop contracts need one consistent rule for reductions affecting:

- assigned attendance produced by the solver;
- live sign-up participants;
- reviewed or communicated allocations; and
- prospective draft changes.

## Recommendation

The resolution must distinguish explicit sign-ups and fixed attendance from
solver-assigned attendance, and distinguish recomputing the current result from
the snapshot stored when a plan is *festgelegt*.

## Open questions

1. Preserve existing names and block new admission while showing over-capacity.
2. Recompute and displace or reassign affected people using fairness rules.
3. Select the behavior through occasion-profile policy.

## Resolution

Resolved as [D30](../../../decisions.md#d30--workshop-capacity-is-solver-input-festlegen-snapshots-the-result):
capacity edits are accepted. Each derivation recomputes solver-assigned
attendance from current inputs and capacity; automatic assignments may move to
another ranked workshop or become unassigned. Explicit sign-ups and
organiser-authored fixed attendance are not rewritten, and any resulting
over-capacity state remains visible. *Festlegen* stores a snapshot at its event
prefix; later edits recompute the current result without changing that snapshot.

## Related files

- [official workshops](../../../docs/modules/official-workshops.md)
- [workshop attendance](../../modules/workshop-assignment.md)
- [phase and snapshot behavior](../../../docs/architecture/phases.md)
- `release control`
- [workshops UI](../../ui/screens/workshops.md)
