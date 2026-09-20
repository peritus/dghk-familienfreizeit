---
id: "012"
title: "\"tag\" and \"label\" are used inconsistently"
status: open
severity: drift
category: kernel
source: ad-hoc-terminology-review-2026-09-19
related_decisions: [D18]
related_files:
  - ../architecture/labels-and-constraints.md
  - ../profiles/contract.md
  - ../ui/german-translation-guidelines.md
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

## Recommendation

Audit uses of "tag" and "label" across the kernel and profile documents and
make the distinction consistent: profile/vocabulary-level things are tags,
entity-level stored values are labels. Apply the same split to the German
terms per `../ui/german-translation-guidelines.md`.

## Open questions

1. Confirm the proposed German split (Angabe for family-facing labels, Tag
   reserved for technical/profile documentation) doesn't collide with
   existing German usage elsewhere.
