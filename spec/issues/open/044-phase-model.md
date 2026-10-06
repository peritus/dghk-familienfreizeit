---
id: "044"
title: Define phases that activate features through derived state
status: needs-decision
severity: gap
category: kernel
source: specification review of phase activation, workflow state and deadline policy
related_decisions: [D13, D15, D16, D26, D27, D28]
related_milestones: [M8, M10]
depends_on: ["043"]
opened: 2026-10-06
---

# Define phases that activate features through derived state

## Dependencies

Blocked by [043 — module-contributed feature model](043-feature-model.md): a
phase activates features, so the feature contract must be accepted first.

The independent cleanup in [042 — unsupported workflow promises and orphaned UI](../archived/042-remove-unsupported-workflow-promises-and-orphaned-ui.md)
is resolved and did not touch phase state. This issue owns the phase-dependent
workflow, deadline and status paths directly.

## Problem

The application needs a durable way to explain what families and organisers can
do now, what becomes available next, and what happens when a target date or
closing point is reached. It has none. Screens infer workflow state from local
facts, so they cannot express prerequisites, late states, blocked work, explicit
organiser decisions, or concurrent workflows.

[`WorkflowStepper`](../../../src/app/components/shared/ui/workflow-stepper.tsx)
accepts only `complete`, `current` and `upcoming`, and its own doc comment states
that it reports state and does not own it. That is correct and should stay. The
problem is entirely in its callers.

Three organiser screens compute the same four-step workflow as three different
functions of the same facts:

- the workshop overview makes "Wahl öffnen" *current* when any workshop exists;
- the programme screen makes the same step *complete* when any ranking exists;
- the allocation screen makes review *current* on answers existing, while the
  programme screen makes review *current* on workshops existing.

See [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) and
[`workshop-allocation.tsx`](../../../src/app/organiser/screens/workshop-allocation.tsx).
A fourth stepper in
[`inventory.tsx`](../../../src/app/organiser/screens/inventory.tsx) repeats the
pattern for accommodation.

The code says so itself. Directly beneath the overview stepper, the screen
renders: "Die Wahlphase ist in dieser Ansicht noch nicht als eigenes Ereignis
gespeichert." The final step, `Festgelegt`, is a literal `upcoming` in all four
callers and can never reach any other value. The stepper's only action
affordance, `next_action`, is never passed anywhere in production.

