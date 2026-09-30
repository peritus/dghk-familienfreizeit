---
id: "012"
title: "\"tag\" and \"label\" are used inconsistently"
status: resolved
severity: drift
category: kernel
source: ad-hoc-terminology-review-2026-09-19
related_decisions: [D18, D23]
opened: 2026-09-19
---

# "tag" and "label" are used inconsistently

## Problem

A label is stored data (a `LabelSet`/`LabelCleared` event's resulting value
on an entity); a tag is profile vocabulary (a declared key a profile makes
available). The terminology review found these two terms used
inconsistently across documents, which risks readers conflating "declaring a
tag exists" with "an entity carries that label". The proposed German mapping
is Angabe for family-facing labels, and likely Tag only in technical/profile
documentation — i.e. the German split should track the English split.

## Evidence

A repository-wide audit of every `.md`/`.ts` file mentioning "tag" or "label"
(`grep -rli` over `spec/`) found two independent, unrelated collisions:

**1. The authoritative glossary contradicted its own definition, twice.**
`architecture/glossary.md:50-51` defined the split precisely: "**Tag** — a
named fact in an occasion profile's vocabulary... Stored as a generic
label." That was the correct, intended split, and the file even says "Where
a word here differs from ordinary usage, this document wins." But the same
file broke its own rule twice:
- `:15` — "Its requirements are the union of the Family's and its
  members' **tags**, strictest strength winning" — this meant the union of
  *held/stored* requirement values (labels) on entities, not vocabulary
  definitions.
- `:64` — "An absent **tag** assignment means indifferent" — same error: a
  tag can't be "assigned" or "absent" on an entity, only a label can.

The identical error was repeated verbatim in the architecture doc itself:
`architecture/labels-and-constraints.md:341` — "A placement unit's
requirements are the strictest-strength union of the family's and its
members' **tags**" — three independent occurrences of the exact same
"tags" that should read "labels," in the two most load-bearing kernel
documents.

**2. A field-name collision, separate from (1).** `profiles/contract.md:104,171`
named a Tag's *display-copy* field `label` ("Every tag has `label`
(organiser-facing `LocalizedText`)"; `family_facing.label`). This `label`
meant something else entirely — it had nothing to do with the
storage-mechanism `label` (a `LabelSet`/`LabelCleared` value on an entity).
This field name was used dozens of times in `profiles/familienfreizeit-2027.example.ts`
and was asserted on directly by a profile test rule in
`engineering/testing.md:267`: "every tag has a non-empty `label`."

Discussing this with the user surfaced a third, broader point: "tag" and
"label" are close enough in ordinary English that the specification kept
drifting despite (1) and (2) being fixable in isolation. Since the
repository has zero installs and no real `defineOccasionProfile`
implementation yet, the user chose to resolve this at the root instead —
renaming the profile-vocabulary concept itself from "tag" to "trait" — while
this issue's original narrower scope ((1) and (2) above) was folded into the
same change. See [D23](../../../decisions.md#d23--profile-vocabulary-entries-are-called-traits-not-tags)
for the alternatives considered (key/value, question/answer) and why they
were rejected in favor of trait/label.

## Recommendation

Originally scoped as: fix the three glossary/architecture sentences to say
"label" instead of "tag", and rename the colliding `label` field to `title`.
Both are still correct and are exactly what Resolution items 1 and 3 below
do — the scope grew during execution to also rename "tag" itself, per D23.

## Resolution

1. **The three sentences that meant "label," not "tag."** Fixed in
   `architecture/glossary.md:15,64` and `architecture/labels-and-constraints.md:341` —
   all three now read "label(s)". These are the only three places in the
   repository where the word was wrong regardless of the trait rename below.
2. **The profile-vocabulary concept renamed "tag" → "trait" repository-wide**
   (D23), in prose, headings, table cells, and code-shaped identifiers alike:
   the `traits: {...}` object and `type Trait = keyof typeof traits` in
   `profiles/contract.md`/`profiles/familienfreizeit-2027.example.ts`; the
   `_trait` parameter-naming convention and every parameter using it
   (`co_room_trait`, `no_bed_trait`, `priority_trait`, `keep_apart_trait`,
   `ranking_trait`, `audience_trait`, `leader_trait`, `needs_group_trait`,
   `provides_group_trait`, `diet_trait`, `allergies_trait`,
   `co_assignment_trait`) across every `spec/modules/*.md` and
   `spec/deferred-ideas/*.md` file that has one; `tag_roles`/`TagRole` →
   `trait_roles`/`TraitRole` in `modules/contract.md`;
   `kernel.unknown-tag` → `kernel.unknown-trait` and
   `hard.tag-requirements` → `hard.trait-requirements`; the `**Tag**`
   glossary headword → `**Trait**`; and every prose occurrence across
   `architecture/*.md`, `application/family-view.md`,
   `application/release-control.md`, `roadmap.md`, `README.md`,
   `engineering/testing.md`, and open issues 001, 015, and 017. A full
   repository sweep after the rename confirmed zero remaining occurrences of
   "tag"/"tags" outside German day-name false positives (`Freitag`,
   `Samstag`) and one unrelated bed `label` key in
   `modules/room-inventory.md:171`.
3. **The colliding display-copy field renamed `label` → `title`.** Fixed in
   `profiles/contract.md` ("Trait fields" §, §6 UI and copy), every trait
   definition in `profiles/familienfreizeit-2027.example.ts` (including
   nested `family_facing.label` → `family_facing.title`), and the test rule
   in `engineering/testing.md:267` ("every trait has a non-empty `title`").
4. **`ui/german-translation-guidelines.md`** — no change, confirmed still
   correct: "Tag"/"Trait" is never localized because it stays out of
   user-facing copy entirely.
5. **`decisions.md`** — D18's illustrative examples and D14's prose updated
   to say "trait"; a new decision D23 records the rename itself, the
   alternatives considered (key/value, question/answer) and why they were
   rejected, and why zero installs made this the cheapest point to do it.

## Related files

- [architecture/glossary.md](../../architecture/glossary.md)
- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [profiles/contract.md](../../profiles/contract.md)
- [profiles/familienfreizeit-2027.example.ts](../../profiles/familienfreizeit-2027.example.ts)
- [engineering/testing.md](../../engineering/testing.md)
- [ui/german-translation-guidelines.md](../../ui/german-translation-guidelines.md)
- [decisions.md](../../../decisions.md)
