# Features

A feature is a capability that a selected module offers to one audience —
families or organisers — and that can be selected by the profile, switched by
deployment, and activated by a phase. This
document is the contract for declaring features, composing them, and deriving
their effective availability. Module composition is specified in
[modules](../modules/contract.md); phase activation is specified in
[phases](phases.md).

The [implemented profile composition](../../docs/architecture/profile-composition.md)
is the foundation this contract extends. Nothing below is implemented yet.

## 1. Terminology

- **Feature** — a module-owned capability offered to exactly one audience, such
  as families stating room wishes. Its identity is a typed `FeatureId`.
- **Audience** — `family` or `organiser`. The same capability offered to both
  audiences is two features, each with its own id and availability, offered
  through its own variant of the editing components.
- **Feature definition** — the code-owned, typed contract for one feature: owner,
  audience, subject kind, dependencies, phase bindings, readiness, and for a
  family feature its organiser counterpart.
- **Governed section** — a [family preferences](../modules/family-preferences.md)
  section whose profile entry names the feature. The feature governs every control
  in that section — profile-trait controls and module controls alike — in the
  renderer for its audience: the family view for a family feature, organiser
  family detail for an organiser feature.
- **Feature availability** — the derived result of the layers in §4 for one
  feature and principal.
- **Feature view** — the derived set of availability results that a response
  carries to a client.

Organiser workflow actions — authoring, review, opening workshop choice, closing
and reopening an area — are not features. They are always present on the
organiser screens of a selected module.

The word is used in this technical sense only. A physical attribute of a room is a
room **amenity** ("Merkmal" in German copy), a resolver match target is a
**capability** ([labels and constraints](labels-and-constraints.md)), and a
roadmap milestone is a **vertical slice**. Feature copy never appears in
family-facing German text; screens name the concrete action instead.

## 2. Ownership and identity

Every feature is owned by exactly one module. The kernel declares no features:
it is present in every deployment ([modules](../modules/contract.md) §1), so a
kernel surface has nothing to select or switch.

A feature id is `<module-id>.<feature>`, both parts kebab-case, following the
stage-id pattern ([modules](../modules/contract.md) §4.1). The feature part of a
family feature starts with `family-` and that of an organiser feature with
`organiser-`, so `family-preferences.family-room-wishes` and
`family-preferences.organiser-room-wishes` are the two audiences of one
capability. Ids are stable; a feature is never redefined to mean something
different, and a new id replaces it.

Profile data selects among declared features and may not supply executable
predicates (D11, D12). Feature selection changes whether a capability is
offered and never how a result is computed: a feature definition carries no
solver parameter, rule, weight, or policy value.

## 3. Feature definitions

A module declares its features through the `features` contribution kind
([modules](../modules/contract.md) §3.1). The shape uses the existing typed
identities; this is the contract, not an illustrative sketch:

```ts
type FeatureDefinition = {
  id: FeatureId                               // '<module-id>.<audience>-<feature>'
  audience: 'family' | 'organiser'
  subject_kind: EntityKind | null             // the entity the feature acts on, if any
  requires_features: readonly FeatureId[]     // must be effective for this one to be
  requires_phases: readonly PhaseId[]         // phases.md §4
  activation_mode: 'all' | 'any'              // over requires_phases
  readiness?: FeatureReadiness                // module-owned, pure, over derived facts
  organiser_counterpart?: FeatureId           // required when audience is 'family' (D24)
}
```

A family-preferences section names its governing features through
`sections[].features`, at most one per audience
([family preferences](../modules/family-preferences.md) §3). Each feature governs
the section's controls, and through them the label keys those controls write, in
the renderer for its audience. A section without a feature for an audience is
ungoverned for that audience: its controls are offered whenever authorisation
permits, and no layer below applies to them.

`readiness` is a pure function the owning module supplies over its own derived
facts or its typed contributions. It returns `ready` or a typed not-ready reason
with a module-owned finding id; it never reads raw events, rendered views, or a
global string-keyed registry.

A feature must not be declared before a production code path consumes it; this
is a design-review obligation. A declared feature that no section of the profile
names governs nothing and is inert.

### Consuming another module's feature

A module that depends on another module's feature lists it in
`requires_features` and requires the owning module in its own `requires`. It
receives the dependency's availability only through the feature view, and the
dependency's facts only through `typed_contributions`. It never inspects the
owning module's raw event payloads, rendered copy, or screens.

## 4. Effective availability

Availability has seven layers. Each is computed independently and stays
individually inspectable (§7):

