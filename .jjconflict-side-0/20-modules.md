# 20 — Modules

The application is a fixed platform kernel plus a set of selectable modules. An
occasion profile ([occasion profiles](16-occasion-profiles.md)) selects modules and
configures them; this document defines what a module is, how modules compose, and
which modules exist. Each module has its own specification, `20.N-<module-id>.md`.

## 1. Kernel and modules

The **kernel** is present in every deployment and is never listed in a profile:

| Kernel part | Specified in |
|---|---|
| Event envelope, append, replay, KDL event source | [events](03-events.md), [data model](02-data-model.md) |
| Family and person identity, invitation, and person events | [events](03-events.md) |
| Labels, constraint definitions, fixed resolver operators, append validation | [labels and constraints](04-labels-and-constraints.md) |
| `derive`, `diff`, the solver pipeline, determinism contract, preflight framework, trace | [architecture](01-architecture.md), [solver contract](05-solver-contract.md) |
| Plans and release control | [solver contract](05-solver-contract.md), [release control](06-release-control.md) |
| Authentication, sessions, organiser allowlist | [authentication](11-authentication.md) |
| Organiser application shell, board-independent screens, family view shell, reports framework, email transport | [organiser view](09-organiser-view.md), [family view](10-family-view.md), [reports](19-reports.md), [deployment](13-deployment.md) |

A **module** is a selectable unit of domain capability. It owns a mechanism — entity
kinds, events, the label keys it interprets, solver stages, diagnostics, screens,
reports, and test contracts — and exposes a typed parameter object through which a
profile supplies policy. A module never owns occasion vocabulary; it names the
*roles* a profile tag must fill and checks the tag's shape.

Nothing about the kernel is optional, so listing it in a profile would add noise
without adding a choice. Everything a profile can choose is a module.

## 2. Authority

A module specification is the single authoritative description of its mechanism:
its events and payloads, built-in label keys, parameters, stage behaviour,
diagnostics, and outputs. Other documents link to it rather than restate it.

Screen interaction design stays in the [UI screen catalog](ui/README.md) and the
[organiser](09-organiser-view.md) and [family](10-family-view.md) views. A module
specification lists which screens and reports it contributes and what data they
show; the linked screen specification decides how they look and behave.

Concrete vocabulary, values, weights, and copy belong to the profile. The first
deployed profile is [familienfreizeit-2027](profiles/familienfreizeit-2027.md), with
its configuration in [`profiles/familienfreizeit-2027.ts`](profiles/familienfreizeit-2027.ts).

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
  tag_roles: readonly TagRole[]
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
| `label_keys` | Label keys the module owns, each for the entity kinds in its scope — such as `located-in` on rooms, beds, and places — with value type, scopes, cardinality, and setup-only or label-writable policy. Label-writable keys may supply family-control metadata with explicit authorisation. Ownership is per (key, entity kind): a profile may not define a tag using a key on an entity kind a module owns it for, and the same key stays free on other kinds. |
| `tag_roles` | A slot a profile tag must fill, such as the keep-apart relation for room assignment: the parameter that names the tag, and the operator, scopes, value type, and strengths the tag must have. |
| `solver_input` | Arrays the module adds to `SolverInput`, each with its declared sort key ([solver contract](05-solver-contract.md) §1, R1). |
| `stages` | Pure solver stages with explicit ordering and a typed output section of the plan (§4). |
| `rules` | Hard and soft rules, each with `describe` ([solver contract](05-solver-contract.md) §4). |
| `preflight_checks` | Checks run before any stage, with an id, severity, and message template. |
| `world_summaries` | Pure typed summaries built by `derive` from resolved labels, such as food, materials and live workshop participation; never persisted or inserted into Plan. |
| `world_checks` | Diagnostics over resolved non-solver facts, with subjects, severity and check id; kept outside solver preflight. |
| `release_scopes` | Canonical content accessors and subject attribution for kernel scope kinds defined in [release control](06-release-control.md); no module-specific release mechanism. |
| `change_kinds` | What `diff` reports for world facts or plan output, with subject/family attribution. Release control selects scope content differences; arbitrary world changes do not imply held work. |
| `routes`, `screens` | Worker handlers and organiser or family screens. A route or screen of an unselected module does not exist in the build. |
| `family_controls` | Additional `control` kinds and module-owned control definitions for the preferences renderer ([family preferences](20.9-family-preferences.md)). |
| `reports` | Report definitions with audience and sensitivity ([reports](19-reports.md)). |
| `emails` | Email kinds with their trigger and the plan data they may include. |
| `fixtures` | The KDL fixture and golden-plan contracts a profile that selects the module must supply ([testing](14-testing.md)). |

