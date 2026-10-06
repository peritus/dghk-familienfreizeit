---
id: "043"
title: Define module-contributed features and their effective availability
status: resolved
severity: gap
category: kernel
source: specification review of module-contributed feature availability
related_decisions: [D11, D12, D14, D19, D20, D24, D30]
related_milestones: [M8, M10, M12]
opened: 2026-10-06
---

# Define module-contributed features and their effective availability

## Dependencies

This issue has no prerequisite. It blocks
[044 — phase activation model](044-phase-model.md), which activates the features
defined here. Its design and implementation are independent of
[042 — unsupported workflow promises and orphaned UI](042-remove-unsupported-workflow-promises-and-orphaned-ui.md).

## Problem

The application has no concept of a product capability that can be selected,
switched off, and reasoned about. It has modules, and it has prose.

The profile selects whole modules. [`ProfileModule`](../../../src/config/define.ts)
carries `id`, `requires`, `enhances`, `parameters` and `contributions`; module
dependency is therefore expressible, but nothing smaller is. There is no feature
identity, no registry, no availability contract, and no way for a module to say
that one of its screens or actions is present while another is not.

In place of that contract, four unrelated and untyped mechanisms decide today
whether a capability exists:

1. **Module selection.** An unselected module contributes nothing, per
   [`modules/contract.md` §4.2](../../modules/contract.md#42-when-a-module-is-not-selected).
   This is the only mechanism that is specified.
2. **Reserved-until-built navigation.** Product views are "reserved and are not
   rendered in navigation until their screens exist", per
   [`ui/screens/workshops.md`](../../ui/screens/workshops.md).
3. **A prose inventory.** The "Current limits" paragraph in
   [`docs/application/organiser-view.md`](../../../docs/application/organiser-view.md)
   is the de facto list of what the product can do, maintained by hand.
4. **Orphaning.** A component tree with no route reaching it, while its copy still
   advertises the capability. This mechanism is invisible: see
   [042](042-remove-unsupported-workflow-promises-and-orphaned-ui.md) for the
   cleanup inventory, including copy that promises capabilities represented by
   component files with no production importer.

The fourth is the strongest argument for this issue. Nothing in the repository can
currently state that a capability is absent, so absence is expressed by deleting a
route and leaving the promise behind.

Operationally the picture is similar. The only runtime switches are five
development bindings in
[`src/worker/environment.d.ts`](../../../src/worker/environment.d.ts): four named
`DGHK_DEBUG_ONLY_DANGEROUS_*` and `DGHK_DEBUG_ONLY_LOCAL_PREVIEW_HOST`, each
documented as "local-only development adapter; production must leave this unset". They are not a feature mechanism and
must not become one by accident.

## Evidence

### The specification currently denies what this issue proposes

Two documents state the opposite of an operational switching layer:

> There are no hidden presets and no runtime feature flags that can change solver
> semantics after deployment.
>
> — [`profiles/contract.md`](../../profiles/contract.md)

> This resembles feature flags at the selection boundary, but module composition is
> a build-time property rather than a runtime rollout switch.
>
> — [`architecture/overview.md`](../../architecture/overview.md)

And [`D19`](../../../decisions.md#d19--one-monolith-in-one-repository-deployed-as-a-whole)
binds selection to the build:

> The occasion profile selects which modules are active (D12, modules); selection
> happens inside that one build, not by combining separately built parts.

This issue therefore proposes a **new capability**, not a consolidation of an
existing one. That must be accepted explicitly rather than assumed.

### Terminology is already heavily overloaded

"Feature" is taken five times over, and "capability" is taken too:

| Existing sense | Where |
|---|---|
| Room amenity, user-visible | [`docs/ui/assignment-board.md`](../../../docs/ui/assignment-board.md), [`docs/ui/design-system.md`](../../../docs/ui/design-system.md) |
| Milestone vertical slice | [`roadmap.md`](../../roadmap.md) |
| Runtime flag, as a denied concept | [`profiles/contract.md`](../../profiles/contract.md) |
| Release-control capability; organiser-only capability | [`architecture/glossary.md`](../../architecture/glossary.md), [`decisions.md`](../../../decisions.md) |
| Resolver room/space capability | [`architecture/labels-and-constraints.md`](../../architecture/labels-and-constraints.md) |
| Bundle-size budget | [`docs/engineering/testing.md`](../../../docs/engineering/testing.md) |

Adjacent collisions the contract must also avoid: `stage` is a solver stage
([`modules/contract.md` §4.1](../../modules/contract.md#41-stage-order)), `phase`
is already used for a solver pass in
[`engineering/testing.md`](../../engineering/testing.md), and `toggle` is a family
control kind in
[`modules/family-preferences.md`](../../modules/family-preferences.md).

There is also a type-level precedent for unreachable feature state: the status
tones `draft` and `held` exist in
[`src/app/organiser/ui-types.ts`](../../../src/app/organiser/ui-types.ts) and no
code ever emits either. A typed feature state that nothing can produce is the
failure mode this contract must not reproduce.

## Terminology

- **Feature** — a product capability that can be selected, operationally
  switched, and activated by a phase. It may expose a screen, control,
  projection, or action.
- **Feature definition** — the code-owned, typed contract for a feature: its
  owner, audience, subject kind, actions, dependencies and phase bindings.
- **Feature action** — a concrete operation such as "Rangfolge abgeben" or
  "Plan festlegen".
- **Feature availability** — the derived result of declaration, selection,
  operational state, phase state, readiness and authorisation.

Naming remains open; see open question 1. The contract must choose a term that
survives the collisions tabled above, and `Feature` on its own may not.

## Proposed model

### Feature definitions

A feature is declared by code and owned by a selected module or the kernel. A
conceptual shape:

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
contract must use the repository's existing typed identities, module composition,
authorisation and localized-presentation conventions.

Features are not arbitrary booleans. Every feature id must be declared, typed,
owned and validated at profile-build time. Unknown feature references, duplicate
owners and incompatible subject kinds must fail profile composition.

### Effective availability

Feature state has separate layers:

```text
declared       feature exists in the selected code
selected       profile includes the feature or its module
operational    deployment has not switched it off, or has switched it on
phase_active   a governing phase currently activates it
ready          feature prerequisites and domain gates pass
authorised     the current principal may use it
effective      the feature may be offered to this audience
```

Composed:

```text
effective = declared
          ∧ (selected ∨ env_enabled)
          ∧ ¬env_disabled
          ∧ phase_active
          ∧ ready
          ∧ authorised
```

The accepted form of the operational layer is **two-way**: an environment control
may switch a declared feature on as well as off. This is a deliberate departure
from the narrower disable-only rule, and it carries the consequences recorded
under "Required decision amendments" below; it must not be adopted silently.

`declared` remains the hard floor. No environment control may conjure a feature
that the selected code does not contain, invent domain behavior, or alter phase
semantics.

These layers must remain individually legible in organiser diagnostics even when
a family view receives only the safe effective result.

### Features are not authorisation

The feature view tells a client what may be offered. It is not a permission grant.
The append path remains authoritative: ordinary authorisation, event schemas,
ownership, phase policy and domain invariants validate every submitted event. A
client must not gain access because a profile selected a feature or because a
view called it effective.

### Module contribution

A module contributes stable feature ids and owners, supported actions and
audiences, the domain facts that determine readiness, and typed outputs that
dependent modules may consume. It consumes typed contracts or normalized derived
facts — never another module's raw event payloads, never rendered copy, and never
a global registry keyed by arbitrary string.

The natural insertion point is a `features` contribution kind on
`ModuleContributions` in [`src/config/define.ts`](../../../src/config/define.ts),
specified in
[`modules/contract.md` §3.1](../../modules/contract.md#31-contribution-kinds).
Validation should follow the existing namespaced duplicate-guard pattern in
`validateModules`, which already reserves `stage:`, `rule:`, `preflight:`,
`entity:`, `event:`, `prefix:`, `route:`, `screen:`, `screen-id:`, `report:` and
`family-control:` keys, plus the kernel reserved-name tables beside them.

Three consequences for the contract document:

- the profile-build failure list in
  [`modules/contract.md` §4](../../modules/contract.md#4-composition) must gain
  unknown-feature, duplicate-owner and incompatible-subject failures;
- the unselected-module enumeration in
  [§4.2](../../modules/contract.md#42-when-a-module-is-not-selected) must gain
  "feature";
- the two authoritative contribution-kind lists in
  [`modules/contract.md`](../../modules/contract.md) currently disagree — the
  §3.1 table lists `event_mappings` and `typed_contributions`, which the
  `ModuleContributions` shape above it omits. Adding a kind must fix that drift
  rather than inherit it.

### Operational controls and attribution

Environment controls are deployment facts, not a second profile language. The
accepted two-way form makes attribution a hard requirement rather than a nicety,
because the running feature set can now differ from the built one in both
directions.

Build identity does not cover this today.
[`D20`](../../../decisions.md#d20--builds-and-compatibility-have-separate-identities)
identifies configuration by `build_revision` precisely because configuration is
repository code, and
[`engineering/deployment.md`](../../engineering/deployment.md) states that
deployment facts must not enter `build_revision` or `compatibility_revision`. A
feature set altered by environment is therefore, as the mechanism stands,
unattributable: the health response described in
[`docs/architecture/profile-composition.md`](../../../docs/architecture/profile-composition.md)
reports both revisions and says nothing about environment state.

Closing that gap is in scope for this issue. Two existing precedents should be
reused rather than replaced:

- **Self-announcement.** `warnDangerousDevelopmentBindings` in
  [`src/worker/index.ts`](../../../src/worker/index.ts) logs every dangerous
  binding that is set, and each such binding is additionally gated on a
  local-preview host. An operational feature control should be at least as loud.
- **Fail-closed production rejection.**
  [`engineering/deployment.md`](../../engineering/deployment.md) requires that
  text-file event mode "be rejected by production configuration even if an
  environment variable is accidentally present". The same posture should govern
  which controls are permitted to enable a feature in production at all.

One hard constraint: the Worker receives only an allowlisted set of bindings, per
[`docs/engineering/development.md`](../../../docs/engineering/development.md). A
new operational control is not free; it must be added deliberately.

## Required decision amendments

None of these may be worked around or quietly implemented in an alternative form.
Each is submitted here for review, per `AGENTS.md`.

| Target | Why it must change | Proposed direction |
|---|---|---|
| [`profiles/contract.md`](../../profiles/contract.md) — "no runtime feature flags" | Directly contradicts the operational layer | Narrow to: no control may change solver semantics, domain behavior, or phase meaning; switching a declared feature's availability is permitted and attributed |
| [`architecture/overview.md`](../../architecture/overview.md) — "build-time property rather than a runtime rollout switch" | Same contradiction | Same narrowing, stated at the selection boundary |
| [`D19`](../../../decisions.md#d19--one-monolith-in-one-repository-deployed-as-a-whole) | "selection happens inside that one build" becomes false for the operational layer | Amend to distinguish composition (build-time, unchanged) from availability switching (deployment-time, attributed) |
| [`D20`](../../../decisions.md#d20--builds-and-compatibility-have-separate-identities) | Build identity cannot describe the running feature set | Add an attribution surface for operational state, or state explicitly that identity covers code only and diagnostics carry the rest |
| [`D14`](../../../decisions.md#d14--family_facing-in-the-occasion-profile-drives-the-family-view) | "every trait that declares `family_facing` produces a control, in profile order" stops holding once availability gates controls | Amend to: every such trait produces a control where its governing feature is effective, in profile order |
| [`D24`](../../../decisions.md#d24--every-family-self-service-action-has-an-organiser-equivalent) | A per-audience feature could satisfy a family action with no organiser equivalent | Encode the pairing in the feature contract so composition fails rather than drifting |

[`D30`](../../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces)
is not amended but must be answered. It rejected a profile-selected policy value,
reasoning that branching behavior on profile policy "risks becoming the kind of
runtime-supplied executable rule occasion configuration must not contain", and
that with one active profile the flexibility had no consumer. A feature contract
with selection and fixed policy enums must explain why it differs — the honest
distinction being that feature selection changes whether a capability is offered,
not how the solver computes a result — or D30 reads as precedent against this
issue.

[`D11`](../../../decisions.md#d11--resolver-mechanisms-and-vocabulary-live-in-code-organiser-values-live-in-the-event-log)
and [`D12`](../../../decisions.md#d12--weights-live-in-code) are cited as
supporting precedent: profile data may select among fixed, code-owned options and
may not supply executable predicates. The feature contract inherits that rule
unchanged.

## Recommendation

1. Features are typed, module-owned product capabilities, declared in code and
   selected by the profile.
2. Feature availability is derived from declaration, selection, operational
   state, phase activation, readiness and authorisation, and those layers stay
   individually legible to organisers.
3. Environment controls may switch a declared feature's availability in either
   direction, may never create domain behavior or change phase semantics, and
   must be attributable wherever they differ from the built selection.
4. There is no general-purpose `FeatureEnabled` or `FeatureDisabled` domain
   event, and no feature table. Availability is derived per request.
5. The feature view is an offer, not a permission; the append path stays
   authoritative.
6. Features are contributed and validated through the existing module
   composition boundary, failing closed at profile build.
7. Phase activation is specified separately in
   [044](044-phase-model.md) and is the only mechanism that may activate or
   deactivate many features together.

## Acceptance criteria for the design

- The specification defines feature, feature definition, feature action and
  feature availability, using a term chosen against the collisions tabled above.
- It defines all six availability layers and their composition, including the
  two-way operational layer and the `declared` floor that bounds it.
- It states how profile selection and operational switching are validated at
  profile build and how each failure is reported.
- It states how an operational difference from the built selection is attributed,
  and in which surface an organiser can see it.
- It specifies the `features` contribution kind, its duplicate and reserved-name
  guards, and the three consequential edits to `modules/contract.md`, including
  the pre-existing contribution-kind list drift.
- It specifies how a module consumes another module's feature contract without
  inspecting raw events or rendered views.
- It keeps the feature view distinct from authorisation, in text.
- It records the decision amendments above as accepted or rejected before
  implementation begins.
- It states that email, delivery tracking and arrangement communication are out
  of scope.
- Once the accepted feature model is implemented, replace the hand-maintained
  "Current limits" feature inventory in
  [`docs/application/organiser-view.md`](../../../docs/application/organiser-view.md)
  with documentation of the verified feature view, and document feature-related
  profile validation in
  [`docs/architecture/profile-composition.md`](../../../docs/architecture/profile-composition.md).

## Open questions

1. Is `Feature` usable as the technical term given six existing senses of the
   word, or should the contract use a distinct name such as `PhaseFeature` or
   `Capability`-free alternative? The collision table above is the input to this
   choice.
2. Which features belong in the active profile's first implementation, and which
   remain deferred with the call-for-papers module?
3. Which environment controls are safe as two-way operational overrides, and
   which must remain disable-only or be rejected outright in production?
4. What is the attribution surface: an extension of the health response, a new
   organiser diagnostics view, or a value carried alongside `build_revision`?
5. What is safe to expose in a family view about a feature that is not yet
   effective — its existence, its timing, or nothing at all?
6. Does a feature need its own authorisation audience beyond the existing
   organiser/family projection split, or is audience purely presentational?

## Resolution

The contract is specified in [features](../../architecture/features.md).
Implementation is tracked in
[M8](../../roadmap.md#m8--organiser-authored-workshop-programme),
[M10](../../roadmap.md#m10--family-access-and-release-control) and M12 of the
[roadmap](../../roadmap.md); the outstanding requirements stay in `spec/` until
each part is implemented and documented in `docs/`.

Answers to the open questions:

1. The technical term is **feature**, defined in the
   [glossary](../../architecture/glossary.md). The room-assignment `features`
   field is renamed to `amenities` in the implementation, so the word has one
   meaning in code. Resolver capabilities keep their name.
2. The first set declares one feature per existing selected organiser screen and
   family control ([features](../../architecture/features.md) §8). Phase-bound
   actions are added by [044](044-phase-model.md); call-for-papers stays
   deferred.
3. Every declared feature of a selected module may be switched in either
   direction in every environment, including production, through one derived
   `DGHK_FEATURE_<ID>=on|off` binding per feature. An invalid value or an unknown
   feature fails closed, and a test keeps the Wrangler allowlist equal to the
   declared set.
4. Attribution is the startup log and `feature_overrides` in the health and
   organiser log responses. Defining and switching features is a
   system-administration task; the organiser diagnostics screen is accepted but
   deferred as [UI-15](../../deferred-ideas/feature-availability-ui.md), so the
   layers are not yet legible to organisers in the UI. The organiser feature view
   still carries every layer. Plans do not record operational state.
5. A family view reveals nothing about a feature that is not effective; what comes
   next is a phase-view concern under [031](../open/031-family-projection-privacy-boundary.md).
6. Audience is not an authorisation audience. It is enforced at profile
   composition to require an organiser equivalent for every family action, and
   availability can only narrow the family append path.

Decision amendments: [D14](../../../decisions.md#d14--family_facing-in-the-occasion-profile-drives-the-family-view),
[D19](../../../decisions.md#d19--one-monolith-in-one-repository-deployed-as-a-whole),
[D20](../../../decisions.md#d20--builds-and-compatibility-have-separate-identities) and
[D24](../../../decisions.md#d24--every-family-self-service-action-has-an-organiser-equivalent)
are amended as proposed, together with the narrowed statements in
[`profiles/contract.md`](../../profiles/contract.md) and
[`architecture/overview.md`](../../architecture/overview.md). D30 is not
amended here; whether the feature model reopens its rejection of
profile-selected policy is reviewed separately in
[046](../open/046-d30-review-against-feature-model.md). The feature contract
carries no solver policy values, so it does not depend on that review.

## Related files

- [architecture/features.md](../../architecture/features.md)
- [deferred-ideas/feature-availability-ui.md](../../deferred-ideas/feature-availability-ui.md)

- [decisions.md](../../../decisions.md)
- [roadmap.md](../../roadmap.md)
- [modules/contract.md](../../modules/contract.md#31-contribution-kinds)
- [modules/family-preferences.md](../../modules/family-preferences.md)
- [profiles/contract.md](../../profiles/contract.md)
- [architecture/overview.md](../../architecture/overview.md)
- [architecture/glossary.md](../../architecture/glossary.md)
- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [engineering/deployment.md](../../engineering/deployment.md)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
- [044 — phase activation model](044-phase-model.md)
- [042 — unsupported workflow promises and orphaned UI](042-remove-unsupported-workflow-promises-and-orphaned-ui.md)
- [031 — family projection privacy boundary](../open/031-family-projection-privacy-boundary.md)
- [docs/application/organiser-view.md](../../../docs/application/organiser-view.md)
- [docs/architecture/profile-composition.md](../../../docs/architecture/profile-composition.md)
- [docs/engineering/development.md](../../../docs/engineering/development.md)
- [docs/ui/assignment-board.md](../../../docs/ui/assignment-board.md)
- [docs/ui/design-system.md](../../../docs/ui/design-system.md)
- [docs/engineering/testing.md](../../../docs/engineering/testing.md)
- [src/config/define.ts](../../../src/config/define.ts)
- [src/worker/environment.d.ts](../../../src/worker/environment.d.ts)
- [src/worker/index.ts](../../../src/worker/index.ts)
- [src/app/organiser/ui-types.ts](../../../src/app/organiser/ui-types.ts)
