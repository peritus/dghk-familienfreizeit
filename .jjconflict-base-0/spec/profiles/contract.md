# Occasion profiles

An occasion profile composes modules for one deployment. It is the authoritative
source for that deployment's module selection and parameters, vocabulary, policy,
copy, and pure evaluators. The module contract is in [modules](../modules/contract.md); the
full active profile is [familienfreizeit-2027](familienfreizeit-2027.md),
configured in [`spec/profiles/familienfreizeit-2027.example.ts`](familienfreizeit-2027.example.ts).

## 1. Profile shape

A profile is a typed TypeScript value built with `defineOccasionProfile` from
`src/config/define.ts`. The builder validates the composition at build time
([modules](../modules/contract.md) §4) and `src/config/index.ts` re-exports the one active
profile.

```ts
import { defineOccasionProfile, property, requirement } from '../src/config/define'
import { roomInventory } from '../src/modules/room-inventory'

export default defineOccasionProfile({
  meta: {
    id: 'familienfreizeit-2027',
    name: { de: '…', en: '…' },
    starts_on: 'YYYY-MM-DD',
    ends_on: 'YYYY-MM-DD',
    timezone: 'Europe/Berlin',
    phase_dates: [
      { phase: 'family-preferences.accommodation-preferences', target_at: 'YYYY-MM-DDTHH:mm:ssZ' },
      { phase: 'workshop-rankings.choice', target_at: 'YYYY-MM-DDTHH:mm:ssZ' },
    ],
    locale: 'de',
    fallback_locale: 'en',
    description: { de: '…', en: '…' },
  },

  traits: {
    'needs-private-sanitary': requirement({ … }),
    // …
  },

  modules: [
    roomInventory({ … }),
    // …
  ],
})
```

The module list is explicit, and there are no hidden presets. A selected module
selects all of its [features](../architecture/features.md); a module entry may
deselect individual features of that module by id through the kernel-owned
`deselected_features` parameter, for example
`workshopRankings({ …, deselected_features: ['workshop-rankings.family-workshop-wishes'] })`.
Module order in the list has no meaning; stage order comes from the modules
([modules](../modules/contract.md) §4.1).

No deployment control may change solver semantics, domain behavior, or phase
meaning. A deployment may switch the availability of a declared feature on or
off through its operational binding; that switch is validated, fails closed, and
is attributed separately from `build_revision`
([features](../architecture/features.md) §6).

The kernel does not depend on the profile builder's implementation. Before M2's
composition work is complete, M1 consumes the profile's validation view: entity
kinds, label schemas, aliases, event value validators, and compiled resolver
descriptors. M2 constructs that view from the typed profile and selected module
contributions; M1 validates and derives against the view without inspecting raw
profile-builder or module-parameter objects.

M2 begins with a kernel-only executable profile fixture. The full active profile
is an integration fixture once every selected module contribution exists; M12
validates that complete composition.

### Meta

| Field | Meaning |
|---|---|
| `id` | kebab-case profile id; matches the file name |
| `name`, `description` | occasion-facing copy |
| `starts_on`, `ends_on` | inclusive occasion dates; every age is computed at `starts_on` |
| `timezone` | IANA timezone used when displaying occasion dates and target dates |
| `phase_dates` | advisory UTC Zieltermin entries, at most one per declared phase that accepts one ([phases](../architecture/phases.md) §2) |
| `locale`, `fallback_locale` | family-facing copy language and fallback |

Target dates are workflow notices, not authorization rules. Families may continue to
edit their own inputs after a Zieltermin until the organisers close the area. A
profile may leave a phase without a target; the family-preferences module maps
sections to phases. The phase view computes late status for display, but the date
never changes append validation, authorisation, replay, or the event log. Changing a
date is a deployment (D12).

`EMAIL_FROM` and secrets are deployment facts, not profile metadata,
and are not part of the built profile identity ([deployment](../engineering/deployment.md)).

## 2. Kernel labels

The kernel owns the person and family keys set by its events: `member-of`,
`given-name`, `family-name`, `age`, `display-name`, `email`, and `locale`.
The profile supplies the value vocabulary for `role` with a `property` trait named
`role`, because modules refer to role values in their parameters.

## 3. Traits

Labels are the stored fact. Traits are the profile's typed vocabulary over those
labels. Trait keys are kebab-case (D18), so they are quoted in the `traits` object; the
builder derives `type Trait = keyof typeof traits`, so a misspelt trait in code is a
compile error.

### Builders

| Builder | Operator | Use |
|---|---|---|
| `property({ … })` | `descriptive` | a fact: enum, text, number, boolean, date, or entity reference |
| `capability({ … })` | `needs-provides`, provider side | something an entity offers; derived **or** assigned, never both |
| `requirement({ … })` | `needs-provides`, holder side | something an entity needs; satisfied by a capability or a module's structural check |
| `relation({ … })` | `groups-with` or `separates-from` | a relation between stable entities |
| `orderedChoice({ … })` | `ordered-choice` | a ranked list of choices per scope entity |
| `note({ … })` | `descriptive` | an annotation the solver never reads |

Value types: `enumOf([...])`, `text({ max_length })`, `integer({ min, max })`,
`decimal({ scale })`, `bool()`, `date()`, and `ref('<entity-kind>')`. Options are
optional.

