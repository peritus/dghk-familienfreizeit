---
id: "036"
title: Workshop capacity reduction policy
status: needs-decision
severity: contract-contradiction
category: module:workshops
source: workshop prototype alignment
related_decisions: [D16, D28]
related_milestones: [M9, M10]
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

## Related files

- [official workshops](../../modules/official-workshops.md)
- [workshop attendance](../../modules/workshop-assignment.md)
- [release control](../../application/release-control.md)
- [workshops UI](../../ui/screens/workshops.md)
