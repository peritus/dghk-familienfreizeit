# 16 — Occasion profiles

An occasion profile composes modules for one deployment. It is the authoritative
source for that deployment's module selection and parameters, vocabulary, policy,
copy, and pure evaluators. The module contract is in [modules](20-modules.md); the
first deployed profile is [familienfreizeit-2027](profiles/familienfreizeit-2027.md),
configured in [`profiles/familienfreizeit-2027.ts`](profiles/familienfreizeit-2027.ts).

## 1. Profile shape

A profile is a typed TypeScript value built with `defineOccasionProfile` from
`src/config/define.ts`. The builder validates the composition at build time
([modules](20-modules.md) §4) and `src/config/index.ts` re-exports the one active
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
    preference_deadline: 'YYYY-MM-DDTHH:mm:ssZ',
    locale: 'de',
    fallback_locale: 'en',
    description: { de: '…', en: '…' },
  },

  tags: {
    'needs-private-sanitary': requirement({ … }),
    // …
  },

  modules: [
    roomInventory({ … }),
    // …
  ],
})
```

The module list is explicit. There are no hidden presets and no runtime feature
flags that can change solver semantics after deployment. Module order in the list
has no meaning; stage order comes from the modules ([modules](20-modules.md) §4.1).

### Meta

| Field | Meaning |
|---|---|
| `id` | kebab-case profile id; matches the file name |
| `name`, `description` | occasion-facing copy |
| `starts_on`, `ends_on` | inclusive occasion dates; every age is computed at `starts_on` |
| `preference_deadline` | after it, family controls follow [family preferences](20.12-family-preferences.md) |
| `locale`, `fallback_locale` | family-facing copy language and fallback |

`PUBLIC_URL`, `EMAIL_FROM`, and secrets are deployment facts, not profile metadata,
and never enter `config_hash` ([deployment](13-deployment.md)).

## 2. Kernel labels

The kernel owns the person and family keys set by its events: `member-of`,
`given-name`, `family-name`, `birthdate`, `display-name`, `email`, and `locale`.
The profile supplies the value vocabulary for `role` with a `property` tag named
`role`, because modules refer to role values in their parameters.

## 3. Tags

Labels are the stored fact. Tags are the profile's typed vocabulary over those
labels. Tag keys are kebab-case (D18), so they are quoted in the `tags` object; the
builder derives `type Tag = keyof typeof tags`, so a misspelt tag in code is a
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

### Tag fields

Every tag has `label` (organiser-facing `LocalizedText`), `scopes`, and a `value`
type. Builders accept these further fields where they apply:

| Field | Builders | Meaning |
|---|---|---|
| `help` | all | organiser help text |
| `cardinality` | `property`, `capability`, `requirement`, `relation` | `'zero-or-one'`, `'exactly-one'`, or `'zero-or-more'` |
| `strengths` | `requirement`, `relation` | allowed strengths |
| `default` | `property` | value assumed when the entity has no label; never stored |
| `copy` | `property` with `enumOf` | `LocalizedText` per enum value |
| `operator` | `relation` | `groups-with` or `separates-from` |
| `satisfied_by` | `requirement` | capability tag key |
| `structural` | `requirement` | named structural check provided by a module, e.g. `no-other-parties` |
| `derive` | `capability` | pure evaluator over the entity's labels; makes the capability derived |
| `valid_for` | all | pure evaluator deciding whether the tag applies to an entity, returning `true` or a reason |
| `target` | `relation` | entity kinds the value may reference |
| `symmetry` | `relation` | `mutual-required`, `implied-mutual`, or `one-sided-soft` |
| `per`, `choice` | `orderedChoice` | the scope entity kind and the choice entity kind |
| `weight` | `requirement`, `relation` | integer score when a `preferred` label is satisfied |
| `penalty` | `requirement`, `relation` | integer score, ≤ 0, when a `preferred` label is violated |
| `one_sided_weight`, `adjacent_weight` | `relation` | co-room scoring ([room assignment](20.5-room-assignment.md) §8) |
| `family_facing` | all except `note` | the family control ([family preferences](20.12-family-preferences.md) §6) |
| `organiser_only` | all | never rendered to families; excludes `family_facing` |
| `aliases` | all | further keys accepted on replay and mapped to this tag, so a rename costs nothing |
| `sensitivity` | all | `normal` or `restricted`; restricted values never appear in shared or other-family views |

A tag-specific score lives on its tag, next to the vocabulary it scores. Geometry and
policy scores that no single tag owns live in module parameters.

### Evaluators

`derive`, `valid_for`, and any function a module specification names as an
evaluator slot are pure. They may not perform I/O, read a clock, use randomness,
dynamically evaluate code, or change module control flow. They are bound by the
determinism lint rules ([testing](14-testing.md) §6) and hashed by source.

## 4. Module parameters

Each module factory takes its typed parameters, specified in the module document §3.
A parameter naming a tag ends in `_tag` and must name a tag of the shape the module's
role requires. Weights are integers. Changes to parameters, tags, and weights are
deployments, not events (D12).

## 5. Hashing and history

`config_hash` is the SHA-256 of the canonical JSON of: `meta`; each tag with its
fields, with evaluators replaced by their source text; and each selected module's id
and defaulted parameters. It makes every configuration change visible in
plan metadata.

Historical plan metadata remains authoritative. The deployed profile is used for new
derivations; the recorded `code_revision` and `config_hash` identify what produced an
earlier plan.

## 6. UI and copy

Modules contribute surfaces; the profile supplies their words. Organiser-facing
wording comes from the tag `label`, family-facing wording from `family_facing.label`,
so the two audiences can be addressed differently for the same tag. A module that is
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
