# Optional design: sleeping parties

*Status:* Not part of the active specification and not selected by any profile.
This sketch records how the capability would work as a module; adopting it means
adding it to the module catalogue and to every document listed under “Integration
points”.

Proposed module id `sleeping-parties` · factory `sleepingParties`

## 1. Purpose and boundary

Sleeping parties decides who sleeps with whom. A *party* is a set of people who must
be placed in the same room. It is derived on every run, never stored, and never
referenced by a constraint. This module owns party formation: family
parties, merges from co-room relations, organiser grouping and separation, the
unplaceable-merge guard, and party requirements. It does not decide which room a
party gets; that is [room assignment](../modules/room-assignment.md).

Party formation would be a separate, reviewable phase; D5 defers it. Organisers review a short list
of parties with provenance before looking at any room.

This document is the authoritative description of party formation, party
requirement inheritance, and relation handling during formation.

## 2. Dependencies

Requires: [`room-inventory`](../modules/room-inventory.md). Enhances: none.

## 3. Parameters

```ts
type SleepingPartiesParams = {
  co_room_trait: string                // relation trait whose mutual required pairs merge families
  no_bed_trait: string | null          // boolean person trait; true means no bed demand
  size_one_warning_threshold: number // dashboard warning above this many one-person parties
}
```

| Parameter | Default | Validation |
|---|---|---|
| `co_room_trait` | — (required) | names a trait filling the co-room role (§6) |
| `no_bed_trait` | `null` | names a boolean property trait scoped to `person` |
| `size_one_warning_threshold` | `5` | integer ≥ 0 |

## 4. Entity kinds

None. Parties are derived values, not entities.

## 5. Events

None. Formation reads family, person, and label events.

## 6. Labels and trait roles

Module-owned label keys: none.

| Role | Parameter | Required trait shape |
|---|---|---|
| Co-room relation | `co_room_trait` | `relation`, operator `groups-with`, scopes `family` or `person`, target the same scope, symmetry `mutual-required`, strengths `required` and `preferred` |
| No bed demand | `no_bed_trait` | `property`, scope `person`, boolean |

Formation also reads, without a role parameter:

- every resolved requirement scoped to `family` or `person` that targets a room
  or place, including profile traits and free-form organiser `needs` values;
- every active room-scoped `groups-with` or `separates-from` decision on `person`
  or `family` entities. Workshop-scoped relations belong to workshop assignment.

## 7. Solver input and stages

Adds no solver input arrays of its own; it reads families, persons, labels, and
constraints from the kernel input and `rooms` from `room-inventory`.

### Stage `sleeping-parties.form`

No ordering constraints.

```ts
type Party = {
  key: string                      // sha256(sorted person ids).slice(0, 12)
  person_ids: readonly string[]    // sorted
  family_ids: readonly string[]    // sorted
  size: number                     // headcount
  bed_demand: number               // members without no_bed_trait = true
  requirements: readonly PartyRequirement[]
  provenance: readonly string[]    // human-readable lines
}

type PartyRequirement = {
  trait: string                      // resolved profile trait or free-form matching token
  strength: 'required' | 'preferred'
  contributed_by: readonly string[] // family or person ids, sorted
}
```

`size` and `bed_demand` differ whenever someone does not need a bed. Capacity checks
use `bed_demand`; everything a person reads shows `size`.

`key` is unstable by design: it changes when membership changes. It correlates a
party across the stages of one run and labels trace rows. Nothing may persist it.

**Step 1 — families.** For each family, the persons who are not withdrawn form one
party. A family with no such person forms no party.

**Step 2 — requirements.** Each requirement label at `required` or `preferred` on
the family or any member becomes a party requirement. Requirements union across
members with the strictest strength winning (`required` > `preferred`), and
`contributed_by` records who stated it.

The resolver supplies requirements from both profile traits and ordinary `needs`
labels; the stage must not discard a token because it is absent from `profile.traits`.

**Step 3 — preference merges.** Build an undirected graph over families where an
edge exists if and only if both directions carry `co_room_trait` at `required`.
Union-find over that graph; each component merges its families' parties.
A merged party's `bed_demand` is the sum and its requirements are the strictest
union.

**Merge guard.** If a merged party's `bed_demand` exceeds the largest `place_count`
of any `general` room, the merge is refused. The families stay separate parties,
the relation is treated as `preferred`, and the stage emits an error diagnostic
and trace line:

> Refused merge of Müller (3) + Schmidt (3) + Weber (4): combined demand 10
> exceeds largest room capacity 6. Treated as a preference, scored rather than
> merged. **Needs organiser attention.**

