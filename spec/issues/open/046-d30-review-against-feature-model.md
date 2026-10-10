---
id: "046"
title: Review D30's rejection of profile-selected policy against the feature model
status: needs-decision
severity: gap
category: module:workshops
source: decision review requested while resolving issue 043
related_decisions: [D11, D12, D30]
related_milestones: [M8]
opened: 2026-10-06
---

# Review D30's rejection of profile-selected policy against the feature model

## Problem

[D30](../../../decisions.md#d30--workshop-capacity-is-solver-input-festlegen-snapshots-the-result)
accepts capacity edits and treats capacity as shared solver input. Automatic
attendance is recomputed from current inputs, while explicit sign-ups and fixed
attendance remain unchanged. It rejects profile-selected capacity behavior
because the shared solver contract should not vary by occasion profile and no
current profile needs that flexibility.

The [feature contract](../../architecture/features.md) lets the profile select
among fixed, code-owned features and lets a deployment switch their
availability. Feature availability determines whether a capability is offered;
D30 concerns how workshop attendance is computed. The remaining question is
whether this capacity rule should remain shared across profiles or become an
explicit code-owned profile option, not whether feature selection itself changes
solver behavior.

## Evidence

- The feature contract forbids solver parameters, rules, weights, and policy
  values in a feature definition
  ([features](../../architecture/features.md) §2).
- [D11](../../../decisions.md#d11--resolver-mechanisms-and-vocabulary-live-in-code-organiser-values-live-in-the-event-log)
  and [D12](../../../decisions.md#d12--weights-live-in-code) already allow profile
  data to select among fixed, code-owned options while forbidding executable
  predicates.
- D30's capacity behavior is enforced in proposal admission and ordinary solver
  derivation; it does not depend on feature availability.

## Recommendation

Keep the shared D30 behavior and its distinction from feature availability. If
an occasion-profile option is ever proposed, define it as a code-owned enum with
a concrete consumer and amend the solver contract explicitly; profile data must
not supply executable rules. Today there is no consumer for the added variation.

## Open questions

1. Keep D30 shared across profiles and clarify its boundary from feature
   availability.
2. Add an explicit code-owned profile option for capacity-reduction behavior,
   which needs a concrete consumer and a solver contract change.

## Dependencies

This issue has no prerequisite. It does not block
[043 — module-contributed feature model](../archived/043-feature-model.md), whose
contract carries no solver policy values.

## Related files

- [decisions.md](../../../decisions.md)
- [architecture/features.md](../../architecture/features.md)
- [043 — module-contributed feature model](../archived/043-feature-model.md)
- [archived 036 — workshop capacity reduction policy](../archived/036-workshop-capacity-reduction-policy.md)
