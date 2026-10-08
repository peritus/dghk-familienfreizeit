# UI-12 — Workshops

The current organiser workshop routes, authoring foundation, programme and
allocation reviews, local-first behavior, and browser printing are documented in
[the implemented organiser view](../../../docs/application/organiser-view.md),
[official-workshop module](../../../docs/modules/official-workshops.md),
[scheduling and attendance modules](../../../docs/modules/workshop-scheduling.md),
and the
[frontend contract](../../../docs/ui/frontend.md). This spec contains only the
remaining UI requirements.

## M8 — Review and contract reconciliation

- Complete finding and open-case review for the current and prospective
  programme and allocation. Build on the delivered person-by-slot matrix and
  traces without adding another workshop state store; see the
  [attendance requirements](../../modules/workshop-assignment.md) and [M8](../../roadmap.md#m8--organiser-authored-workshop-programme).
- Reconcile the contract terms for reservations, individual attendance
  cancellation, separation, and age eligibility. Record whether each term is
  implemented, remains active M8 work, or requires an explicit scope decision.

Cancellation authoring and its labelled history view are
[accepted but deferred](../../deferred-ideas/workshop-cancellation.md).

Demand-aware scheduling remains deferred in the
[accepted deferred idea](../../deferred-ideas/demand-aware-workshop-scheduling.md),
which also owns the unresolved policy for how a reviewed result responds to later
ranking edits.

Whether the organiser UI needs controls to author or clear fixed attendance and
placement decisions is not accepted M8 scope; see
[issue 050](../../issues/open/050-workshop-fixed-decision-authoring.md).

Acceptance: organisers can inspect automatic and explicitly fixed placements and attendance with finding
and open-case outcomes; trace every blocking outcome and allocation decision;
and record a disposition for each reconciled contract term. Existing capacity,
placement, and attendance invariants remain governed by
[D4](../../../decisions.md#d4--stable-sorted-greedy-not-integer-programming),
[D30](../../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces),
and [D31](../../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops).
