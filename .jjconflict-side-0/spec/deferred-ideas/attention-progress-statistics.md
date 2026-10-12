# Preference and assignment progress statistics

This accepted reporting requirement is deferred from the active roadmap. Missing
preference responses, unassigned ranked choices, and unmet preferred room features
are normal operation outcomes. They do not require an organiser to contact each
named family or person. Their progress and fulfilment remain useful to organisers
in aggregate.

The current attention registry does not emit per-person findings for unanswered
requested family preferences or workshop choices, per-person workshop assignment
shortfalls, or per-family unmet preferred room features. Workshop answer and
allocation views continue to expose their existing response and solver states;
family controls continue to show saved values. This contract preserves the
reporting need for a future, consistent overview; it does not create a chase list
or make optional responses mandatory.

Promotion requires explicit user scope approval, review of affected binding
decisions under [repository policy](../../AGENTS.md#documentation-and-specification),
and reinsertion into an active roadmap milestone before implementation.

## 1. Coverage

The aggregate overview should cover these related measures:

- Requested family preference fields, including food and accommodation fields:
  eligible response count, substantive answers, explicit neutral answers, and
  outstanding answers, grouped by field and response scope.
- Workshop choice: eligible people, ranked responses, explicit no-preference
  responses, and outstanding responses while the choice phase is open.
- Workshop assignment: eligible ranked wishes, assigned wishes, and unassigned
  wishes, with aggregate causes such as capacity, schedule overlap, leadership,
  and missing placement where the solver reports them.
- Room preferences: requested preferred features, fulfilled preferences, and
  unmet preferences. Required room constraints and actual placement failures
  remain organiser attention and are not ordinary preference statistics.

Counts must distinguish an explicit neutral/no-preference answer from no answer,
and an unmet preference from an invalid or infeasible requirement. Not-applicable
fields and people outside the relevant choice population are excluded from the
corresponding denominator.

## 2. Screen coverage and consistency

Provide relevant measures throughout the organiser screens that show these
responses or outcomes, including family overview/detail, food and accommodation
views, workshop choice and demand, allocation and trace, and their print views.
The dashboard may summarize the same measures, but it is not the sole entry point.
Where the same measure appears on multiple screens, its denominator, phase rules,
labels, and counts must be derived from one shared definition.

The overview is aggregate by default. It must not recreate the removed individual
attention rows as a named follow-up list. Existing family and workshop screens may
still show the underlying response or assignment status in its local context.

## 3. Data and ownership

Derive counts from the event-derived world, configured response fields, phase
state, eligibility, and current solver output. Do not persist folded domain
counts, query event payloads as a second domain model, or introduce screen-local
relationship lookups. Recompute prospective organiser views from their current
draft world and matching plan so the displayed totals track staged edits.

## 4. Preserved boundaries

- Missing requested answers stay optional and do not block phase closing.
- Invalid or contradictory responses remain organiser attention findings.
- Hard room feasibility, fixed-decision, capacity, scheduling, and allocation
  conflicts remain attention findings where they identify an organiser action.
- Explicit no-preference is a recorded response, distinct from an outstanding
  response.
- Unassigned workshop choices remain visible in local allocation outcomes.
- Room preference fulfilment belongs in aggregate reporting; it does not create a
  per-family attention row.
- Future family-access screens may show optional, non-blocking prompts about that
  family's own unanswered preferences; these are separate from organiser stats.

## 5. Acceptance checks for later implementation

- Every measure defines its eligible population, numerator, denominator, and
  treatment of explicit neutral/no-preference values.
- The same source data yields matching totals across all relevant organiser and
  print screens, including prospective drafts.
- Workshop outcomes distinguish requests from assignments and preserve aggregate
  solver reasons without presenting ordinary capacity competition as an error.
- Missing optional responses and unmet preferred room features never become a
  named organiser chase list or a closing blocker.
- Invalid answers and genuine feasibility or fixed-decision conflicts continue
  to appear as attention findings.
- Counts exclude not-applicable controls and ineligible workshop participants.
