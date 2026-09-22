---
id: "025"
title: Workshop proposals and rankings are coupled to a preassigned schedule
status: resolved
severity: contract-contradiction
category: module:workshops
source: user workflow review
related_decisions: [D3, D4, D6, D13, D16]
opened: 2026-09-22
---

# Workshop proposals and rankings are coupled to a preassigned schedule

## Problem

The intended workshop workflow has five distinct phases:

1. users propose workshops;
2. organisers select a subset of proposals for ranking;
3. users rank those workshops before a schedule exists;
4. the solver schedules the selected workshops into days, time slots, and rooms,
   applying capacity and separation constraints;
5. a later allocation stage assigns people to the scheduled workshop offerings.

The current specification instead assumes that a workshop already belongs to a
slot before anyone can rank it, and that its room is already known before the
solver runs. Consequently, the example below is not merely an awkward event
shape: it records a schedule fact at the ranking stage, and the later solver
cannot choose that fact.

The issue also crosses the existing decision boundary. D13 requires rankings to
be structured labels, so changing the value shape or the lifecycle represented
by those labels requires a decision review rather than a silent specification
edit.

## Evidence

### The ranking data carries a slot too early

The authoritative ranking module defines a ranking as a person → slot → ordered
list and requires the `ordered-choice` trait to be `per: 'slot'`:
[`workshop-rankings.md`](../../modules/workshop-rankings.md#1-purpose-and-boundary)
and [its validation role](../../modules/workshop-rankings.md#4-validation-and-visibility).
Its value type repeats the same coupling: `{ slot, workshop, rank }`, with a
separate null value for “no preference”
([value shape](../../modules/workshop-rankings.md#3-events-and-value-shape)).
The concrete event example therefore stores a slot while the person is still
ranking:
[`workshop-rankings.md`](../../modules/workshop-rankings.md#3-events-and-value-shape).

Validation makes the ordering dependency explicit. A ranking is accepted only
when its slot exists and its workshop is offered in that slot; family writes
also require a communicated assigned workshop
([validation rules](../../modules/workshop-rankings.md#4-validation-and-visibility)).
That contradicts ranking a proposal before the solver has selected a day, time,
or room. The family view repeats the same assumption by offering rankings only
for communicated assigned workshops and hiding uncommunicated programme
details ([workshop controls](../../application/family-view.md#3-interaction-details)).

The profile copy makes the UI contract slot-first as well: “Up to three choices
per time slot” and `per: 'slot'`
([`prefers-workshop` trait](../../profiles/familienfreizeit-2027.example.ts)).

### The workshop entity is scheduled before ranking

`WorkshopAdded` requires a `slot_id`, and its `room_id` is a direct workshop
field. The module therefore models the proposed activity and its scheduled
offering as one object:
[`official-workshops.md`](../../modules/official-workshops.md).
The module's input likewise exposes only workshops that already have
`slot_id` and `room_id`, and says that slots are already processed in
chronological order ([solver boundary](../../modules/official-workshops.md#2-schedule-boundary)).
There is no proposal state or “selected for ranking” state in the documented
entity, event, or label model.

The current workshop module does distinguish `assigned`, `sign-up`, and
`interest` participation modes, but that is a participation mode, not a
proposal/ranking/scheduling lifecycle. Interest labels are live participation
facts and can be set on several workshops in one existing slot
([live participation](../../modules/official-workshops.md#1-dependencies-and-ownership)).
They do not provide the selected candidate set or a solver input representing
the interest groups that must be separated.

### The current solver allocation is not a schedule solver

The assignment module reads assigned-only workshops, effective rankings, and
already-resolved workshop decisions. Its stage loops over existing slots and
assigns a person to one workshop in each slot
([assignment input and stage](../../modules/workshop-assignment.md#4-assignment-policy)).
It can enforce participant eligibility, capacity, exclusions, and separation
while choosing people, but it never chooses a workshop's slot, day, or room.
The workshop module reports `room-clash` as a world diagnostic when two already
scheduled workshops overlap in one room; this is detection, not solver
placement ([schedule diagnostics](../../modules/workshop-scheduling.md#2-stages)).

The release model also assumes that slot and room facts are already programme
content and that allocation is subsequently released per slot
([release scopes](../../application/release-control.md#1-release-scopes)). That is
compatible with the desired final communication boundary, but it does not
define the missing schedule-producing stage between ranking and attendance.

### The executable repository does not implement a competing lifecycle

The source tree currently contains only the generic module factory
([`src/modules/define.ts`](../../../src/modules/define.ts)); there is no
workshop module, workshop-ranking implementation, schedule stage, attendance
stage, or solver implementation to reconcile with the specification. The
implemented architecture explicitly says that solver stages remain outstanding
and that no real module is selected by the executable profile
([implemented architecture](../../../docs/architecture/events.md#limits)). The
profile and module documents are therefore the current contract, not a
partially implemented behavior that can be preserved by a small code fix.

### The binding decision fixes the problematic representation

D13 explicitly chooses a set of `prefers-workshop` labels whose values carry
slot, workshop, and rank, with no dedicated ranking event or property table
([D13](../../../decisions.md#d13--workshop-rankings-are-structured-labels)).
The event-log-only, pure-solver, resolver-owned and release boundaries remain
valuable constraints ([D2](../../../decisions.md#d2--event-log-with-in-memory-read-models),
[D3](../../../decisions.md#d3--the-solver-is-a-pure-function),
[D6](../../../decisions.md#d6--organiser-decisions-guide-the-derived-assignment),
and [D16](../../../decisions.md#d16--release-control-determines-which-arrangements-families-see)).
The problem is that D13's particular value shape represents the post-scheduling
unit at the pre-scheduling ranking boundary.

## Recommendation

Put the lifecycle boundary into the model before implementing M9/M10. Preserve
the event log, generic labels, resolver, pure solver, and release-control
boundaries, but separate the concepts that currently share `workshop`:

1. **Proposal.** A person or family can propose a workshop with proposal
   content and proposer attribution. A proposal has no required slot or room.
   Organisers can accept, reject, or otherwise close proposals through explicit
   lifecycle state.
2. **Ranking candidate set.** Organisers publish a selected set of proposals for
   one ranking round. The set is the stable audience-visible input to ranking;
   it does not require a slot, day, or room. If several ranking rounds are
   possible, the round identity must be explicit so old rankings are not mixed
   with a later candidate set.
3. **Pre-schedule ranking.** A person ranks candidate workshop identities, not
   slots. The ranking value should therefore be conceptually
   `{ workshop, rank }` (plus an explicit round/candidate-set identity if the
   selected set is not globally unique). “No preference” remains distinct from
   no response. A workshop that is later offered more than once must have a
   documented rule for whether a person ranks the activity once or ranks
   individual offerings only after scheduling.
4. **Schedule solver.** A schedule stage assigns selected workshops to valid
   day/time/room offerings, subject to capacity, room availability, leaders,
   duration, and organiser decisions. The stage must model the user’s stated
   separation requirement: workshops with distinct interest groups must not be
   scheduled into the same conflicting day/room combination. The contract must
   define how an “interest group” is represented and resolved—preferably as a
   typed workshop relationship or fixed resolver input, not an application-side
   lookup over raw labels. The stage must return schedule assignments,
   unscheduled outcomes, conflicts, and trace explanations.
5. **Attendance assignment.** A later stage consumes the schedule and the
   pre-schedule rankings, then assigns each eligible person to at most one
   scheduled offering per overlapping time period, applying capacity, age,
   audience, reservations, fairness, and rank priorities. This is where the
   current `workshop-assignment` policy belongs after its input is changed from
   “person → slot → workshop” to “person → ranked workshop, then scheduled
   offering”. Attendance output must carry the selected workshop, offering,
   slot/day, room, and any unassigned reason.

The revised module contract should make the dependency graph explicit:

```text
workshop-proposals
        ↓
workshop-ranking-candidates
        ↓
workshop-rankings ───────────────┐
        ↓                         │
workshop-scheduling              │
        └───────────────→ workshop-attendance-assignment
```

The revision should also update the profile example, family and organiser
screens, release scopes, reports, fixtures, and roadmap acceptance criteria so
that they describe this same sequence. In particular:

- ranking UI must be available for the communicated candidate set even when no
  schedule exists;
- schedule review must show proposed day/time/room placements and explain
  separation conflicts before attendance is assigned;
- attendance release must be downstream of a reviewed schedule, while the
  ranking response remains a separate preference fact;
- room and slot fields must not be required on a pre-schedule proposal or
  ranking value;
- `room-clash` should become either a schedule-stage hard conflict or a
  schedule diagnostic with an explicit reason why no valid placement exists,
  not the only protection against a room collision;
- tests must cover the full five-phase lifecycle, including ranking before
  schedule assignment, schedule changes after rankings, two interest groups
  requiring distinct placements, and re-solving attendance after a schedule
  change without rewriting ranking facts.

Do not solve this by adding a `null` slot to the existing ranking value while
leaving the slot-scoped `ordered-choice` operator, `WorkshopAdded.slot_id`,
preassigned `room_id`, and assignment stage unchanged. That would permit an
invalid intermediate shape without defining which entity owns the schedule or
which solver stage produces it.

## Resolution

Issue 025 is resolved by separating programme-session identity, call review,
official workshop facts, self-organised sessions, scheduling, ranking, and
attendance into cooperating modules. The event log, generic labels, resolver,
pure solver, deterministic fairness, and release-control boundaries remain
unchanged.

Official proposals are reviewed and selected into immutable candidate rounds.
Eligible people rank programme sessions before a schedule exists. A demand
summary informs deterministic scheduling into configured slots and workshop
spaces. Attendance then assigns people to scheduled offerings from the unchanged
rankings. Selected sessions that cannot be placed remain explicit blocking
outcomes. Self-organised sessions publish immediately, may use proposer-selected
placements with organiser override, and do not enter ranking or solver attendance
allocation.

The binding changes are recorded in revised D13 and new D28. The dependent module,
solver, release, UI, profile, roadmap, and testing contracts are updated in the
same specification change.

## Open questions

1. Should proposal and scheduled offering be separate typed entities, or should
   a workshop entity gain an explicit proposal lifecycle plus a separate
   schedule-assignment record? Separate identities are recommended because one
   proposal may be offered more than once and rankings should remain stable when
   its schedule changes.
2. Is the ranking candidate set one occasion-wide set, or are there multiple
   ranking rounds? If multiple rounds are allowed, what durable identity scopes
   and expiry rules apply to a ranking round?
3. What exactly is an “interest group” for separation: an organiser-declared
   workshop group, a resolver relationship, or a derived group from ranked
   demand? The recommendation is to make it an explicit configured/resolved
   relationship so the solver never infers relationships in a screen.
4. If a workshop receives multiple scheduled offerings, does a person rank the
   workshop once and accept any feasible offering, or choose among offerings in a
   later step? The former is the simpler default and preserves the requested
   ranking-before-scheduling order.
5. Are rooms chosen by the schedule solver, or are some rooms organiser-fixed
   constraints? Both can be supported, but the contract must distinguish a hard
   organiser placement from a solver-selected placement and explain conflicts.
6. Should the existing D13 structured-label decision be revised to a
   pre-schedule `{ workshop, rank }` value, or should a new decision preserve D13
   for another use? Revising D13 is recommended; adding a parallel ranking model
   would leave two authoritative representations.

## Related files

- [workshop-rankings.md](../../modules/workshop-rankings.md)
- [workshop-assignment.md](../../modules/workshop-assignment.md)
- [workshops.md](../../modules/workshops.md)
- [solver-contract.md](../../architecture/solver-contract.md)
- [labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [familienfreizeit-2027.example.ts](../../profiles/familienfreizeit-2027.example.ts)
- [family-view.md](../../application/family-view.md)
- [release-control.md](../../application/release-control.md)
- [workshops.md UI screen](../../ui/screens/workshops.md)
- [roadmap.md](../../roadmap.md)
- [D13](../../../decisions.md#d13--workshop-rankings-are-structured-labels)
- [implemented event architecture](../../../docs/architecture/events.md)
- [`src/modules/define.ts`](../../../src/modules/define.ts)