Non-mutual co-room relations and mutual `preferred` ones never merge. They become
the soft co-room terms scored by room assignment.

**Step 4 — organiser decisions.** Active required room-scoped `groups-with` and
`separates-from` labels apply in source event sequence, then source entity id, key,
and canonical value order. They need no separate declaration. `groups-with` merges
the parties containing its entities, subject to the merge guard. `separates-from`
separates the named people or family members when they share a party, following the
resolver's entity expansion. Preferred relations remain placement preferences.
Contradictory active required relations are reported; later events do not silently
erase a different active label. Each application adds provenance:

> `P07` size 5 — Müller (2 adults) + Schmidt (2 adults, 1 infant).
> Merged: mutual co-room request `e1183` / `e1201`.
> Bed demand 4 (1 infant does not occupy a bed).

> `P12` size 2 — Weber (2 adults).
> Separated by organiser decision `separates-from` (`e1340`).

Recompute requirements from the final membership after merges and splits, preserving
each contributor. Room-targeted `provides` and `excludes` decisions are consumed by
room assignment, not interpreted as party merges. Organiser views can show the
source event's author, timestamp, and optional note beside the provenance.

**Output order.** `bed_demand` descending, then the lowest member `family_id`, then
`key`.

## 8. Rules and scoring

None. Formation is not scored. Room assignment scores the soft co-room terms.

## 9. Preflight checks

| Id | Severity | Fires when |
|---|---|---|
| `sleeping-parties.merge-exceeds-capacity` | error | a mutual-required component's bed demand exceeds the largest room |
| `sleeping-parties.required-contradiction` | error | an entity requires co-rooming with an entity it is also kept apart from, or holds a required requirement using a sole-occupancy structural check (the active scope's `no-other-families`, [room assignment](../modules/room-assignment.md) §8, which this module would extend to parties) together with a required co-room relation |
| `sleeping-parties.merge-cascade` | info | a transitive component contains two families with no direct relation |

A merge cascade is correct — A↔B and B↔C must all share a room — but it surprises
people. The provenance shows the chain.

## 10. Output and diff

Plan section `sleeping-parties`:

```ts
type SleepingPartiesSection = {
  parties: readonly Party[]
  refused_merges: readonly { family_ids: readonly string[], bed_demand: number, largest_room: number }[]
  size_one_parties: number
}
```

Party keys are not stable, so `diff` reports no party changes of its own; moves are
reported by room assignment and attributed to the events that caused them.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Screen | `/organiser/parties` — party review with provenance, requirement contributors, merge and split ([party review](party-review.md)) |
| Controls | none; the co-room trait's control is declared by the profile |
| Reports | none of its own |
| Emails | none |

Merge and split append ordinary `LabelSet` events for `groups-with` or
`separates-from` to the pending list. Undo removes the action's pending events;
clearing an applied label appends `LabelCleared`.

## 12. Tests

- Family co-room preferences merge only on mutual `required`; one-sided and
  `preferred` co-room requests never merge.
- The merge guard refuses and downgrades, with the diagnostic and trace line.
- Strictest-strength union and `contributed_by` for merged parties.
- Organiser decision labels apply in source event order regardless of input order,
  without requiring separate declarations or mutual family requests.
- Free-form needs survive formation and retain the correct contributors after splits.
- Workshop-scoped grouping never changes sleeping parties.
- Party keys change when membership changes; no fixture persists one.
- Fixture contract: `minimal.kdl` includes one mutual co-room request and one
  one-sided request.

## 13. When not selected

No parties are formed; whole families remain the placement unit, the party review
screen is absent, and the co-room trait cannot be defined.

## Integration points

Adopting this module requires updating:

- [`spec/modules/contract.md`](../modules/contract.md) and the active occasion profile;
- [`spec/modules/room-assignment.md`](../modules/room-assignment.md) to consume parties;
- [`spec/architecture/solver-contract.md`](../architecture/solver-contract.md) and [`spec/architecture/events.md`](../architecture/events.md)
  for the plan section and derived-stage contract;
- [`spec/application/organiser-view.md`](../application/organiser-view.md), [`party-review.md`](party-review.md),
  and [`spec/ui/screens/assignment-board.md`](../ui/screens/assignment-board.md) for party review;
- [`spec/engineering/testing.md`](../engineering/testing.md), fixtures, reports, and the family-facing
  co-room controls.

Until then, whole-family [`room-assignment`](../modules/room-assignment.md) remains
the active placement model and the party review screen is absent.
