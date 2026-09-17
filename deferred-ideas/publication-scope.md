# Deferred idea: publication holds back assignments only

*Status:* deferred. Not part of the specification. This sketch records a proposed
narrowing of what publication withholds, discussed but not adopted; nothing in it
is applied to the active documents. Adopting it revises
[D16](../17-decisions.md) and touches every document listed under "Integration
points".

## 1. The problem it would solve

A family's view derives from the events before the latest publication (D16,
[architecture](../01-architecture.md)), while every family control saves on change
and renders from the response ([family view](../10-family-view.md) §3,
[family preferences](../20.9-family-preferences.md) §11). After a publication, a
family's own new answers, diet, and material commitments are therefore invisible to
them until organisers publish again. Materials are also a solver plan section
([materials](../20.8-materials.md) §7), so a commitment changes `output_hash` and
counts as staleness.

## 2. The proposed rule

Publication holds back the solver's assignment outputs, and nothing else:

| Held until Publish | Visible immediately |
|---|---|
| Room and place assignments | A family's own people, preferences, rankings, food entries, and free text |
| Places in workshops that the solver assigns | Requests between families |
| Programme facts of assigned workshops: time, room, title, manual cancellation | Material requests and commitments, and the shared materials overview |
| | Programme facts of self-organised workshops |

Privacy is unchanged and stays a separate filter: `organiser_only` tags,
`restricted` values, keep-apart relations, and other families' preferences are
never family-visible, published or not. The family view would combine two cuts:
facts from the current log, plan sections from the published cut.

## 3. Workshop participation modes

The programme would carry a `participation` mode per workshop, set by
`WorkshopAdded` and `WorkshopUpdated` ([workshops](../20.4-workshops.md) §5):

- **`assigned`** — rankings plus solver placement, as today. Places and programme
  facts wait for Publish, and the change email goes out with that publication.
- **`sign-up`** — people add and remove themselves with ordinary `LabelSet` and
  `LabelCleared` events on a module-owned person key (`signed-up-for`, value a
  workshop id). The list is visible immediately. Capacity is optional and, when
  set, is first come first served in event order, enforced as an append invariant
  against the head the request derived from.
- **`interest`** — a non-binding `interested-in` person key giving organisers a
  headcount, with no capacity and no names in shared views.

`sign-up` and `interest` workshops take no rankings
([workshop rankings](../20.5-workshop-rankings.md) §6) and are excluded from the
assignment solver input ([workshop assignment](../20.6-workshop-assignment.md) §7).

Open questions worth settling before adoption:

- Whether a person may hold more than one sign-up per slot, and whether a sign-up
  makes them ineligible for assignment in that slot. Treating it like "no
  preference", with no fairness-ledger deficit, is the obvious reading.
- Which cut decides the mode when a workshop's mode changes between publications.
- A preflight check for a sign-up list that exceeds a capacity lowered later.

## 4. Consequences

- `materials.resolve` stops being a solver stage with a plan section and becomes a
  world-level summary, like `FoodSummary` in
  [food preferences](../20.7-food-preferences.md) §10. Its change kinds move from
  the plan diff to the organiser dashboard.
- Staleness and change emails concern assignments only, which is what
  [change notifications](../20.10-change-notifications.md) already implies.
- The family view costs one fold at the head plus the published-cut derivation the
  dashboard already performs.

## Integration points

Adopting the idea would require updating: [D16](../17-decisions.md),
[01-architecture](../01-architecture.md) (plan inputs and staleness),
[10-family-view](../10-family-view.md), [12-frontend](../12-frontend.md) §3,
[19-reports](../19-reports.md) §2, [20.4](../20.4-workshops.md),
[20.5](../20.5-workshop-rankings.md), [20.6](../20.6-workshop-assignment.md),
[20.8](../20.8-materials.md), [20.9](../20.9-family-preferences.md),
[20.10](../20.10-change-notifications.md), the occasion profile, and the
[UI-03](../ui/03-family-preferences.md), [UI-04](../ui/04-family-assignment.md),
and [UI-12](../ui/12-workshops.md) screens.
