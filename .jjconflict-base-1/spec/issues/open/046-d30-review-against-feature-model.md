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

[D30](../../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces)
chose that a capacity reduction below current attendance is rejected outright.
Its second rejected alternative, selecting the reduction behavior through
occasion-profile policy, gives two reasons:

> Only one profile is active today, so the flexibility has no consumer, and
> branching solver behavior on a profile-selected policy value risks becoming the
> kind of runtime-supplied executable rule occasion configuration must not contain.

The [feature contract](../../architecture/features.md) now lets the profile
select among fixed, code-owned features and lets a deployment switch their
availability. Read literally, D30's second reason argues against that: profile
data now chooses among code-owned options and changes what the application does.
The feature contract states the distinction it relies on — selection changes
whether a capability is offered, never how a result is computed — but D30 itself
does not draw that line, so it can be read as precedent against the feature
model, or the feature model as precedent for reopening D30.

## Evidence

- The feature contract forbids solver parameters, rules, weights, and policy
  values in a feature definition
  ([features](../../architecture/features.md) §2).
- [D11](../../../decisions.md#d11--resolver-mechanisms-and-vocabulary-live-in-code-organiser-values-live-in-the-event-log)
  and [D12](../../../decisions.md#d12--weights-live-in-code) already allow profile
  data to select among fixed, code-owned options while forbidding executable
  predicates.
- The chosen D30 behavior is enforced by `validateWorkshop` in
  `official-workshops` and is not affected by the feature contract.

## Recommendation

Keep D30's chosen behavior unchanged and restate its second rejected alternative
so that it rests on what actually distinguishes it: capacity-reduction policy
would change how attendance is computed, which the solver contract keeps in code;
selecting a code-owned enum is not itself an executable rule, as D11 and D12
already allow. The "no consumer" reason stays as stated.

## Open questions

1. Restate D30's rationale as recommended, leaving the decision unchanged.
2. Leave D30 verbatim and rely on the feature contract's own §2 statement.
3. Reopen the decision itself and make capacity-reduction behavior a
   profile-selected, code-owned policy enum, which needs a consumer and a solver
   contract change.

## Dependencies

This issue has no prerequisite. It does not block
[043 — module-contributed feature model](../archived/043-feature-model.md), whose
contract carries no solver policy values.

## Related files

- [decisions.md](../../../decisions.md)
- [architecture/features.md](../../architecture/features.md)
- [043 — module-contributed feature model](../archived/043-feature-model.md)
- [archived 036 — workshop capacity reduction policy](../archived/036-workshop-capacity-reduction-policy.md)
