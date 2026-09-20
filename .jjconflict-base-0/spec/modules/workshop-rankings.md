# Workshop rankings

Module id `workshop-rankings` · factory `workshopRankings`

## 1. Purpose and boundary

Workshop rankings records, per person and per slot, an ordered list of the workshops
that person would like. It owns the ranking representation and its validation. It
does not assign anyone; that is [workshop assignment](workshop-assignment.md).

A ranking is person → slot → ordered list. Rank is not strength: strength is how
binding a preference is, rank is a position in a list. They are independent.

Rankings are per person, not per family, because a 9-year-old and a 40-year-old do
not want the same workshop. Families enter them together and the form presents them
together, but the form shape must not collapse the model shape.

This document is the authoritative description of ranking labels and the
`ordered-choice` validation (D13).

## 2. Dependencies

Requires: [`workshops`](workshops.md). Enhances: none.

## 3. Parameters

```ts
type WorkshopRankingsParams = {
  ranking_trait: string
  max_rank: number
  allow_no_preference: boolean
}
```

| Parameter | Default | Validation |
|---|---|---|
| `ranking_trait` | — (required) | fills the ranking role (§6) |
| `max_rank` | `3` | integer ≥ 1 |
| `allow_no_preference` | `true` | — |

## 4. Entity kinds

None.

## 5. Events

None of its own. Rankings are `LabelSet` and `LabelCleared` events with structured
values. Re-ranking a slot clears the slot's labels and sets the new ones in one
append.

```kdl
LabelSet entity_id=per_jonas key=prefers-workshop value=#"{"slot":"slot_sat-morning","workshop":"ws_klettern","rank":1}"# strength=#null
LabelSet entity_id=per_jonas key=prefers-workshop value=#"{"slot":"slot_sat-morning","workshop":"ws_bogen","rank":2}"# strength=#null
LabelSet entity_id=per_emma key=prefers-workshop value=#"{"slot":"slot_sat-morning","workshop":null,"rank":null}"# strength=#null
```

## 6. Labels and trait roles

Module-owned label keys: none.

| Role | Parameter | Required trait shape |
|---|---|---|
| Ranking | `ranking_trait` | `orderedChoice`, scope `person`, per `slot`, choice `ref('workshop')` |

The structured value is:

```ts
type RankingValue =
  | { slot: string, workshop: string, rank: number }
  | { slot: string, workshop: null, rank: null }   // "no preference" for the slot
```

The `ordered-choice` operator validates on append and replay:

1. the slot exists and the workshop is offered in that slot in the operational
   programme; family writes require a communicated, non-cancelled `assigned` workshop;
   organiser draft rankings require `assigned` in the draft programme;
2. ranks for one person and slot are unique and dense from 1, and at most `max_rank`;
3. a workshop appears at most once per person and slot;
4. a `workshop: null` value is the only value for its person and slot, and only when
   `allow_no_preference` is set.

"No preference" is meaningfully different from having no ranking label for the slot:
the second appears on the organiser's chase list, the first does not.

A family may set rankings for its own people. Eligibility is not checked at append:
a person may rank a workshop they turn out to be ineligible for, and assignment
reports it. An organiser may set the same ranking labels on a family's behalf
through the family-detail screen's `ranking` control, for phone/email
requests (D24); this is distinct from the organiser's own draft rankings
against the unpublished programme (rule 1 above).

## 7. Solver input and stages

```ts
type RankingsInput = {
  rankings: readonly {
    person_id: string
    slot_id: string
    workshop_ids: readonly string[]   // in rank order; empty for "no preference"
    no_preference: boolean
  }[]                                 // sort: person_id, slot order
}
```

A person with no ranking row for a slot has no row at all. Only draft assigned-mode
candidates offered in the ranking's recorded slot contribute effective choices;
wrong-slot and sign-up/interest targets are excluded.
Retain historical labels and original ranks for own-family display. For solver input,
filter inactive choices then compact the remaining order densely from 1; explain
excluded choices in world diagnostics. A filtered-empty ranking is inactive, not an
explicit "no preference" response. Active sign-ups suppress the person's slot row,
chase item and ledger participation without deleting any ranking labels.

Stages: none of its own.

## 8. Rules and scoring

None.

## 9. Preflight checks

None in the solver. World-level diagnostics:

| Id | Severity | Fires when |
|---|---|---|
| `workshop-rankings.cancelled-choice` | info | a ranking names a manually cancelled workshop |
| `workshop-rankings.ineligible-choice` | info | a ranking names a workshop the person is not eligible for |

These checks inspect world rankings before solver filtering. Inactive/wrong-mode
choices are reported alongside cancelled choices and cannot enter solver candidates.
Missing responses concern only communicated assigned opportunities for eligible
people without a live sign-up reservation.

## 10. Output and diff

No plan section. `world` exposes rankings by person and slot for the family view and
the preference heatmap.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Controls | `ranking` — drag-to-order on desktop, numbered selects on mobile ([family preferences](family-preferences.md)) |
| Screen | Preference heatmap panel in the workshops screen ([UI-12](../ui/screens/workshops.md), owned by [`workshops`](workshops.md)); missing rankings on the dashboard chase list ([organiser view](../application/organiser-view.md) §1, §2) |
| Screen | Organiser family detail renders the same `ranking` control per person, for phone/email requests (D24) |
| Reports | Missing workshop choices in the open-issues report ([reports](../application/reports.md) §3.3) |
| Emails | Reminder copy may name the people and slots without rankings |

## 12. Tests

- Each `ordered-choice` validation rule rejects at append and at replay, against
  the programme effective at that event; later mode changes do not invalidate history.
- Own saved rankings appear immediately; wrong-mode/hidden choices are rejected.
- Inactive targets are retained for display and excluded from effective rankings.
- Re-ranking a slot in one append leaves exactly the new labels live.
- Fixture contract: one person with a full ranking, one with "no preference", one
  with no ranking.

## 13. When not selected

No ranking trait can be defined; the ranking control, heatmap, and chase-list entry are
absent; `workshop-assignment` cannot be selected.
