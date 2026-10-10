# Workshop attendance

The label-based fixed attendance decisions and authoring controls, derived
attendance assignment, reviews, traces, closed results, and workshop-list
projections are implemented; see
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
- Reconcile reservations, individual attendance cancellation, and separation.
  Record for each term whether current behavior covers it,
  it remains active M8 work, or it needs an explicit scope decision.
- Add the remaining fixtures for capacity races, ranked-round allocation,
  slot changes, and privacy under [D4](../../decisions.md#d4--stable-sorted-greedy-not-integer-programming),
  [D30](../../decisions.md#d30--workshop-capacity-is-solver-input-festlegen-snapshots-the-result),
  and [D31](../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops).

Acceptance: organisers can inspect automatic and explicitly fixed placements
and attendance, including findings and open-case outcomes; every blocking outcome
and allocation decision is traceable; each workshop has at most one placement
and automatic assignments do not overlap for a person. A fixed attendance
decision remains assigned despite eligibility, capacity, overlap, leadership,
participation-mode, or automatic per-person-limit conflicts, and each conflict
is traceable; cancelled, removed, and unscheduled workshops do not produce
attendance. Every reconciled contract term has a recorded disposition. Fixed attendance is
represented through generic label pairs and can be authored, cleared, and
reviewed in allocation. The separate open question for authoring fixed workshop
placements is tracked in [issue 050](../issues/open/050-workshop-fixed-decision-authoring.md).
