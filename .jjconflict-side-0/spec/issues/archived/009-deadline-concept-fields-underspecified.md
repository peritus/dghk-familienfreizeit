---
id: "009"
title: Explicit deadline concept fields are not fully specified
status: resolved
severity: gap
category: kernel
source: ad-hoc-terminology-review-2026-09-19
related_decisions: []
opened: 2026-09-19
---

# Explicit deadline concept fields are not fully specified

## Problem

A terminology/vocabulary review flagged an explicit deadline concept with
fields `after_deadline: 'read-only' | 'editable'` and
`deadline_contact: LocalizedText`, without pinning down where these fields
live in the data model, which entity/scope they attach to, or how they
interact with the scoped-deadline behavior already documented (see
`main`'s "docs: configure scoped deadlines and coverage" work). This was
raised as a short note, not a full writeup — the source material available
to this catalog does not include the entity/event mapping.

## Recommendation

Define `after_deadline` and `deadline_contact` in the relevant module
contract (most likely alongside the existing scoped-deadline behavior),
including their entity attachment, event origin, and German field names per
[`ui/german-translation-guidelines.md`](../../ui/german-translation-guidelines.md).

## Open questions

1. Which entity/scope owns `after_deadline`/`deadline_contact` — is this a
   family-preferences concept, a release-control concept, or both?

## Resolution

`deadline_contact` is a `family-preferences` concept: `FamilyPreferencesParams`
([`spec/modules/family-preferences.md:24-42`](../../modules/family-preferences.md)) defines it as
`{ accommodation: LocalizedText, workshops: LocalizedText }`, one entry per
configured `deadline_scope`, required and validated ("copy for each configured
deadline scope"). The Worker returns the upcoming/passed status for each
configured deadline together with its `deadline_contact` in the family
response ([`spec/modules/family-preferences.md:144-145`](../../modules/family-preferences.md)).

`after_deadline` is not adopted as a field. The module contract already fixes
this behavior for every scope rather than making it configurable: "A passed
deadline keeps its controls editable. It is a prompt to contact the
organisers, not a write barrier." ([`spec/modules/family-preferences.md:145-146`](../../modules/family-preferences.md),
tested at line 157). A `'read-only' | 'editable'` toggle would contradict that
fixed policy, so introducing it would need a D-numbered decision to first
change the policy itself — nothing in this review found a reason to. No spec
change needed beyond confirming `deadline_contact`'s existing definition
covers the concept in full.

## Related files

- [modules/family-preferences.md](../../modules/family-preferences.md)
- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
