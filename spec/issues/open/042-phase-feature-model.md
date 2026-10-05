---
id: "042"
title: Define module-contributed features and phase activation
status: needs-decision
severity: gap
category: kernel
source: design discussion about workflow phases, deadlines, and module composition
related_decisions: [D28]
related_milestones: [M8]
opened: 2026-10-05
---

# Define module-contributed features and phase activation

## Problem

The application needs a durable concept for explaining what families and organisers
can do now, what becomes available next, and what happens when a target date or
closing point is reached. The current workshop stepper is only a presentational
primitive. Its screens infer state from local facts such as whether any workshops
or rankings exist, so it cannot express prerequisites, late states, blocked work,
explicit organiser decisions, or finer-grained workflows.

The current implementation demonstrates the gap:

- [`WorkflowStepper`](../../../src/app/components/shared/ui/workflow-stepper.tsx)
  accepts only `complete`, `current`, and `upcoming` states and explicitly does not
  own workflow state.
- The workshop overview treats the existence of at least one workshop as completion
  of authoring and makes “Wahl öffnen” current, even though no choice-opening fact is
  represented there. See [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx#L611-L666).
- The allocation screen makes review current when rankings exist, while the
  programme screen makes review current whenever workshops exist. See
  [`workshop-allocation.tsx`](../../../src/app/organiser/screens/workshop-allocation.tsx#L137-L171)
  and [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx#L922-L955).
- The family-preferences module provides a date and contact copy for broad
  accommodation and workshop scopes, but the contract does not represent whether a
  date is advisory, requires organiser review, or closes an action. See
  [`family-preferences.md`](../../modules/family-preferences.md#3-parameters).

This makes copy such as “Frist bis 31.3.2027. Späte Änderungen an Zimmerwünschen
bitte mit dem Organisationsteam abstimmen.” ambiguous. It does not tell the family
whether the action remains available, whether the date is only a target, or what the
next permitted choice is.

The repository already rejects a single persisted workshop phase. D28 requires the
workshop lifecycle to remain a set of independent event-backed facts while the UI
may summarize them as visible phases. See [`D28`](../../../decisions.md).
The deferred call-for-papers module demonstrates why finer-grained, concurrent
phases are needed: proposal submission and review can overlap with ordinary
workshop authoring and the current workshop choice cycle. See
[`call-for-papers.md`](../../deferred-ideas/call-for-papers.md#2-lifecycle).

The system needs a small, composable phase model with a general feature layer. A
feature is selected by the loaded profile, may be operationally disabled by the
deployment, and becomes available only when its phase and prerequisites allow it.
This is more general than a capability-only model while remaining derived rather
than a second persisted domain state.

## Scope

This issue plans the phase and feature model only. It deliberately excludes email,
notification delivery, delivery history, and the release-control mechanism for
communicating arrangements to families. “Communication” in this issue means only
that the application explains a phase, its timing, and its available choices.

In scope:

- typed features contributed by selected modules;
- profile selection and deployment-level operational controls;
- phases that activate and deactivate features through derived state;
- feature prerequisites, dependencies, actions, completion and audience;
- date-based, organiser-controlled, and hybrid phase windows;
- advisory target dates versus enforced closing dates;
- explicit organiser commitment events where a durable decision is required;
- derived phase and feature views for family and organiser surfaces;
- composition and consumption boundaries between modules;
- the relationship between fine-grained phases and the compact workshop stepper;
- compatibility with the deferred call-for-papers lifecycle;
- copy and accessibility requirements for upcoming, open, late, blocked, closed and
  completed phases or features;
- removal or supersession of existing competing phase, deadline and workflow paths
  during implementation.

Out of scope:

- sending email or tracking delivery;
- notification recipient selection or retries;
- arrangement visibility and `Communicated` events from
  [`release-control.md`](../../application/release-control.md);
- storing phase or feature state in a separate table;
- arbitrary executable phase or feature rules supplied by occasion configuration;
- implementing the runtime or changing the active profile in this planning issue.

## Terminology

The proposed vocabulary is:

- **Feature** — a product capability that can be selected, operationally disabled,
  and activated by a phase. It may expose a screen, control, projection, or action.
- **Feature definition** — the code-owned, typed contract for a feature, including
  its owner, audience, subject, actions, dependencies and phase bindings.
- **Feature action** — a concrete operation such as “Rangfolge abgeben” or
  “Plan festlegen”.
- **Feature availability** — the derived result of profile selection, deployment
  state, phase state, prerequisites and authorisation.
- **Phase** — a bounded lifecycle context that activates a set of features and has
  timing, prerequisites, outcomes and possible organiser transitions.
- **Phase track** — a human-facing grouping of related phases, such as the
  workshop-plan track or proposal-intake track.
- **Phase step** — the compact visual representation of a phase in a stepper. It is
  presentation, not domain state.
- **Phase dependency** — a typed prerequisite between phases, features, or module
  outputs. It is not an arbitrary relational lookup.
- **Target date** — a recommended completion point that may produce a late notice
  without disabling an action.
- **Closing date** — an enforced time after which an action is unavailable.
- **Commitment event** — a domain event recording an organiser decision that must
  survive reloads, affect later derivation, or establish a reviewed operational
  baseline.

“Activity” and “ability” are not proposed technical terms. “Capability” remains a
valid word for room and space abilities already present in the resolver domain, but
using it as the name for workflow features would create ambiguity. “Feature” is
intentionally broader: it can cover an action, screen, control, projection or
phase-activated product behavior.

## Proposed feature model

### Feature definitions

A feature is declared by code and owned by a selected module or the kernel. A
conceptual shape is:

```ts
type FeatureDefinition = {
  id: FeatureId
  owner: ModuleId
  subject_kind: EntityKind | null
  audience: 'family' | 'organiser' | 'both'
  actions: readonly FeatureActionId[]
  requires_features: readonly FeatureId[]
  requires_phases: readonly PhaseId[]
  activation_mode: 'all' | 'any'
}
```

This is a planning shape, not an instruction to add these exact fields. The final
contract must use the repository’s existing typed identities, module composition,
authorisation and localized-presentation conventions.

A feature may be:

- a family control, such as workshop ranking;
- an organiser action, such as committing a plan;
- a screen or report surface;
- a derived projection, such as proposal review findings;
- a module contribution that is available only when its owning module is selected.

Features are not arbitrary boolean values. Every feature ID must be declared, typed,
owned and validated at profile-build time. Unknown feature references, duplicate
owners and incompatible subject kinds must fail profile composition.

### Feature selection and effective availability

Feature state has separate layers:

```text
declared       feature exists in the selected code
selected       profile includes the feature/module
operational    deployment has not disabled it
phase_active   a governing phase currently activates it
ready          feature prerequisites and domain gates pass
authorised     the current principal may use it
effective      the feature may be offered to this audience
```

Conceptually:

```text
effective = declared
          ∧ selected
          ∧ operational
          ∧ phase_active
          ∧ ready
          ∧ authorised
```

These layers must remain distinguishable in organiser diagnostics even if a family
view receives only the safe effective result.

The profile is authoritative for occasion composition. It may select modules and
features, provide supported dates and copy, and choose among fixed policy options.
It must not supply arbitrary executable predicates or event handlers.

Environment variables are operational controls, not a second profile language. An
environment flag may disable a selected feature as a safety or rollout switch, but
must not activate an unselected feature, create new domain behavior, or silently
change phase semantics. If an operational override changes a user-visible feature,
the deployment identity and organiser diagnostics must make that fact attributable.

### Phase activation

Features should declare the phases in which they are active rather than phases
mutating arbitrary feature flags at runtime:

```text
Feature: submit-workshop-ranking
  requires active phase: workshop-choice.open

Feature: review-workshop-allocation
  requires active phase: allocation-review

Feature: commit-workshop-plan
  requires active phase: allocation-review.ready
```

This keeps feature ownership with the feature while allowing phase transitions to
activate and deactivate many features together. A phase that is no longer active
automatically removes its bound features from effective availability.

There should be no general-purpose `FeatureEnabled` or `FeatureDisabled` domain
event. A feature becomes active because its phase facts changed, not because a
generic flag was stored in the event log.

If several phases can activate one feature, the feature’s activation mode must be a
fixed, typed rule. The first implementation should prefer one controlling phase or
an explicit `all`/`any` binding over arbitrary allow/deny precedence. Conflicting
phase activation must fail validation or be represented through separate feature
IDs; it must not be resolved by screen order.

### Features are not authorisation

The feature view tells a client what can be offered. It is not a permission grant.
The append path remains authoritative: ordinary authorisation, event schemas,
ownership, phase policy, and domain invariants validate every submitted event.

A client must not gain access merely because a feature was selected in a profile or
because a phase view says an action is effective. Conversely, a feature may be
available to an organiser while a family receives no corresponding feature because
the audience projection suppresses it.

## Phase model

### Phase as a bounded lifecycle context

A phase groups and activates features while providing a temporal and dependency
context. A conceptual shape is:

```ts
type PhaseStatus =
  | 'upcoming'
  | 'open'
  | 'late'
  | 'blocked'
  | 'closed'
  | 'complete'

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

The final type may differ. The important boundary is that phase definitions and
phase views are derived and typed; there is no global persisted `current_phase`.

Phases may be sequential, concurrent, conditional, or repeated for different typed
subjects. A phase graph is the dependency relation between phases and their typed
outputs. “Flow” remains useful as a description of that graph, but it need not be a
domain object, API noun, or configuration section.

### Phase tracks and steps

A track is a presentation grouping:

```text
Workshop plan
  Workshops anlegen
  Wahl öffnen
  Zuordnung prüfen
  Festgelegt

Call for papers
  Vorschläge einreichen
  Vorschläge prüfen
  Ausschreibung schließen
```

The existing stepper should render a selected track from central phase views. It
must not calculate status from local booleans such as `has_workshops` and
`has_answers`.

Multiple tracks may be active simultaneously:

```text
Zimmerwünsche:   late, still editable
Workshopwahl:    open
Ausschreibung:   organiser review
Zuordnung:       blocked by two unplaced workshops
```

### Phase status

Statuses are derived labels, not all durable transitions:

- `upcoming` means the phase’s schedule has not started;
- `open` means its timing and prerequisites permit its features;
- `late` means an advisory target passed while actions remain available;
- `blocked` means a prerequisite or domain finding prevents progress;
- `closed` means a hard date or explicit close prevents the relevant actions;
- `complete` means the phase outcome exists according to its owner’s contract.

An organiser may still need to commit a phase’s ready result explicitly. Readiness,
completion, and commitment are separate concepts.

## Transition model

There should be no generic `PhaseAdvanced` event. Different transitions have
different meanings and should use the mechanism appropriate to that meaning.

### Scheduled transitions

Profile or occasion schedule data may define predictable phase boundaries:

```text
starts_at: 2027-04-01
target_at: 2027-04-04
closes_at: null
late_policy: warn
```

The system derives `upcoming`, `open`, and `late` without writing clock-transition
events. The current profile’s advisory deadline behavior belongs to this category:
late family edits remain ordinary authorised events, while the UI explains that the
target has passed. See [`family-preferences.md` §11](../../modules/family-preferences.md#11-screens-controls-reports-and-emails).

If a date actually prevents an action, the model must say so explicitly with a
closing policy. The UI must not call an advisory target a hard “Frist”.

### Organiser-controlled transitions

Use a domain-specific event when an organiser makes a durable decision:

```text
WorkshopChoiceOpened
ProposalCallClosed
WorkshopPlanCommitted
```

The button is only the command entry point. The server validates the current derived
facts and appends the event atomically. The event should record references to the
reviewed input and subject, not duplicate an entire derived plan. A later correction
should be a new domain event or commitment, not mutation of the old event.

Potential commitment events include:

- opening or closing a proposal intake;
- opening a workshop choice phase;
- committing a reviewed schedule or allocation;
- explicitly fixing an organiser decision that automatic calculation must preserve.

The exact event names and payloads remain open. They must be owned by the relevant
module or kernel boundary rather than by a generic phase subsystem.

### Hybrid transitions

Some phases need both schedule and organiser control:

```text
proposal intake:
  cannot open before the configured start date;
  organiser may close it early;
  a hard closing date may close it automatically.

workshop choice:
  organiser opens it after the catalogue is valid;
  the profile supplies a target date;
  the current policy may keep late edits open.
```

The phase contract should identify the policy explicitly. Screens must not infer
whether a button or a date is authoritative.

### Derived readiness and review

Readiness is often not a transition at all:

```text
all proposals reviewed       → proposal-review is complete
all workshops placed         → schedule-review is ready
answers plus valid plan       → allocation-review is ready
blocking finding exists       → allocation-review is blocked
```

The phase may expose a `commit` feature only after readiness passes. The commit event
then records the organiser’s decision; it does not merely flip a UI flag.

## Module contribution and consumption

Selected modules should contribute typed phases and feature definitions through the
same composition boundary used for other module-owned facts. The existing contract
already provides related extension points such as typed contributions, stages,
preflight checks, world summaries, world checks and release scopes. See
[`modules/contract.md` §3.1](../../modules/contract.md#31-contribution-kinds).

### A module contributes

- stable phase IDs and subject kinds;
- stable feature IDs and feature owners;
- supported feature actions and audiences;
- phase windows and fixed transition-policy types;
- phase prerequisites and feature bindings;
- the domain facts that determine readiness, blockers and completion;
- event-backed transitions owned by that module;
- typed outputs that dependent modules may consume;
- audience-safe presentation metadata where appropriate.

### A module consumes

- typed phase contracts or normalized derived facts from dependencies;
- prerequisite phase outcomes through declared dependency ports;
- feature availability contracts where a domain action genuinely depends on them;
- upstream solver or world summaries through existing typed contribution boundaries.

Modules must not:

- inspect another module’s raw event payloads;
- query a global feature registry by arbitrary string;
- consume rendered German/English copy to make domain decisions;
- use a screen-local feature lookup as a relationship resolver;
- create a second identity for an entity already owned by another module;
- use an environment flag to replace an event-backed domain decision.

The call-for-papers example would therefore work as follows:

```text
call-for-papers contributes:
  proposal-submission phase
  proposal-review phase
  submit-proposal and review-proposal features
  proposal outcome facts

official-workshops consumes:
  approved proposal outcomes

workshop-rankings consumes:
  the current active workshop catalogue and choice-phase availability

workshop-scheduling consumes:
  active workshop identities, spaces and slots

workshop-assignment consumes:
  rankings, programme eligibility and schedule readiness
```

An approved proposal becomes the ordinary typed `workshop` identity. It does not
create a parallel proposal-specific workshop lifecycle. This preserves the deferred
module’s stated boundary and D28’s direct workshop identity.

## Examples for the active profile

| Phase | Features | Transition policy | Consumes | Produces |
|---|---|---|---|---|
| Accommodation preferences | view and edit preference controls | Scheduled advisory target | Profile schedule and family eligibility | Editable controls and late status |
| Workshop authoring | add and edit workshop | Derived readiness plus organiser actions | Workshop event facts | Workshop catalogue readiness |
| Workshop choice | view catalogue, submit/edit ranking | Organiser open, advisory target | Active catalogue and eligibility | Choice availability for ranking |
| Allocation review | inspect demand, findings and trace | Derived readiness, explicit organiser commit | Rankings, programme and schedule readiness | Review findings and committed-plan reference |
| Proposal submission | submit/edit own proposal | Scheduled or hybrid | Call configuration and proposer eligibility | Proposal entities and submission status |
| Proposal review | inspect, accept or reject proposal | Organiser-controlled | Submitted proposals | Outcomes and workshop identity requests |
| Schedule review | inspect placements and conflicts | Derived readiness, explicit organiser decision | Workshops, slots, spaces and constraints | Placement findings and review status |

The table is a design inventory, not approval that the deferred module becomes
active or that all listed phases belong in M8.

## Audience-specific views and German UI language

The same feature and phase may produce different views for families and organisers:

```text
family:
  “Workshopwahl offen. Rangfolge bis 15. April möglich.”

organiser:
  “Wahlphase offen. 42 Personen haben geantwortet; 7 Antworten fehlen.”
```

The feature model should not leak into ordinary UI wording. Preferred German terms
are:

| Technical concept | UI wording |
|---|---|
| phase | **Phase** |
| phase track | **Ablauf** or a named area such as **Workshopwahl** |
| phase step | **Schritt** |
| feature action | concrete wording such as **Rangfolge abgeben** |
| target date | **Zieltermin** |
| closing date | **Eingabeschluss** |
| prerequisite | **Voraussetzung** |
| blocked | **Prüfung erforderlich** or a concrete blocker |

Families should see safe phase names, dates, actions and explanations. Organisers
may see blockers, findings, counts, traces and dependency details. Neither view
should expose email or arrangement-release mechanics through this phase/feature
contract.

Every visible phase or feature should answer:

1. What is this phase for?
2. What can this audience do now?
3. What is the relevant target or closing date?
4. What happens after that date or action?

Examples:

```text
Zieltermin: 31. März 2027
Änderungen bleiben danach möglich, werden aber als verspätet markiert.
```

```text
Eingabeschluss: 31. März 2027
Danach können Familien ihre Zimmerwünsche nicht mehr selbst ändern.
```

These are different policies and must not share the same generic deadline copy.

## Recommended derivation boundary

The implementation should preserve the existing event-sourced architecture:

```text
events + config
  → derive(events, config)
  → module facts, plans, findings and commitment references
  → derivePhases(derived, schedule, now)
  → deriveFeatureAvailability(phases, profile, environment, principal)
  → phase tracks, stepper, notices and controls
```

`derive(events, config)` remains deterministic and does not persist folded domain
state. Time-sensitive phase status should receive `now` explicitly in the
presentation or phase-projection layer. Historical or audited decisions must use
event-backed commitments rather than relying on a later clock evaluation.

The feature view may be cached within one request if needed, but no feature table,
phase table, or screen-owned workflow state should be introduced.

## Consolidation and cleanup requirement

Implementation of this model must include an inventory of existing phase, deadline,
workflow, feature and commitment mechanisms. It is not sufficient to add a new
phase/feature layer alongside the current local heuristics.

The implementation change must classify every affected item as one of:

- retained because it is a generic rendering primitive;
- migrated to the central phase/feature projection;
- replaced by a typed module contribution or domain event;
- removed because it is a duplicate or misleading implementation;
- updated as verified documentation of the new behavior;
- retained as an explicitly outstanding requirement in `spec/`.

The inventory must include at least:

- screen-local `has_workshops`, `has_answers`, placement and phase calculations;
- stepper and phase-notice copy that implies unsupported transitions;
- profile deadline fields and contact copy whose semantics are not represented;
- prototype-only numeric phase state and fixed-plan behavior;
- documentation that says phases are only a summary or that deadlines are merely
  advisory, once the accepted model changes those claims;
- specifications and decisions that describe a competing workflow, feature or
  transition mechanism.

Mandatory decisions must not be silently deleted. If the accepted model changes D28,
the deadline policy, or another binding decision, the decision entry and every
dependent document must be updated in the same change. The final implementation
must leave one authoritative phase/feature contract and no competing
half-implemented path.

This cleanup is part of implementation acceptance, not optional follow-up work.

## Recommendation

Adopt the following model:

1. Phases are bounded lifecycle contexts, not one global enum.
2. Features are typed, module-owned product capabilities selected by the profile.
3. Environment variables may operationally disable selected features, but may not
   define or activate new domain behavior.
4. Phases activate features through typed bindings; features are not mutated by
   generic flag events.
5. Feature availability is derived from declaration, profile selection, operational
   state, phase state, readiness and authorisation.
6. Dates determine scheduled phase status and late notices.
7. Domain-specific organiser events record durable decisions and commitments.
8. Readiness, blockers and completion are derived from ordinary module facts.
9. Modules consume typed phase/feature contracts or normalized facts, not rendered
   views or raw events.
10. The existing workshop stepper becomes an adapter over the central phase view.
11. Email, delivery and arrangement communication remain outside this contract.
12. Implementation must remove or supersede the existing competing paths in the same
   change, with explicit decision updates where required.

This is the smallest model that supports the workshop workflow, advisory deadlines,
profile composition, operational kill switches, and future finer-grained lifecycles
such as call for papers without introducing a second domain state store.

## Acceptance criteria for the design

- The specification defines `Feature`, feature definition, feature action, feature
  availability, `Phase`, phase track, phase step, phase dependency, target date,
  closing date and commitment event.
- It defines the layers of effective feature availability: declaration, profile
  selection, operational state, phase activation, readiness and authorisation.
- It defines the status derivation for upcoming, open, late, blocked, closed and
  complete phases.
- It specifies which transitions are scheduled, organiser-controlled, hybrid, or
  purely derived.
- It specifies how a module contributes phases and features and how another module
  consumes typed phase/feature contracts without inspecting raw events or UI views.
- It documents target dates separately from hard closing dates and replaces ambiguous
  deadline semantics with an explicit policy vocabulary.
- It shows the workshop-plan and call-for-papers examples without introducing a
  second workshop identity or a global phase enum.
- It defines the audience boundary for family and organiser phase/feature views.
- It states that email, delivery tracking, arrangement communication and notification
  history are excluded.
- It gives the existing stepper a clear adapter role and identifies the first phase
  projection it should consume.
- It identifies the event payload requirements for proposed organiser commitments
  without storing a derived plan snapshot.
- It defines how profile selection and environment disablement are validated and
  attributed.
- It inventories and classifies existing competing phase, deadline, workflow and
  feature mechanisms, with removal or supersession included in implementation
  acceptance.
- It records the accepted choices below before implementation begins.

## Open questions

1. Is `Feature` the right general term, or should the technical contract use a more
   specific name such as `PhaseFeature` to avoid confusion with deployment flags?
2. Which features belong in the active profile’s first implementation, and which
   remain deferred with the call-for-papers module?
3. Should workshop choice opening always require an organiser event, or may a profile
   schedule open it automatically after prerequisites are satisfied?
4. Which phases need an explicit close event, and which only have an advisory target
   date?
5. Is `Festgelegt` a schedule commitment, an attendance-allocation commitment, a
   combined organiser plan commitment, or a misleading label that should be split?
6. Should schedule and allocation commitments be separate events because they have
   different subjects and review boundaries?
7. Can an organiser reopen a closed phase? If yes, is reopening a new event with an
   audit trail, or is it only possible by configuring a new phase instance?
8. Should a failed prerequisite make a phase `blocked`, or should status and
   readiness remain separate fields?
9. Should phase activation use only positive bindings, with no explicit deactivation
   map? If multiple phases bind the same feature, should activation require all or any
   of them?
10. Should dates remain profile data, or must organisers be able to change phase
    schedules through event-backed configuration?
11. Which environment controls are safe as disable-only operational overrides, and
    how should they appear in organiser diagnostics?
12. What information is safe to expose in the family view before a phase opens?
13. Should phase projection receive `now` directly, or should a request context derive
    all temporal statuses outside the pure domain core?
14. Which phase states, feature availability combinations and transition events need
    browser/API fixtures before implementation can be considered complete?
15. Does this work belong within M8, or should the phase/feature contract become a
    cross-cutting prerequisite milestone before further organiser workflow work?

## Related files

- [decisions.md — D28](../../../decisions.md)
- [modules/contract.md](../../modules/contract.md#31-contribution-kinds)
- [modules/family-preferences.md](../../modules/family-preferences.md#3-parameters)
- [modules/family-preferences.md — screens, controls, reports and emails](../../modules/family-preferences.md#11-screens-controls-reports-and-emails)
- [deferred-ideas/call-for-papers.md](../../deferred-ideas/call-for-papers.md#2-lifecycle)
- [application/release-control.md](../../application/release-control.md)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
- [docs/application/organiser-view.md](../../../docs/application/organiser-view.md)
- [roadmap.md — M8](../../roadmap.md#m8--workshop-planning-completion)
- [src/app/components/shared/ui/workflow-stepper.tsx](../../../src/app/components/shared/ui/workflow-stepper.tsx)
- [src/app/organiser/screens/workshops.tsx](../../../src/app/organiser/screens/workshops.tsx)
- [src/app/organiser/screens/workshop-allocation.tsx](../../../src/app/organiser/screens/workshop-allocation.tsx)
