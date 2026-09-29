# Workshop rankings

Module id `workshop-rankings` · factory `workshopRankings`

Workshop rankings records an eligible person's ordered choices for the one
current workshop choice cycle. It does not create identity, placement, or
attendance results.

<a id="1-purpose-and-boundary"></a>
## 1. Parameters

```ts
type WorkshopRankingsParams = {
  ranking_trait: string
  max_rank: number
  allow_no_preference: boolean
}
```

The active profile supplies these values. There is no hard-coded ranking count
in the module or UI.

<a id="3-events-and-value-shape"></a>
## 2. Structured labels

Rankings remain ordinary `LabelSet` and `LabelCleared` events. A ranking value
contains the direct workshop identity and rank:

```ts
type RankingValue =
  | { workshop_id: string; rank: number }
  | { workshop_id: null; rank: null }
```

The null form is explicit “no preference”. No response is the absence of a
ranking label. Re-ranking clears the person's current-cycle ranking labels and
sets the new values in one append.

<a id="4-validation-and-visibility"></a>
## 3. Validation and demand

The ordered-choice resolver role is scoped to `person`, with `per: 'occasion'`
and a `workshop` choice. Validation requires eligible current workshops,
dense unique ranks, configured maximum rank, and exclusive no-preference.

The module contributes deterministic demand summaries by workshop and audience
group. It never produces person-to-workshop assignments.

Late edits are accepted while the choice cycle remains active. A previously
reviewed calculation remains stable until an organiser explicitly recalculates
and reviews it.

## 4. Tests

- Append and replay validation covers rank density, duplicate choices,
  eligibility, no-preference, and current-cycle visibility.
- Demand summaries are deterministic, shuffle-invariant, and group-filterable.
- Late edits do not mutate a reviewed calculation without explicit review.