### Trait fields

Every trait has `title` (organiser-facing `LocalizedText`), `scopes`, and a `value`
type. Builders accept these further fields where they apply:

| Field | Builders | Meaning |
|---|---|---|
| `help` | all | organiser help text |
| `cardinality` | `property`, `capability`, `requirement`, `relation` | `'zero-or-one'`, `'exactly-one'`, or `'zero-or-more'` |
| `strengths` | `requirement`, `relation` | allowed strengths |
| `default` | `property` | value assumed when the entity has no label; never stored |
| `copy` | `property` with `enumOf` | `LocalizedText` per enum value |
| `operator` | `relation` | `groups-with` or `separates-from` |
| `satisfied_by` | `requirement` | capability trait key |
| `structural` | `requirement` | named structural check provided by a module, e.g. `no-other-families` |
| `derive` | `capability` | pure evaluator over the entity's labels; makes the capability derived |
| `valid_for` | all | pure evaluator deciding whether the trait applies to an entity, returning `true` or a reason |
| `target` | `relation` | entity kinds the value may reference |
| `symmetry` | `relation` | `mutual-required`, `implied-mutual`, or `one-sided-soft` |
| `per`, `choice` | `orderedChoice` | the scope entity kind and the choice entity kind |
| `weight` | `requirement`, `relation` | integer score when a `preferred` label is satisfied |
| `penalty` | `requirement`, `relation` | integer score, ≤ 0, when a `preferred` label is violated |
| `family_facing` | all except `note` | the family control ([family preferences](../modules/family-preferences.md) §6) |
| `organiser_only` | all | never rendered to families; excludes `family_facing` |
| `aliases` | all | further label keys accepted on replay and normalized to this trait key before validation; aliases never apply to generic resolver keys or values |
| `sensitivity` | all | `normal` or `restricted`; restricted values never appear in shared or other-family views |

A trait-specific score lives on its trait, next to the vocabulary it scores. Geometry and
policy scores that no single trait owns live in module parameters.

At profile compilation, a `requirement` trait becomes a resolver descriptor with
its canonical trait key, `satisfied_by` capability key, scopes, legal strengths,
and score terms. A `capability` trait becomes either a derived capability or an
assigned capability descriptor; a trait with `derive` rejects direct assignment.
These descriptors are consumed by the resolver and are not persisted as extra
rows or converted into generic `needs`/`provides` labels.

### Organiser-supplied values

Fixed resolver mechanisms accept organiser decisions independently of the profile's
trait catalogue ([labels and constraints](../architecture/labels-and-constraints.md) §5). A new
`needs`/`provides` token such as `naehe_zum_eingang` is a value, not a new profile trait:
it needs neither `title` copy nor `family_facing` metadata. The configured schemas
still validate entity kinds, references, strengths, and slot-scoped shapes.

Vocabulary naming rules apply to declared keys and enum values. Free-form matching
tokens retain the spelling supplied by the organiser, including underscores, and
are matched exactly. They are not converted to kebab-case. Preferred decisions use
the consuming mechanism's configured weights (D12); labels cannot supply weights.
Optional decision notes and internal tokens are never family-facing copy.

### Evaluators

`derive`, `valid_for`, and any function a module specification names as an
evaluator slot are pure. They may not perform I/O, read a clock, use randomness,
dynamically evaluate code, or change module control flow. They are bound by the
determinism lint rules ([testing](../engineering/testing.md) §5) and hashed by source.

## 4. Module parameters

Each module factory takes its typed parameters, specified in the module document §3.
A parameter naming a trait ends in `_trait` and must name a trait of the shape the module's
role requires. Weights are integers. Changes to parameters, traits, and weights are
deployments, not events (D12).

## 5. Build identity and history

The active profile, its selected modules, defaulted parameters, and evaluator source
are compiled into the monolith. The exact `build_revision` identifies that complete
profile and implementation. Historical plan metadata remains authoritative: the
recorded `build_revision` and `compatibility_revision` identify the build and contract
boundary used to produce an earlier plan.

## 6. UI and copy

Modules contribute surfaces; the profile supplies their words. Organiser-facing
wording comes from the trait `title`, family-facing wording from `family_facing.title`,
so the two audiences can be addressed differently for the same trait. A module that is
not selected has no surface at all.

`LocalizedText` is either a string in `meta.locale` or an object with one entry per
locale; family-facing text must provide `meta.locale` and falls back to
`meta.fallback_locale` per family.

## 7. Deployment boundary

One occasion profile and one database belong to one deployment. Supporting another
occasion means composing another profile and deploying it separately; there is no
runtime multi-occasion tenancy.

The profile is not an example configuration. It is the source of truth for the
deployed occasion, while this document defines the reusable profile contract.

## Module-owned family controls

The profile places module-owned controls through `family-preferences.module_controls`
([family preferences](../modules/family-preferences.md) §3), supplying section and copy. It
must not redefine `signed-up-for` or `interested-in` as profile traits. The workshops
module owns their schemas, resolver references and authorisation. These controls
complement trait-driven controls and inherit their section's phase. Phases are fixed
module and kernel behaviour, specified in [phases](../architecture/phases.md); the
profile supplies dates only, never executable phase rules.
