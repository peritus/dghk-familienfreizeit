# Workshop attendance

The event-backed fixed decisions, derived attendance assignment, reviews, traces,
closed results, and workshop-list projections are implemented; see
[workshop assignment](../../docs/modules/workshop-assignment.md) and
[workshop rankings](../../docs/modules/workshop-rankings.md). This spec retains
only the remaining M8 review and contract-reconciliation work.

<a id="4-assignment-policy"></a>
## Implemented assignment policy

See the [implemented attendance contract](../../docs/modules/workshop-assignment.md).

## M8 — Findings, open cases, and contract reconciliation

- Complete finding and open-case review for current and prospective programme
  and attendance contexts. Build on the delivered person-by-slot matrix and
  allocation traces; do not add a second workshop state store.
- Reconcile reservations, individual attendance cancellation, separation, and
  age-eligibility terms. Record for each term whether current behavior covers it,
  it remains active M8 work, or it needs an explicit scope decision.
- Add the remaining fixtures for capacity races, ranked-round allocation,
  cancellation, slot changes, and privacy under [D4](../../decisions.md#d4--stable-sorted-greedy-not-integer-programming),
  [D30](../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces),
  and [D31](../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops).

Acceptance: organisers can inspect automatic and explicitly fixed placements
and attendance, including findings and open-case outcomes; every blocking outcome
and allocation decision is traceable; each workshop has at most one placement
and each person has at most one assignment per overlapping period; and every
reconciled contract term has a recorded disposition. Fixed-decision semantics and
read-only review are implemented. Whether organisers need UI controls to author
or clear fixed attendance/placement decisions is an open investigation in
[issue 050](../issues/open/050-workshop-fixed-decision-authoring.md).
