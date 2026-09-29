# Official workshops

Module id `official-workshops` · factory `officialWorkshops`

Official workshops owns the direct `workshop` identity and the facts needed to
author, review, schedule, and communicate an organiser-created workshop. It
does not own ranking, placement, or attendance allocation.

<a id="1-dependencies-and-ownership"></a>
## 1. Identity and boundary

The module owns stable `workshop` identities. The active participation modes
are `assigned`, `sign-up`, and `interest`; self-organized workshops remain
deferred and are not selected by the active Familienfreizeit profile.

The module also owns first-class `external-leader` identities. Registered
people are referenced by typed `person` identity. External leader contact data
is organiser-only and never parsed from a free-text name field.

Workshop properties remain generic labels. Audience vocabulary, age rules,
capacity policy, and available modes come from the occasion profile.

<a id="2-schedule-boundary"></a>
## 2. Events

The event boundary supplies full-restatement events equivalent to:

```ts
type WorkshopRestatement = {
  workshop_id: string
  title: string
  description: string
  audience: string
  age_min: number
  age_max: number
  capacity: number
  participation_mode: 'assigned' | 'sign-up' | 'interest'
  leader_ids: readonly string[]
  needs: readonly string[]
  sort_key: number
}

type WorkshopAdded = WorkshopRestatement
type WorkshopUpdated = WorkshopRestatement
type WorkshopCancelled = { workshop_id: string; reason: string | null }
type WorkshopRetired = { workshop_id: string; reason: string | null }
```

`WorkshopCancelled` preserves identity and history while removing the workshop
from active planning. `WorkshopRetired` is the event-backed equivalent of the
prototype's delete action; it does not erase history.

External leaders use add, full-update, and retire events with typed availability
and organiser-only contact labels. Leader references are validated during
append and replay.

Capacity is a non-negative integer. A capacity reduction that would put current
attendance above the new capacity is rejected until the open policy issue is
resolved; see [issue 036](../issues/open/036-workshop-capacity-reduction-policy.md).

## 3. Derived contribution

The module contributes live and cancelled workshop entities, leader data,
audience eligibility, participation mode, capacity, and authoring diagnostics.
It exposes direct workshop identities to scheduling, rankings, attendance,
reports, and the organiser UI. A scheduled result refers back to the same
workshop identity and adds only its derived slot and space placement.

## 4. Screens and reports

- `/organiser/workshops` is the workshop overview and landing view.
- Authoring uses compact fields with progressive disclosure for lifecycle,
  cancellation, constraints, and operational details.
- Leaders are selected through typed searchable pickers.
- Communication state is shown in release/review surfaces, not as badges on
  workshop cards.
- Cancelled workshops are hidden from active planning by default and remain
  available in labelled history and report contexts.

## 5. Tests

- Add, full update, cancel, retire, replay, and shuffle invariance preserve
  typed `wks_` identity and history.
- Invalid audience, age range, mode, leader reference, capacity, and duplicate
  identity are rejected at append and replay.
- Capacity reductions that would overfill current attendance are blocked.
- Internal and external leaders remain distinguishable and privacy-scoped.
