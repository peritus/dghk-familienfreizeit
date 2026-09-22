# Modules

The application is a fixed platform kernel plus a set of selectable modules. An
occasion profile ([occasion profiles](../profiles/contract.md)) selects modules and
configures them; this document defines what a module is, how modules compose, and
which modules exist. Each module has its own specification, `spec/modules/<module-id>.md`.

## 1. Kernel and modules

The **kernel** is present in every deployment and is never listed in a profile:

| Kernel part | Specified in |
|---|---|
| Event envelope, append, replay, KDL event source | [events](../architecture/events.md), [implemented data model](../../docs/architecture/data-model.md) |
| Family and person identity, invitation, and person events | [events](../architecture/events.md) |
| Labels, fixed resolver operators, append validation | [labels and constraints](../architecture/labels-and-constraints.md) |
| `derive`, `diff`, the solver pipeline, determinism contract, preflight framework, trace | [architecture](../architecture/overview.md), [solver contract](../architecture/solver-contract.md) |
| Plans and release control | [solver contract](../architecture/solver-contract.md), [release control](../application/release-control.md) |
| Authentication, sessions, organiser allowlist | [authentication](../application/authentication.md) |
| Organiser application shell, board-independent screens, family view shell, reports framework, email transport | [organiser view](../application/organiser-view.md), [family view](../application/family-view.md), [reports](../application/reports.md), [deployment](../engineering/deployment.md) |

A **module** is a selectable unit of domain capability. It owns a mechanism — entity
kinds, events, the label keys it interprets, solver stages, diagnostics, screens,
reports, and test contracts — and exposes a typed parameter object through which a
profile supplies policy. A module never owns occasion vocabulary; it names the
*roles* a profile trait must fill and checks the trait's shape.

Nothing about the kernel is optional, so listing it in a profile would add noise
without adding a choice. Everything a profile can choose is a module.

### Kernel/profile boundary

M1 consumes a narrow, already-built validation view from the active profile. The
view supplies entity kinds, label schemas and ownership, replay aliases, event
value validators, and resolver descriptors such as requirement-to-capability
relationships. The kernel uses this view for append validation, replay, and
derivation; it does not build the profile or register modules.

M2 owns `defineOccasionProfile`, trait builders, module registration, dependency
checking, contribution composition, and construction of this validation view.
The view is the stable boundary between those milestones.

## 2. Authority

A module specification is the single authoritative description of its mechanism:
its events and payloads, built-in label keys, parameters, stage behaviour,
diagnostics, and outputs. Other documents link to it rather than restate it.

Screen interaction design stays in the [UI screen catalog](../ui/README.md) and the
[organiser](../application/organiser-view.md) and [family](../application/family-view.md) views. A module
specification lists which screens and reports it contributes and what data they
show; the linked screen specification decides how they look and behave.

Concrete vocabulary, values, weights, and copy belong to the profile. The first
deployed profile is [familienfreizeit-2027](../profiles/familienfreizeit-2027.md), with
its configuration in [`spec/profiles/familienfreizeit-2027.example.ts`](../profiles/familienfreizeit-2027.example.ts).

## 3. Module contract

Every module is defined once, in `src/modules/<module-id>/index.ts`, with
`defineModule`. The module factory a profile calls — `roomInventory({ … })` — returns
the definition bound to validated parameters.

```ts
export interface ModuleDefinition<Id extends ModuleId, Params> {
  id: Id                                   // kebab-case; stable forever
  requires: readonly ModuleId[]            // missing → profile build fails
  enhances: readonly ModuleId[]            // used when selected, ignored otherwise
  params: z.ZodType<Params>                // parsed at profile build; defaults live here
  contribute(params: Params, profile: ProfileView): ModuleContributions
}

export interface ModuleContributions {
  entity_kinds: readonly EntityKindDefinition[]
  events: readonly EventDefinition[]
  label_keys: readonly BuiltInLabelKey[]
  trait_roles: readonly TraitRole[]
  solver_input: readonly SolverInputContribution[]
  stages: readonly SolverStage[]
  rules: readonly Rule[]
  preflight_checks: readonly PreflightCheck[]
  world_summaries: readonly WorldSummaryDefinition[]
  world_checks: readonly WorldCheck[]
  release_scopes: readonly ReleaseScopeContribution[]
  change_kinds: readonly ChangeKind[]
  routes: readonly RouteDefinition[]       // Worker handlers under src/modules/<id>/worker/
  screens: readonly ScreenDefinition[]     // React screens under src/modules/<id>/app/
  family_controls: readonly ControlDefinition[]
  reports: readonly ReportDefinition[]
  emails: readonly EmailDefinition[]
  fixtures: readonly FixtureContract[]
}
```

`derive` folds facts, resolves relationships, computes world summaries/checks, builds
solver input, solves, and exposes release references/content accessors. Summary/check
functions consume resolved world data, never query event payloads or access other
modules' tables. The kernel handles historical prefixes as specified by release control.