The absence is structural, not incidental: **no event type, label key or derived
value in the repository represents a phase transition, publication, release or
commitment.** There is no `Communicated` event in the source at all, although
[`release-control.md` §3](../../application/release-control.md#3-communication-event-and-append)
specifies one. Every "öffnen", "schließen", "festlegen", "veröffentlichen" and
"kommunizieren" string the product renders is therefore unbacked by
construction. Phase-specific workflow and deadline behavior belongs here;
[042](../archived/042-remove-unsupported-workflow-promises-and-orphaned-ui.md) resolved the
independent copy, orphaned-UI and visual-coverage cleanup.

## Phase-dependent implementation scope

Issue 042 resolved the cleanup that does not depend on the phase contract. This
issue owns the following behavior and documentation because their correct
replacement depends on the phase decisions below.

| Concern | Retained scope | Required outcome |
|---|---|---|
| Phase tracks and stepper state | The overview and programme steppers in [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx), the allocation stepper in [`workshop-allocation.tsx`](../../../src/app/organiser/screens/workshop-allocation.tsx), and the accommodation stepper in [`inventory.tsx`](../../../src/app/organiser/screens/inventory.tsx) derive statuses from different local facts | Use one selected phase track; keep `WorkflowStepper` as the presentation adapter and preserve D28's four-step workshop summary unless its required decision review amends it |
| Inferred workflow and blocker state | `has_workshops` and `has_answers` in [`workshop-allocation-view.ts`](../../../src/modules/workshop-rankings/app/workshop-allocation-view.ts), three separate answer checks in the allocation screen, and the two workshop conflict notices | Replace screen-local phase/readiness inference with the accepted typed phase and readiness contract; preserve module-owned findings as their source facts |
| Deadline configuration and copy | `deadlineNotice` in [`controls.tsx`](../../../src/modules/family-preferences/app/controls.tsx), untyped `ProfileMeta.deadlines`, hardcoded `deadline_scope` and `deadline_contact` in [`src/config/define.ts`](../../../src/config/define.ts), and [family-preferences §3](../../modules/family-preferences.md#3-parameters) | Distinguish target dates from enforced closing dates in configuration, derivation, authorization and German copy |
| Phase-specific production and story wording | The `Festgelegt` step, publication/list and communication step descriptions, phase-label drift across stepper stories and screens, and phase states in the [v16 HTML prototype](../../html-prototypes/workshops-prototype-v16.html) | Reconcile names and copy with the accepted phase contract; do not infer commitment, release or communication from a step label |
| Verified behavior documentation | The lifecycle-summary and deadline-policy claims in [`docs/application/organiser-view.md`](../../../docs/application/organiser-view.md); phase-related profile validation in [`docs/architecture/profile-composition.md`](../../../docs/architecture/profile-composition.md); the stepper summary statement in [`ui/frontend.md`](../../ui/frontend.md) | Update each description with the verified implementation and the accepted decision amendments in the same change |
| Phase-dependent tests and snapshots | [`workflow-navigation.test.tsx`](../../../test/app/workflow-navigation.test.tsx), [`profile.test.ts`](../../../test/config/profile.test.ts), [`workshop-assignment-prototype-dataset.test.ts`](../../../test/solver/workshop-assignment-prototype-dataset.test.ts), and snapshots containing these steppers | Replace assertions for local inference and deadline behavior with coverage for the accepted phase projection and policies |

The family-audience portion must also honor the unresolved boundary in
[031 — family projection privacy](031-family-projection-privacy-boundary.md).
That privacy requirement remains explicit and is not resolved by changing this
issue's dependency on 043.

Feature-inventory copy and feature-related profile validation remain in 043's
scope so the two issue scopes update their respective claims without creating a
second product inventory.

### Implementation acceptance

- Every concern in this inventory is resolved, and no phase-dependent row is
  silently dropped.
- The phase view is authoritative for workflow status; screens no longer infer
  phase state locally from array lengths, and readiness remains a module-owned
  fact rather than a second phase store.
- Target dates and closing dates have distinct configuration, copy and
  enforcement; an enforced closing date is checked on the authoritative write
  path.
- Phase-related `docs/` and `spec/` claims are updated with the implemented
  behavior and accepted decision amendments in the same change. Feature-related
  claims remain coordinated with 043.
- D28 and other binding decisions are amended only after the required review,
  and every accepted amendment is reflected in dependent documents before phase
  implementation begins.
- New coverage exercises the accepted status derivation, temporal policy,
  transitions and audience boundary; existing assertions for local inference
  are not left as an alternate contract.

On the family side the same gap appears as a semantic one. The accommodation and
workshop sections render a deadline notice built from an untyped
`Record<string, string>` of instants in
[`src/config/define.ts`](../../../src/config/define.ts), with copy that reads
"Frist bis 31.3.2027" or "Frist vorbei". Nothing enforces either state. The
word chosen is the German word for a binding cut-off, and the mechanism behind it
is a string swap.

## Evidence

### D28 fixes both the count and the status of phases

> The workshop lifecycle is represented by independent event-backed facts:
> authoring, choice visibility, calculation review, attendance/schedule release,
> and cancellation. The organiser UI summarizes those facts as four visible
> phases, but the phases do not collapse programme, schedule, attendance, or
> communication state into one flag.
>
> — [`D28`](../../../decisions.md#d28--workshops-have-one-direct-identity-and-one-placement)

Two clauses must change: the count is fixed at **four**, and phases are
characterised as a **UI summary only**. A model with concurrent tracks,
prerequisites, typed statuses and organiser commitments is neither.

Two clauses must be preserved, and this issue depends on them: there is no second
workshop identity, and no single persisted phase flag. The same claim is restated
in [`ui/frontend.md`](../../ui/frontend.md) and
[`ui/screens/workshops.md`](../../ui/screens/workshops.md), and asserted as
current behavior in
[`docs/application/organiser-view.md`](../../../docs/application/organiser-view.md).

### Today's deadline model has two states, not six

[`family-preferences.md` §11](../../modules/family-preferences.md#11-screens-controls-reports-and-emails)
derives only `upcoming` and `passed`, and is explicit about the policy:

> A passed deadline keeps its controls editable. It is a prompt to contact the
> organisers, not a write barrier.

That claim is restated across roughly nineteen documents, including
[`application/family-view.md`](../../application/family-view.md),
[`ui/screens/family-preferences.md`](../../ui/screens/family-preferences.md) and
[`release-control.md` §2](../../application/release-control.md#2-live-information-and-family-composition).
It is also encoded as acceptance criteria in
[`family-preferences.md` §12](../../modules/family-preferences.md#12-tests).
Introducing any enforced closing date makes all of it partially false, and
[`D13`](../../../decisions.md#d13--workshop-rankings-are-structured-labels-for-the-current-choice-cycle)
binds the policy directly:

> Late edits remain valid input to a later explicit calculation review.

### This was proposed once before and shipped half-done

Archived issue
[009](../archived/009-deadline-concept-fields-underspecified.md) proposed exactly
the distinction this issue needs, as an `after_deadline: 'read-only' | 'editable'`
field alongside `deadline_contact`. Only `deadline_contact` was implemented. The
advisory-versus-enforced question has therefore been open and unanswered through
one full cycle, which is why this issue states it as a required amendment rather
than an option.

## Terminology

- **Phase** — a bounded lifecycle context that activates a set of features and
  has timing, prerequisites, outcomes and possible organiser transitions.
- **Phase track** — a human-facing grouping of related phases, such as the
  workshop-plan track or proposal-intake track.
- **Phase step** — the compact visual representation of a phase in a stepper.
  Presentation, not domain state.
- **Phase dependency** — a typed prerequisite between phases, features or module
  outputs. Not an arbitrary relational lookup.
- **Target date** (**Zieltermin**) — a recommended completion point that may
  produce a late notice without disabling an action.
- **Closing date** (**Eingabeschluss**) — an enforced time after which an action
  is unavailable.
- **Commitment event** — a domain event recording an organiser decision that must
  survive reloads, affect later derivation, or establish a reviewed baseline.

"Flow" remains a useful description of the phase dependency graph; it need not be
a domain object, API noun, or configuration section.

## Proposed model

### Phase as a bounded lifecycle context

```ts
type PhaseStatus = 'upcoming' | 'open' | 'late' | 'blocked' | 'closed' | 'complete'

type PhaseDefinition = {
  id: PhaseId
  owner: ModuleId
  subject_kind: EntityKind | null
  activates_features: readonly FeatureId[]
  requires_phases: readonly PhaseId[]
  window: PhaseWindow
  transition_policy: 'scheduled' | 'organiser' | 'hybrid'
}

type PhaseWindow = {
  starts_at: string | null
  target_at: string | null
  closes_at: string | null
  late_policy: 'warn' | 'organiser-review' | 'block'
}
```

A planning shape, not a field list to implement. The boundary that matters: phase
definitions are build-time and typed, phase views are derived, and there is no
global persisted `current_phase`.

Phases may be sequential, concurrent, conditional, or repeated for different typed
subjects.

### Status derivation

- `upcoming` — the phase's schedule has not started;
- `open` — timing and prerequisites permit its features;
- `late` — an advisory target passed while actions remain available;
- `blocked` — a prerequisite or domain finding prevents progress;
- `closed` — a hard date or explicit close prevents the relevant actions;
- `complete` — the phase outcome exists according to its owner's contract.

Readiness, completion and commitment are separate concepts. An organiser may
still need to commit a ready result explicitly.

### Feature activation

Features declare the phases in which they are active, rather than phases mutating
feature flags at runtime:

```text
Feature: submit-workshop-ranking     requires active phase: workshop-choice.open
Feature: review-workshop-allocation  requires active phase: allocation-review
Feature: commit-workshop-plan        requires active phase: allocation-review.ready
```

This keeps ownership with the feature while letting one phase transition activate
and deactivate many features together. A phase that is no longer active removes
its bound features from effective availability.

There is no general-purpose `FeatureEnabled` or `FeatureDisabled` domain event. A
feature becomes active because phase facts changed. Where several phases can
activate one feature, the activation mode must be a fixed typed rule; conflicting
activation must fail validation or be expressed as separate feature ids, never
resolved by screen order.

### Transition model

There is no generic `PhaseAdvanced` event. Different transitions mean different
things.

**Scheduled.** Profile schedule data defines predictable boundaries, and the
system derives `upcoming`, `open` and `late` without writing clock-transition
events. If a date actually prevents an action, the model must say so with a
closing policy; the UI must not call an advisory target a "Frist".

**Organiser-controlled.** A domain-specific event records a durable decision —
for example opening a workshop choice phase, closing a proposal intake, or
committing a reviewed plan. The button is only a command entry point: the server
validates current derived facts and appends atomically. The event records
references to the reviewed input and subject, never a derived plan snapshot. A
later correction is a new event, not a mutation.
[`release-control.md` §3](../../application/release-control.md#3-communication-event-and-append)
is the template to follow — it stores `input_seq`, scopes and both revisions, and
explicitly no payloads.

**Hybrid.** Some phases need both: a proposal intake that cannot open before a
configured date, may be closed early by an organiser, and closes automatically at
a hard date. The phase contract must identify the policy explicitly so screens
never infer whether a button or a date is authoritative.

**Derived.** Readiness is often not a transition at all: all workshops placed
means schedule review is ready; a blocking finding means allocation review is
blocked.

### Relationship to release control

This is the sharpest unresolved boundary and the contract must settle it.

Release control already gates family actions by release stage.
[`release-control.md` §5](../../application/release-control.md#5-programme-participation-and-dependencies)
states that workshops without a programme communication "cannot receive family
rankings, sign-ups or interest", and requires opening the configured workshop set
before accepting rankings. Those are phase-opening preconditions, owned today by
release control. It also owns the existing `blocked` concept through hard gates on
blocking findings, and already answers reopening: "No general uncommunicate toggle
exists. Communicate a correction or cancellation."

Further, [`release-control.md` §1](../../application/release-control.md#1-release-scopes)
asserts that other specifications "refer here rather than define independent
release mechanisms". A phase contract that gates the same family actions is
either a peer authority or subordinate to it. The specification must say which,
and that sentence must be delimited accordingly. Email, delivery tracking and
arrangement visibility remain out of scope here regardless.

### Derivation boundary

```text
events + config
  → derive(events, config)
  → module facts, plans, findings and commitment references
  → derivePhases(derived, schedule, now)
  → deriveFeatureAvailability(phases, profile, environment, principal)
  → phase tracks, stepper, notices and controls
```

`derive(events, config)` stays deterministic and persists no folded state, per
[`D15`](../../../decisions.md#d15--derivation-is-a-named-primitive-and-the-client-may-call-it)
and [`D26`](../../../decisions.md#d26--validation-boundary-and-pure-domain-core).
Time-sensitive status receives `now` explicitly, outside the pure core — and the
contract must name the layer, because a build guard currently rejects `Date.now()`
in the fold and derivation paths. A closing date cannot be enforced where events
are validated today without resolving that first.

Historical and audited decisions use event-backed commitments rather than a later
clock evaluation, consistent with
[`D27`](../../../decisions.md#d27--entities-and-labels-are-hard-removed-on-retirementclear-history-is-re-derived-not-tombstoned),
which already re-derives history over a truncated event slice.

No feature table, phase table, or screen-owned workflow state is introduced. The
view may be cached within one request.

### Tracks, steps and the stepper

A track is a presentation grouping, and several may be active at once:

```text
Zimmerwünsche:   late, still editable
Workshopwahl:    open
Zuordnung:       blocked by two unplaced workshops
```

`WorkflowStepper` becomes an adapter: it renders a selected track from the central
phase view and stops calculating status from local booleans. The component itself
is retained unchanged.

### Audience and UI language

The same phase produces different views per audience — a family sees safe phase
names, dates, actions and explanations; an organiser may see blockers, findings,
counts and dependency details. Neither view exposes email or arrangement-release
mechanics through this contract.

| Technical concept | UI wording |
|---|---|
| phase | **Phase** |
| phase track | **Ablauf**, or a named area such as **Workshopwahl** |
| phase step | **Schritt** |
| feature action | concrete wording such as **Rangfolge abgeben** |
| target date | **Zieltermin** |
| closing date | **Eingabeschluss** |
| prerequisite | **Voraussetzung** |
| blocked | **Prüfung erforderlich**, or a concrete blocker |

Every visible phase answers: what it is for, what this audience can do now, the
relevant target or closing date, and what happens after it. The two policies must
never share generic deadline copy:

```text
Zieltermin: 31. März 2027
Änderungen bleiben danach möglich, werden aber als verspätet markiert.
```

```text
Eingabeschluss: 31. März 2027
Danach können Familien ihre Zimmerwünsche nicht mehr selbst ändern.
```

## Examples for the active profile

| Phase | Features | Transition policy | Consumes | Produces |
|---|---|---|---|---|
| Accommodation preferences | view and edit preference controls | Scheduled advisory target | Profile schedule and family eligibility | Editable controls and late status |
| Workshop authoring | add and edit workshop | Derived readiness plus organiser actions | Workshop event facts | Catalogue readiness |
| Workshop choice | view catalogue, submit and edit ranking | Organiser open, advisory target | Active catalogue and eligibility | Choice availability for ranking |
| Allocation review | inspect demand, findings and trace | Derived readiness, explicit organiser commit | Rankings, programme and schedule readiness | Review findings and committed-plan reference |
| Schedule review | inspect placements and conflicts | Derived readiness, explicit organiser decision | Workshops, slots, spaces, constraints | Placement findings and review status |

A design inventory, not approval that every row belongs in M8.

### Compatibility with the deferred call-for-papers lifecycle

[`call-for-papers.md` §2](../../deferred-ideas/call-for-papers.md#2-lifecycle)
describes submit, review, select/reject/close, with approval feeding the ordinary
workshop contract mid-flight. That is concurrent with the active workshop
lifecycle, and is the clearest argument for concurrent tracks rather than one
ordered list. An approved proposal becomes the ordinary typed workshop identity;
it must not create a parallel proposal-specific lifecycle, preserving both the
deferred module's stated boundary and D28's direct workshop identity.

## Milestone scoping

This contract is not an M8 deliverable, and saying so matters because M8's
remaining work is enumerated and closed-ended.

The pieces land in different milestones: deadline notices and the family
controls are built in [M10](../../roadmap.md#m10--family-access-and-release-control);
profile validation gates belong to M12, whose acceptance sentence is already
written in feature language; the operational runbook belongs to M15; and the
composition-boundary change in
[`modules/contract.md`](../../modules/contract.md) is kernel territory.

Recommended split: treat the **contract** — vocabulary, statuses, typed
contributions, activation and validation — as a cross-cutting prerequisite before
M8's remaining work, and treat **workshop-plan track adoption** — the stepper
becoming an adapter, plus the two workshop commitment events — as the M8 slice.
The **deadline policy** half is an M10 item.

Precedent: archived issue
[008](../archived/008-milestone-ordering-release-control-prereqs.md) resolved the
identical shape — later machinery required by earlier milestones — by re-scoping
milestones rather than absorbing the prerequisite into M8.

## Required decision amendments

Submitted for review per `AGENTS.md`; none may be worked around.

| Target | Why it must change | Proposed direction |
|---|---|---|
| [`D28`](../../../decisions.md#d28--workshops-have-one-direct-identity-and-one-placement) | Fixes phases at four and calls them a UI summary | Amend both clauses: phases are a derived, typed projection, open in number; retain the no-second-identity and no-single-flag clauses unchanged |
| [`D13`](../../../decisions.md#d13--workshop-rankings-are-structured-labels-for-the-current-choice-cycle) | "Late edits remain valid input" is the advisory policy stated as a decision | Amend to make the policy explicit per phase: advisory target by default, enforced closing date only where a phase declares one |
| [`family-preferences.md` §11](../../modules/family-preferences.md#11-screens-controls-reports-and-emails) and its §12 tests | "A passed deadline keeps its controls editable… not a write barrier" becomes conditional | Restate per policy, and update the acceptance criteria in the same change |
| [`release-control.md` §1](../../application/release-control.md#1-release-scopes) | "Other specifications refer here rather than define independent release mechanisms" | Delimit the two authorities: release control owns visibility of arrangements, the phase contract owns availability of actions, with precedence stated where they overlap |
| [`ui/frontend.md`](../../ui/frontend.md) and [`ui/screens/workshops.md`](../../ui/screens/workshops.md) | Restate D28's summary-only claim and the fixed four steps | Rewrite alongside the D28 amendment, in the same change |

[`D15`](../../../decisions.md#d15--derivation-is-a-named-primitive-and-the-client-may-call-it),
[`D16`](../../../decisions.md#d16--release-control-determines-which-arrangements-families-see),
[`D26`](../../../decisions.md#d26--validation-boundary-and-pure-domain-core) and
[`D27`](../../../decisions.md#d27--entities-and-labels-are-hard-removed-on-retirementclear-history-is-re-derived-not-tombstoned)
are not amended; they constrain where `now` enters, where the projection split
lies, and how a reopened phase must be re-derivable rather than tombstoned.

## Recommendation

1. Phases are bounded lifecycle contexts, derived and typed, not one global enum
   and not a persisted flag.
2. Phases activate features through typed positive bindings; features are never
   mutated by generic flag events.
3. Dates determine scheduled status and late notices; an enforced cut-off
   requires an explicit closing policy and must never be described with the same
   copy as an advisory target.
4. Domain-specific organiser events record durable decisions, storing references
   rather than derived snapshots.
5. Readiness, blockers and completion derive from ordinary module facts;
   readiness, completion and commitment stay distinct.
6. The existing stepper becomes an adapter over the central phase view and is
   otherwise unchanged.
7. Modules consume typed phase contracts or normalized facts, never rendered
   views or another module's raw events.
8. Email, delivery and arrangement communication stay outside this contract.

## Acceptance criteria for the design

- The specification defines phase, phase track, phase step, phase dependency,
  target date, closing date and commitment event.
- It defines derivation for all six statuses, and keeps readiness, completion and
  commitment separate.
- It specifies which transitions are scheduled, organiser-controlled, hybrid or
  purely derived, and names the event for each organiser commitment without
  storing a derived plan.
- It states where `now` enters, consistent with the pure-core boundary and the
  existing build guard against clock reads in derivation.
- It settles precedence between phase gating and release-control gating of the
  same family actions, and delimits the release-control authority sentence.
- It documents target dates separately from closing dates and replaces ambiguous
  deadline semantics with explicit policy vocabulary, including the German wording.
- It defines the family and organiser audience boundary for phase views.
- It gives the stepper an adapter role and names the first phase projection it
  consumes.
- It shows the workshop-plan and call-for-papers examples without a second
  workshop identity or a global phase enum.
- It states the milestone split above, rather than claiming M8 alone.
- It records the decision amendments above as accepted or rejected before
  implementation begins.
- It names the phase states, availability combinations and transition events that
  need browser and API fixtures before implementation is complete.

## Open questions

1. Should workshop choice opening always require an organiser event, or may a
   profile schedule open it automatically once prerequisites are satisfied?
2. Which phases need an explicit close event, and which only have an advisory
   target date?
3. Is `Festgelegt` a schedule commitment, an attendance-allocation commitment, a
   combined plan commitment, or a misleading label that should be split? It is
   currently unreachable in all four callers, so nothing constrains the answer.
4. Should schedule and allocation commitments be separate events, given different
   subjects and review boundaries?
5. Can an organiser reopen a closed phase? If so, is reopening a new event with
   an audit trail, or only possible by configuring a new phase instance? Release
   control's "communicate a correction" answer is the candidate precedent.
6. Should a failed prerequisite make a phase `blocked`, or should status and
   readiness remain separate fields?
7. Should phase activation use only positive bindings, with no deactivation map?
   If multiple phases bind one feature, is activation `all` or `any`?
8. Should dates remain profile data, or must organisers change phase schedules
   through event-backed configuration? Note that
   [`engineering/deployment.md`](../../engineering/deployment.md) currently
   specifies the scoped deadline schedule as profile `meta`, and
   [`D12`](../../../decisions.md#d12--weights-live-in-code) makes changing profile
   data a deployment.
9. Should phase projection receive `now` directly, or should a request context
   derive all temporal statuses outside the pure domain core?
10. Does the workshop-plan track adoption fit inside M8's remaining scope as
    recommended above, or does it need its own milestone entry?

## Related files

- [decisions.md](../../../decisions.md)
- [roadmap.md](../../roadmap.md#m8--organiser-authored-workshop-programme)
- [modules/contract.md](../../modules/contract.md)
- [modules/family-preferences.md](../../modules/family-preferences.md#11-screens-controls-reports-and-emails)
- [application/release-control.md](../../application/release-control.md)
- [application/family-view.md](../../application/family-view.md)
- [deferred-ideas/call-for-papers.md](../../deferred-ideas/call-for-papers.md#2-lifecycle)
- [engineering/deployment.md](../../engineering/deployment.md)
- [ui/frontend.md](../../ui/frontend.md)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
- [ui/screens/family-preferences.md](../../ui/screens/family-preferences.md)
- [043 — module-contributed feature model](043-feature-model.md)
- [042 — unsupported workflow promises and orphaned UI](../archived/042-remove-unsupported-workflow-promises-and-orphaned-ui.md)
- [031 — family projection privacy boundary](031-family-projection-privacy-boundary.md)
- [archived 008 — milestone ordering and release-control prerequisites](../archived/008-milestone-ordering-release-control-prereqs.md)
- [archived 009 — deadline concept fields underspecified](../archived/009-deadline-concept-fields-underspecified.md)
- [docs/application/organiser-view.md](../../../docs/application/organiser-view.md)
- [src/app/components/shared/ui/workflow-stepper.tsx](../../../src/app/components/shared/ui/workflow-stepper.tsx)
- [src/app/organiser/screens/workshops.tsx](../../../src/app/organiser/screens/workshops.tsx)
- [src/app/organiser/screens/workshop-allocation.tsx](../../../src/app/organiser/screens/workshop-allocation.tsx)
- [src/app/organiser/screens/inventory.tsx](../../../src/app/organiser/screens/inventory.tsx)
- [src/config/define.ts](../../../src/config/define.ts)
