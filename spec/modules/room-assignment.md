# Room assignment

Module id `room-assignment` · factory `roomAssignment`

## 1. Purpose and boundary

Room assignment places whole families into rooms and places. A family is the
indivisible placement unit in the active scope. The module owns hard room rules,
soft scoring, organiser placement constraints, forced placements, the sorted greedy
pass, bounded repair, unplaceable reporting, and the board. It does not split a
family into child rooms or merge families into sleeping parties; those capabilities
belong to the separate [`sleeping-parties`](../deferred-ideas/sleeping-parties.md)
and [`child-rooms`](../deferred-ideas/child-rooms.md) module boundary.

The method is a documented sort order, a scored greedy pass, and capped pairwise
swaps (D4), because organisers must be able to review why a family got a room. The
general determinism contract, rule interface, and trace format are in the
[solver contract](../architecture/solver-contract.md).

This document is the authoritative description of whole-family room placement,
room scoring, and the room section of a plan.

## 2. Dependencies

Requires: [`room-inventory`](room-inventory.md). Enhances: none.

## 3. Parameters

```ts
type RoomAssignmentParams = {
  weights: { exact_fit: number; near_fit: number; orphan_bed: number }
  keep_apart_trait: string | null
  no_bed_trait: string | null
  priority_trait: string | null
  scarce_capabilities: Readonly<Record<string, number>>
  max_repair_passes: number
}
```

| Parameter | Default | Validation |
|---|---:|---|
| `weights.exact_fit` | `10` | integer |
| `weights.near_fit` | `4` | integer |
| `weights.orphan_bed` | `-8` | integer ≤ 0 |
| `keep_apart_trait` | `null` | fills the keep-apart role (§6) |
| `no_bed_trait` | `null` | fills the no-bed role (§6) |
| `priority_trait` | `null` | a `requirement` trait scoped to `person` or `family` |
| `scarce_capabilities` | `{}` | room capability → integer penalty ≤ 0 |
| `max_repair_passes` | `5` | integer ≥ 0 |

Defaults are starting values. Expect to tune them against an exported event log
with `npm run tune` ([deployment](../engineering/deployment.md), weight tuning) and deploy
each change as a profile change, never as an event (D12).

## 4. Entity kinds

None.

## 5. Events

None of its own. Organiser decisions on the board are ordinary constraints added
with `LabelSet` (D6).

## 6. Labels and trait roles

Module-owned label keys: none.

| Role | Parameter | Required trait shape |
|---|---|---|
| Keep apart | `keep_apart_trait` | `relation`, operator `separates-from`, scopes `family` or `person`, symmetry `implied-mutual`, strengths `required` and `preferred` |
| No bed demand | `no_bed_trait` | `property`, scope `person`, boolean |

Room assignment consumes the normalized requirements, capabilities, exclusions,
and separations produced by the resolver ([solver contract](../architecture/solver-contract.md) §2).
It does not interpret raw profile trait keys or event payloads. Free-form organiser labels
are included through the same normalized boundary. A
required `separates-from` relation prunes rooms that contain the named other family.
Grouping relations for sleeping placement are not active in the current module set.

## 7. Solver input and stages

Reads `rooms`, `places`, `families`, `persons`, and labels from the kernel input.
Rooms designated `staff` or `blocked` are not candidates for families.

### Stage `room-assignment.place`

This is a root room stage; it has no dependency on an unselected sleeping-party
stage.

```ts
type FamilyPlacementUnit = {
  family_id: string
  person_ids: readonly string[]
  bed_demand: number
  requirements: readonly Requirement[]
}
```

The unit contains all non-withdrawn people in one family. Requirements are the
strictest-strength union of the family's and its members' room requirements.
`bed_demand` excludes people whose `no_bed_trait` property is true, while the family
remains one placement unit. A no-bed person still occupies the family's room but
does not occupy a generated place.

#### Phase 0 — retain valid previous placements

Seed placements from the `before` plan supplied by
[`deriveTransition`](../architecture/solver-contract.md) when the family, room,
capacity, requirements, exclusions, and keep-apart relations remain
valid. New or invalidated families are left unplaced. These retained placements
are provisional: a feasible required placement decision supersedes a retained
placement for the same family and releases its previous capacity. A first
allocation, or a transition without a compatible prior assignment, has no
retained placements and proceeds straight to phase 1.

#### Phase 1 — required placement decisions

For each active required positive placement decision that resolves to a particular
room or place, in source event sequence, entity id, key, and canonical value order:

1. Resolve the named family or person to its family placement unit.
2. Check capacity, all required needs, exclusions, and separation
   against the family and target. If any fails, record a conflict, skip, and trace.
3. Otherwise place the family and mark it placed. Later decisions for an already
   placed family either agree or produce a conflict, never a second assignment.
   A required decision that supersedes a retained placement is recorded as a
   required move.