| Layer | Meaning | Source |
|---|---|---|
| `declared` | A selected module defines the feature | Composed profile |
| `selected` | The profile selects the feature | Composed profile |
| `operational` | A deployment binding switched it on or off, or none is set | Worker environment (§6) |
| `phase_active` | A governing phase currently activates it | Phase view; `true` when `requires_phases` is empty |
| `ready` | Its readiness and `requires_features` pass | Module readiness over derived facts |
| `authorised` | The current principal belongs to the feature's audience | Session principal |
| `effective` | The feature may be offered to this principal | Composition below |

```text
effective = declared
          ∧ (selected ∨ env_enabled)
          ∧ ¬env_disabled
          ∧ phase_active
          ∧ ready
          ∧ authorised
```

The family and organiser features of one capability are independent: either may
be effective while the other is not.

`declared` is the hard floor. Every module is compiled into every build (D19),
so `declared` means *defined by a module the profile selects*. A feature of an
unselected module is not declared: no binding can enable it, because the
module's entity kinds, events, and label keys are not registered.

A selected module selects all of its features by default. A profile may
deselect individual features through the kernel-owned `deselected_features`
parameter of the module's entry ([occasion profiles](../profiles/contract.md)
§1); it cannot select a feature of a module it does not select.

Availability is derived per request after `derive(events, config)`, from the
derived world, the composed profile, the operational state, the phase view, and
the principal. `derive` itself stays pure and receives none of these inputs
(D15, D26). Nothing about availability is persisted: there is no feature table
and no `FeatureEnabled` or `FeatureDisabled` event.

### Features are not authorisation

The feature view says what may be offered. It never grants access: a principal
does not gain the ability to append an event because a feature is selected or
effective. The append path remains authoritative and validates every event
against ordinary authorisation, event schemas, ownership, phase policy, and
domain invariants.

Availability can only narrow what the append path accepts. A family-authored
`LabelSet` or `LabelCleared` whose label key belongs to a control in a section
governed by a family feature is rejected on append when that feature is not
effective for the family. Organiser-authored events are not gated by
availability: the organiser retains full authority, and an organiser feature
that is not effective is only absent from the organiser UI.

### Renderers

Each renderer offers a governed section only while the section's feature for its
audience is effective: the family view uses the family feature, organiser family
detail the organiser feature. The two renderers use variants of the same control
components.

The family wish features bind their phase; the organiser wish features bind none
(§8), so closing an area removes the family feature and leaves the organiser
feature effective. While the section's family phase is closed, organiser family
detail shows a **Festgelegt** note, and organiser edits feed the area's difference
from its closed result ([phases](phases.md) §7).

The family projection contains only family features that are effective for that
family. A feature that is not effective is absent: the family view does not
reveal its existence, timing, or reason. Explaining what comes next to a family
belongs to the phase view, under the
[family projection privacy boundary](../issues/open/031-family-projection-privacy-boundary.md).

### Organiser parity

Every family feature names its `organiser_counterpart`: an organiser feature of
the same module that offers the same writes through the organiser variant
(D24). Composition fails when it is missing or does not name an organiser
feature. The counterpart's availability is still independent at runtime.

## 5. Composition and validation

`defineOccasionProfile` validates features at profile build, alongside the
other contribution guards, and fails the build when:

- two modules contribute the same feature id (`feature:` duplicate key);
- a feature id is not `<owning-module-id>.<audience>-<kebab-case>` for its
  audience;
- a family feature has no `organiser_counterpart`, or it names anything other
  than an organiser feature of the same module; an organiser feature names one;
- a `requires_features` entry names an unknown feature, a feature of a module
  that is not selected, or a feature of a module the owner does not `require`;
- `requires_features` forms a cycle;
- a `requires_phases` entry names an unknown phase ([phases](phases.md) §2);
- a `subject_kind` is not an entity kind of a selected module or the kernel, or
  differs from the subject kind of a feature it requires when both are set;
- a family-preferences section names an unknown feature, a feature of a module
  that is not selected, or two features of one audience;
- the profile deselects an unknown feature or a feature of another module;
- two feature ids map to the same operational binding name (§6).

Each failure names the feature id and the offending reference, matching the
existing composition error style.

## 6. Operational switching

An operational binding is a deployment fact, not a second profile language. It
switches availability of a declared feature in either direction and can never
create domain behavior, change solver semantics, or change phase meaning.

### Bindings

Each declared feature has exactly one optional Worker binding:

```text
DGHK_FEATURE_<ID>=on|off
```

`<ID>` is the feature id upper-cased with `.` and `-` replaced by `_`, so
`workshop-rankings.family-workshop-wishes` maps to
`DGHK_FEATURE_WORKSHOP_RANKINGS_FAMILY_WORKSHOP_WISHES`. `on` sets
`env_enabled`; `off` sets `env_disabled`; an absent binding leaves the built
selection in force. Both directions are permitted in every environment,
including production.

