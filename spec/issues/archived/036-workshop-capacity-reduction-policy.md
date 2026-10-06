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
attendance requires a product decision. The event log and derived allocation
must not silently displace people or silently leave an impossible allocation.

## Evidence

The workshop contracts need one consistent rule for reductions affecting:

- assigned attendance produced by the solver;
- live sign-up participants;
- reviewed or communicated allocations; and
- prospective draft changes.

## Recommendation

Until this issue is resolved, reject a capacity reduction that would make the
current attendance exceed the new capacity. Keep the editor's alternatives
visible as an unresolved issue rather than choosing a policy in the solver.

## Open questions

1. Preserve existing names and block new admission while showing over-capacity.
2. Recompute and displace or reassign affected people using fairness rules.
3. Select the behavior through occasion-profile policy.

## Resolution

Resolved as [D30](../../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces):
option 1. A capacity reduction that would put current attendance (solver
assignments, live sign-ups, or fixed attendance decisions) over the new
capacity is rejected outright; existing attendance names are preserved
unchanged and no recomputation, displacement, or profile-configurable policy
is applied. `official-workshops`' `validateWorkshop` already enforced this as
an interim rule; it now cites D30 instead of this issue.

## Related files

- [official workshops](../../modules/official-workshops.md)
- [workshop attendance](../../modules/workshop-assignment.md)
- `release control`
- [workshops UI](../../ui/screens/workshops.md)