Normalized capabilities and requirements determine feasible targets;
`excludes` removes a feasible target. Preferred decisions contribute soft terms
and never force phase-1 placement. A plan with
unresolved conflicts is computed for diagnosis, but communication is blocked until
the error findings are resolved ([events](../architecture/events.md), `Communicated`).

#### Phase 2 — forced placements, to fixpoint

```text
repeat:
  changed = false
  for each unplaced family, in family order:
    feasible = rooms where every hard rule passes
                       and free places ≥ family.bed_demand
    if feasible is empty: continue
    if feasible has one room:
      place it; changed = true
      trace "forced — only feasible room"
until not changed, or iterations > family count
```

#### Phase 3 — sorted greedy

Sort remaining families by required priority, feasible room count, `bed_demand`
descending, lowest `family_id`, then the canonical family key. Score each feasible
room and place the highest-scoring one, tracing the runners-up.

#### Phase 4 — bounded repair

Try deterministic pairwise swaps of placed families — retained or newly placed —
for at most `max_repair_passes`. A swap is accepted only when both placements
remain feasible and the total score strictly improves. Required targets,
exclusions, and keep-apart relations remain binding. A retained placement is
moved only when this phase or phase 1 finds it necessary — stable sorting in
phase 3 does not by itself justify displacing it.

#### Phase 5 — the unplaceable

For each unplaced family, evaluate every room and report the most common blocking
rule and closest near-miss:

> `Braun ×5` — unplaced. 38 rooms rejected on capacity; 2 rejected on ensuite.
> Closest: Room 31 (5 places free, no ensuite).

## 8. Rules and scoring

Hard rules prune a room. They are not worth points.

| Rule id | Fails when |
|---|---|
| `hard.capacity` | free places < `family.bed_demand` |
| `hard.trait-requirements` | a required family requirement is not satisfied |
| `hard.keep-apart` | the room holds a family the candidate is kept apart from at `required` |
| `hard.resolver-decisions` | the resolver rejects the room or place for a required decision |

Requirements are satisfied by room capabilities or named structural checks. The
module provides one structural check, `no-other-families`: the room holds no
person of another family. At `required` it prunes; at `preferred` it contributes
the trait's penalty when another family shares the room.

The scoring table uses exact fit, near fit, orphan-bed, priority, and scarce
capability terms. Each trace line names the terms and weights that produced it.

## 9. Preflight checks

| Id | Severity | Fires when |
|---|---|---|
| `room-assignment.requirement-arithmetic` | error | a required family requirement needs more capacity than satisfying rooms provide |
| `room-assignment.required-contradiction` | error | required room decisions exclude every feasible target |
| `room-assignment.unplaced-family` | warning | a family has no feasible room after hard rules |

## 10. Output and diff

Plan section `room-assignment` contains family-to-room and family-to-place
assignments, unplaced families, diagnostics, and the decision trace. No placement
unit beyond the family exists in the current module set.

The assignment rows are:

```ts
type RoomAssignment = {
  family_id: string
  person_id: string
  room_id: string
  place_id: string | null
}
```

Every non-withdrawn person in a placed family appears exactly once. A normal
person has a generated `place_id`; a person whose `no_bed_trait` property is true
has `place_id: null` and shares the family's `room_id`. Null place ids do not
consume capacity and are excluded from place-uniqueness checks. An unplaced
family lists all of its non-withdrawn people under `unplaced` rather than emitting
assignment rows. A family is therefore either wholly assigned to one room or
wholly unplaced.

`diff` change kinds, both attributed to the family that moved:

| Change kind | Reported when |
|---|---|
| `room-changed` | a family's room differs between the two plans, including moving into or out of placement |
| `place-changed` | a person's place differs while the room stays the same |

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Screen | `/organiser/board` — whole-family placement board |
| Controls | room requirements and organiser decision labels supplied by the profile |
| Reports | room assignments, unplaced families, and diagnostics |
| Emails | none |

## 12. Tests

- Every non-withdrawn family appears in exactly one placement unit.
- A family is never split across rooms in the active scope.
- Capacity, requirements, exclusions, and keep-apart decisions are deterministic.
- No-bed people receive their family's room but no generated place, and do not
  consume bed capacity.
- Required placement decisions apply in source event order and never create a second assignment.
- An unchanged prospective event set retains every valid prior placement.
- Capacity loss or invalidation moves the minimum necessary set of families under
  the documented bounded-repair procedure.
- A newly arriving family does not displace an existing placement when a feasible
  alternative room exists.
- A required decision that supersedes a retained placement is recorded as a
  required move.
- Pairwise repair preserves all hard rules.
- A first allocation without a previous plan follows the initial-allocation path.
- A whole-family fixture produces stable assignments and a readable trace.
- Sleeping-party and child-room fixtures belong to their separate module tests.

## 13. When not selected

Selecting [`sleeping-parties`](../deferred-ideas/sleeping-parties.md) and
[`child-rooms`](../deferred-ideas/child-rooms.md) changes the placement input from
families to derived parties and adds their stages before room assignment. The
profile, module catalogue, board, reports, and test contracts must be updated in
the same change.