### 3.2 Parameters

Parameters are data. They follow the naming decision (D18): snake_case fields,
kebab-case vocabulary values, integer weights. A parameter that names a profile tag
ends in `_tag` and holds the tag key. Functions are allowed only where a module
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
([solver contract](05-solver-contract.md) §4).

## 4. Composition

The profile builder, `defineOccasionProfile`, composes selected modules at build
time and fails the build when:

- a module is selected twice;
- a `requires` dependency is not selected;
- two modules contribute the same entity kind, event type, route, or report id,
  or the same label key for the same entity kind;
- a profile tag uses a label key on an entity kind a module owns it for;
- a tag role parameter names no tag, or names a tag of the wrong shape;
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
([solver contract](05-solver-contract.md) §5). Modules export typed accessors, such as `roomAssignmentSection(plan)`, so
application code never reads `sections` with a bare string.

### 4.2 When a module is not selected

An unselected module contributes nothing: no entity kind, event type, label key,
solver input, stage, rule, preflight check, world summary/check, release scope, plan section, route, screen, control,
report, email, or fixture requirement. An event of a type no selected module
defines fails replay validation, which is the signal that a profile change needs a
migration ([deployment](13-deployment.md) §2).

## 5. Catalogue

| Module | Owns | Requires | Enhances |
|---|---|---|---|
| [`room-inventory`](20.1-room-inventory.md) | Buildings, rooms, beds, places; designations; capacity | — | — |
| [`room-assignment`](20.3-room-assignment.md) | Placing whole families into rooms and places; the board | `room-inventory` | — |
| [`workshops`](20.4-workshops.md) | Slots, workshops, audience, leadership, cancellation | — | `room-inventory` |
| [`workshop-rankings`](20.5-workshop-rankings.md) | Ordered per-person workshop choices | `workshops` | — |
| [`workshop-assignment`](20.6-workshop-assignment.md) | Fair workshop assignment | `workshop-rankings` | — |
| [`food-preferences`](20.7-food-preferences.md) | Per-person diet and allergy text | — | — |
| [`materials`](20.8-materials.md) | Material requests, commitments, and fulfilment | — | `workshops` |
| [`family-preferences`](20.9-family-preferences.md) | The profile-driven preferences page | — | — |
| [`change-notifications`](20.10-change-notifications.md) | Communication and change emails | — | — |

`requires` is transitive. A room-only occasion selects `room-inventory` and
`room-assignment`; it places whole families and has no child rooms. A
workshop-only occasion selects `workshops`, `workshop-rankings`, and
`workshop-assignment` and has no room entities or board.

Sleeping parties and child rooms are not selectable modules in the current
catalogue. They are specified under [`deferred-ideas/`](deferred-ideas/) and must
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
([testing](14-testing.md) §5). A module imports the kernel and the modules it
`requires` or `enhances`; it never imports an unrelated module.

## 7. Module specification format

Each `20.N-<module-id>.md` uses these sections, omitting none; an empty one says
"None":

1. Purpose and boundary
2. Dependencies
3. Parameters
4. Entity kinds
5. Events
6. Labels and tag roles
7. Solver input and stages
8. Rules and scoring
9. Preflight checks (also identify any separate world diagnostics)
10. Output and diff
11. Screens, controls, reports, and emails
12. Tests
13. When not selected

A specification may end with further sections, such as known sharp edges.
