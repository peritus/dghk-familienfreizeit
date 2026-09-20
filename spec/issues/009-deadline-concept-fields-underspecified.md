---
id: "009"
title: Explicit deadline concept fields are not fully specified
status: open
severity: gap
category: kernel
source: ad-hoc-terminology-review-2026-09-19
related_decisions: []
related_files:
  - ../modules/family-preferences.md
  - ../architecture/labels-and-constraints.md
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
`../ui/german-translation-guidelines.md`.

## Open questions

1. Which entity/scope owns `after_deadline`/`deadline_contact` — is this a
   family-preferences concept, a release-control concept, or both?