Empty contributions are empty arrays. `contribute` is a pure function of the
parameters and a read-only view of the rest of the profile; it performs no I/O and
is evaluated once, at profile build.

### 3.1 Contribution kinds

| Contribution | Contract |
|---|---|
| `entity_kinds` | Kind name (kebab-case), id prefix, and whether ids are caller-generated or derived by the fold. The fold rejects an id reused under another kind. |
| `events` | Event type, zod payload schema, fold function, append invariants, and the authorisation rule. The fold function may create entity identity and emit labels; it may not emit derived results. |
| `event_mappings` | Explicit payload-field mappings for each event: identity-only fields, canonical label keys, null behavior, and full-restatement replacement scope. No payload field becomes a label by naming convention alone. |
| `label_keys` | Label keys the module owns, each for the entity kinds in its scope — such as `located-in` on rooms, beds, and places — with value type, scopes, cardinality, and setup-only or label-writable policy. Label-writable keys may supply family-control metadata with explicit authorisation. Ownership is per (key, entity kind): a profile may not define a trait using a key on an entity kind a module owns it for, and the same key stays free on other kinds. |
| `trait_roles` | A slot a profile trait must fill, such as the keep-apart relation for room assignment: the parameter that names the trait, and the operator, scopes, value type, and strengths the trait must have. |
| `solver_input` | Arrays the module adds to `SolverInput`, each with its declared sort key ([solver contract](../architecture/solver-contract.md) §1, R1). |
| `typed_contributions` | Pure, typed values a selected source module exposes to a dependent module. Consumers receive derived facts through this boundary and never inspect another module's raw event payloads. |
| `stages` | Pure solver stages with explicit ordering and a typed output section of the plan (§4). |
| `rules` | Hard and soft rules, each with `describe` ([solver contract](../architecture/solver-contract.md) §4). |
| `preflight_checks` | Checks run before any stage, with an id, severity, and message template. |
| `world_summaries` | Pure typed summaries built by `derive` from resolved labels, such as food, materials and live workshop participation; never persisted or inserted into Plan. |
| `world_checks` | Diagnostics over resolved non-solver facts, with subjects, severity and check id; kept outside solver preflight. |
| `release_scopes` | Canonical content accessors and subject attribution for kernel scope kinds defined in [release control](../application/release-control.md); no module-specific release mechanism. |
| `change_kinds` | What `diff` reports for world facts or plan output, with subject/family attribution. Release control selects scope content differences; arbitrary world changes do not imply held work. |
| `routes`, `screens` | Worker handlers and organiser or family screens. A module contributes a `screens` entry only for a route it renders as its own top-level screen ([§4](#4-composition) forbids two modules contributing the same route). Content a module adds inside another module's screen is described in prose against that screen's identity, not as a second `screens` entry for the same route — a contributing (non-owning) module's `ScreenDefinition` names the host screen it targets and carries no independent `route` value, so the collision check has nothing to compare for contributed content. A route or screen of an unselected module does not exist in the build. |
| `family_controls` | Additional `control` kinds and module-owned control definitions for the preferences renderer ([family preferences](family-preferences.md)). |
| `reports` | Report definitions with audience and sensitivity ([reports](../application/reports.md)). |
| `emails` | Email kinds with their trigger and the plan data they may include. |
| `fixtures` | The KDL fixture and golden-plan contracts a profile that selects the module must supply ([testing](../engineering/testing.md)). |

### 3.2 Parameters

Parameters are data. They follow the naming decision (D18): snake_case fields,
kebab-case vocabulary values, integer weights. A parameter that names a profile trait
ends in `_trait` and holds the trait key. Functions are allowed only where a module
specification names a pure evaluator slot, and they are hashed by source like every
other profile function.

Defaults live in the module's zod schema, so a profile states only what it changes.
The canonicalised, defaulted parameter object is part of the built profile and is
therefore identified by `build_revision`.

### 3.3 Identity and change

Modules have no independent version numbers (D20). The kernel and every module live in one
monorepo and are built and deployed together (D19), so a module depends on another
by id alone and there is never a compatibility range to resolve. A plan records the
`build_revision` it was derived with, which names the exact code of every module.

A rule is never edited to mean something different; a new rule id replaces it
([solver contract](../architecture/solver-contract.md) §4).

## 4. Composition

The profile builder, `defineOccasionProfile`, composes selected modules at build
time and fails the build when:

- a module is selected twice;
- a `requires` dependency is not selected;
- two modules contribute the same entity kind, event type, route, or report id,
  or the same label key for the same entity kind;
- a profile trait uses a label key on an entity kind a module owns it for;
- a trait role parameter names no trait, or names a trait of the wrong shape;
- a parameter fails its schema;
- a vocabulary identifier is not kebab-case.

### 4.1 Stage order

Solver stages declare their order explicitly:

```ts
export interface SolverStage<Output = unknown> {
  id: string                               // '<module-id>.<stage>', e.g. 'room-assignment.place'
  after: readonly string[]                 // stage ids that must run first, when selected
  before: readonly string[]                // stage ids that must run later, when selected
  reads: readonly string[]                 // stage ids whose output this stage consumes
  run(input: SolverInput, upstream: StageOutputs, config: SolverConfig): StageResult<Output>
}
```

The kernel orders the selected stages topologically; ties break on stage `id`. An
`after`, `before`, or `reads` entry naming a stage of an unselected module is
ignored, which is how an enhancing module plugs in without the base module
knowing whether it is present. A cycle fails the profile build.

`run` follows the determinism contract. It returns its output section, trace
entries, and diagnostics; it never mutates `input` or another stage's output.
Downstream stages read upstream output only through `upstream`, and only for the
stages they list in `reads`.

The plan holds one section per stage-owning module, keyed by module id
([solver contract](../architecture/solver-contract.md) §5). Modules export typed accessors, such as `roomAssignmentSection(plan)`, so
application code never reads `sections` with a bare string.

### 4.2 When a module is not selected

An unselected module contributes nothing: no entity kind, event type, label key,
solver input, stage, rule, preflight check, world summary/check, release scope, plan section, route, screen, control,
report, email, or fixture requirement. An event of a type no selected module
defines fails replay validation, which is the signal that a profile change needs a
migration ([deployment](../engineering/deployment.md) §2).

## 5. Catalogue

| Module | Owns | Requires | Enhances |
|---|---|---|---|
| [`programme-core`](programme-core.md) | Common programme-session identity and scheduleable-session boundary | — | — |
| [`call-for-papers`](call-for-papers.md) | Calls, submissions, review, selection, and immutable candidate rounds | `programme-core` | — |
| [`official-workshops`](official-workshops.md) | Official workshop facts and scheduleable sessions | `programme-core`, `call-for-papers` | — |
| [`self-organized-sessions`](self-organized-sessions.md) | Immediate self-organised sessions and proposer placements | `programme-core` | — |
| [`room-inventory`](room-inventory.md) | Buildings, rooms, beds, places; capacity | — | — |
| [`room-assignment`](room-assignment.md) | Placing whole families into rooms and places; the board | `room-inventory` | — |
| [`workshop-space`](workshop-space.md) | Typed workshop spaces; capacity, availability, and resolved capabilities | — | — |
| [`workshop-scheduling`](workshop-scheduling.md) | Scheduled offerings, placement, conflicts, and schedule release | `programme-core`, `workshop-space` | `official-workshops`, `self-organized-sessions` |
| [`workshop-rankings`](workshop-rankings.md) | Ordered per-person workshop choices | `programme-core`, `call-for-papers`, `official-workshops` | — |
| [`workshop-assignment`](workshop-assignment.md) | Fair workshop attendance assignment | `workshop-rankings`, `workshop-scheduling` | — |
| [`food-preferences`](food-preferences.md) | Per-person diet and allergy text | — | — |
| [`materials`](materials.md) | Material requests, commitments, and fulfilment | — | `official-workshops` |
| [`family-preferences`](family-preferences.md) | The profile-driven preferences page | — | — |
| [`change-notifications`](change-notifications.md) | Communication and change emails | — | — |

`requires` is transitive. A room-only occasion selects `room-inventory` and
`room-assignment`; it places whole families and has no child rooms. A
An official-workshop occasion selects `programme-core`, `call-for-papers`,
`official-workshops`, `workshop-rankings`, `workshop-scheduling`, and
`workshop-assignment`; a self-organised-only occasion can select the core,
self-organised, space, and scheduling modules without ranking or attendance.
Neither has room entities or the accommodation board unless those modules are
selected separately.

Sleeping parties and child rooms are not selectable modules in the current
catalogue. They are specified under [`deferred-ideas/`](../deferred-ideas) and must
be adopted together before a profile may split families or merge them into
cross-family sleeping groups.

## 6. Source layout

```
src/modules/<module-id>/
  index.ts          defineModule, the factory, parameter schema, typed accessors
  events.ts         event schemas and fold functions
  stages/           solver stages, pure
  rules/            hard/ and soft/ rules, pure
  preflight.ts      preflight checks, pure
  app/              React screens and controls; never imported by worker/
  worker/           route handlers; never imported by app/
  reports/          report renderers
  test/             module contract tests and fixture contracts
```

Everything outside `app/` and `worker/` is bound by the determinism lint rules
([testing](../engineering/testing.md) §5). A module imports the kernel and the modules it
`requires` or `enhances`; it never imports an unrelated module.

## 7. Module specification format

Each `spec/modules/<module-id>.md` uses these sections, omitting none; an empty one says
"None":

1. Purpose and boundary
2. Dependencies
3. Parameters
4. Entity kinds
5. Events
6. Labels and trait roles
7. Solver input and stages
8. Rules and scoring
9. Preflight checks (also identify any separate world diagnostics)
10. Output and diff
11. Screens, controls, reports, and emails
12. Tests
13. When not selected

A specification may end with further sections, such as known sharp edges.