The Worker receives only allowlisted bindings
([development](../../docs/engineering/development.md)). Every declared feature's
binding is added to the binding allowlist and to `src/worker/environment.d.ts`
deliberately. A test derives the expected binding names from the composed
profile and fails when the allowlist or the environment type differs from that
set in either direction.

### Fail-closed validation

At startup and on every request the Worker validates every `DGHK_FEATURE_*`
binding it receives. A value other than `on` or `off`, or a binding that names
no declared feature — including a feature of an unselected module — is a
configuration error. The Worker then refuses to serve application routes, the
health response reports the invalid binding names, and the startup log names
each one. It never falls back to the built selection for a malformed binding.
This follows the posture already required for the text-file event source
([deployment](../engineering/deployment.md) §1).

### Attribution

Build identity covers code only (D20); operational state is attributed
separately and is never folded into `build_revision` or
`compatibility_revision`.

- **Startup log.** Every set feature binding is logged with its feature id and
  value, alongside the existing dangerous development-binding warnings.
- **Health response.** The response reports `feature_overrides`, the sorted list
  of `{ feature, value }` for every set binding, next to both revisions.
- **Organiser log response.** The log response carries the same
  `feature_overrides`, so the organiser application derives the same feature
  view locally as the Worker (D15). The organiser application refuses to derive
  when the overrides it holds differ from the Worker's, exactly as it does for
  a revision mismatch.

Plans and closing events do not record operational state. Features cannot
change how a plan is computed, so a plan is still reproduced from `input_seq`,
`build_revision`, and `compatibility_revision`.

## 7. Administration and diagnostics

Defining features and switching them is a system-administration task, not an
organiser workflow. Features are defined in module code and selected or
deselected in the profile; they are switched through the operational bindings in
§6. Organisers have no screen that shows or changes feature state; an organiser
feature that is not effective is simply absent from their UI. An organiser
diagnostics screen is accepted but deferred as
[UI-15](../deferred-ideas/feature-availability-ui.md).

The organiser feature view nevertheless carries, per declared feature, the value
of every layer in §4 — `authorised` evaluated for the feature's audience — the
source of `operational` (`built`, `env-on`, `env-off`), the not-ready reason and
finding id when `ready` is false, and the failing `requires_features` entry when
a dependency is not effective, so tests and a later diagnostics screen can
inspect each layer. The family feature view carries only the effective family
features, with no layer detail.

## 8. Feature set

The active profile has two capabilities per area, each offered as a family and an
organiser feature:

| Feature id | Audience | Capability | Governs | Requires phases | Readiness | Milestone |
|---|---|---|---|---|---|---|
| `family-preferences.family-room-wishes` | family | room wishes | section `room-wishes` | `family-preferences.accommodation-preferences` | — | M8 |
| `family-preferences.organiser-room-wishes` | organiser | room wishes | section `room-wishes` | — | — | M8 |
| `workshop-rankings.family-workshop-wishes` | family | the workshop catalogue and workshop wishes: ranking, sign-up, interest, and workshop companions | section `workshops` | `workshop-rankings.choice` | — | M8 |
| `workshop-rankings.organiser-workshop-wishes` | organiser | workshop wishes | section `workshops` | — | — | M8 |
| `room-assignment.family-room-allocation` | family | the closed room allocation | the family room result | — | the area has a closed result | M10 |
| `workshop-assignment.family-workshop-allocation` | family | the closed workshop allocation | the family workshop result | — | the area has a closed result | M10 |

The allocation features and their organiser counterparts are declared with the
family composition in [M10](../roadmap.md#m10--family-access-and-release-control),
which provides the family result they govern; until then no production code path
consumes them.

The sections `people` and `food` are not governed by a feature: they are
offered whenever authorisation permits.

The room-assignment board's `features` field and its uses are renamed to
`amenities` in the same implementation, so the term has one meaning in code.

## 9. Out of scope

Email and delivery tracking stay outside this contract. Phase definitions, status
derivation, target dates and closing belong to [phases](phases.md).

## 10. Verification

- Profile-build tests for every failure in §5.
- Availability tests for each layer in isolation and in combination, including
  `env_enabled` for a profile-deselected feature, `env_disabled` for a selected
  one, the `declared` floor for a feature of an unselected module, and a family
  feature not effective while its organiser counterpart is.
- Worker tests for fail-closed binding validation, the health and log
  `feature_overrides`, and the organiser derive refusal on an override mismatch.
- An allowlist consistency test over the composed profile.
- Append tests showing that a family-authored label write in a governed section
  is rejected when its family feature is not effective, that an ungoverned
  section is not gated, and that organiser-authored events are not gated.
- Family projection tests showing that a non-effective feature is absent.
- Organiser coverage showing that family detail keeps a governed section while
  its family phase is closed, with the **Festgelegt** note, and omits it when the
  organiser feature is switched off.
