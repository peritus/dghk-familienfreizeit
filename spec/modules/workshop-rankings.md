# Workshop rankings

Module id `workshop-rankings` · factory `workshopRankings`

Workshop rankings records an eligible person's ordered choices for an immutable
candidate round. It does not assign people and it does not require a schedule.

## 1. Purpose and boundary

Rankings target stable programme-session identities. A later schedule may create
zero, one, or several offerings for a session without changing the ranking
fact. [Workshop attendance](workshop-assignment.md) consumes rankings only after
[workshop scheduling](workshop-scheduling.md) has produced offerings.

## 2. Dependencies and parameters

Requires [programme core](programme-core.md), [call for papers](call-for-papers.md),
and [official workshops](official-workshops.md). Parameters remain:

```ts
type WorkshopRankingsParams = {
  ranking_trait: string
  max_rank: number
  allow_no_preference: boolean
}
```

`max_rank` defaults to `3`; `allow_no_preference` defaults to `true`.

## 3. Events and value shape

Rankings remain ordinary `LabelSet` and `LabelCleared` events. Re-ranking a round
clears that round's labels and sets the new ones in one append.

```ts
type RankingValue =
  | { round_id: string, session_id: string, rank: number }
  | { round_id: string, session_id: null, rank: null }
```

The null form is explicit “no preference” for the round. No response is the
absence of a ranking label.

## 4. Validation and visibility

The `ordered-choice` role is scoped to `person`, with `per: 'round'` and a
programme-session choice. Append and replay validation require that:

1. the round exists, is published, and contains the session;
2. the person's candidate view for the session is eligible under official
   audience, age, role, and fixed resolver rules;
3. ranks are unique and dense from 1 through `max_rank`;
4. a session appears at most once per person and round;
5. a null value is the only value for its round and is permitted by configuration.

Candidate publication is occasion-wide, but the family view exposes only the
sessions each person can attend. Eligibility is checked again during attendance;
filtered or later-invalid choices remain historical facts and become inactive,
with a diagnostic rather than being rewritten.

## 5. Solver input and stages

```ts
type RankingsInput = {
  rankings: readonly {
    person_id: string
    round_id: string
    session_ids: readonly string[]
    no_preference: boolean
  }[]
}
```

Rows sort by `round_id`, then person identity. A person with no response has no
row. This module contributes the pre-schedule demand summary stage, which counts
eligible ranked demand per session and round without producing person-to-session
or person-to-offering assignments. The summary is deterministic and is consumed
by workshop scheduling as a soft scoring input.

## 6. World diagnostics

The world reports cancelled, closed, ineligible, and unavailable choices. An old
round remains inspectable, but only the active published round contributes to
current candidate visibility and demand.

## 7. Output and screens

The world exposes rankings by person and round for the family view, organiser
family detail, and preference heatmap. Organisers see round membership, response
status, and demand summary; they do not receive a schedule-dependent assignment
from this module.

## 8. Tests

- Every validation rule rejects at append and replay.
- Ranking works before any schedule exists.
- Candidate visibility is eligibility-filtered per person.
- No-preference and no response remain distinct.
- Round membership is immutable and old rankings become inactive in a new round.
- Multiple offerings for one session do not rewrite ranking labels.
- Demand summary is deterministic, shuffle-invariant, and contains no assignments.
