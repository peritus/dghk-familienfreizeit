---
id: "011"
title: "\"space\" is used as a resolver scope but isn't a typed entity kind"
status: resolved
severity: gap
category: kernel
source: ad-hoc-terminology-review-2026-09-19
related_decisions: []
related_files:
  - ../architecture/labels-and-constraints.md
  - ../architecture/data-model.md
opened: 2026-09-19
---

# "space" is used as a resolver scope but isn't a typed entity kind

## Problem

`space` appears as a resolver scope somewhere in the label/constraint
vocabulary, but it is not one of the kernel's or a module's typed entity
kinds (room, place, workshop, etc. — see `AGENTS.md`'s identity rule). This
leaves it unclear whether "space" should become a real typed entity kind, or
whether existing scopes (`room`, `place`, `workshop`) already cover the
intended meaning and "space" is just loose terminology that should be
replaced.

## Recommendation

Decide whether `space` names a real, distinct entity kind that needs to be
added to the kernel/module identity model, or whether it is informal
shorthand that should be replaced with the explicit kind it actually means
(room, place, or workshop, depending on context).

## Open questions

1. Add `space` as a typed entity kind, or replace each use with the specific
   kind (room, place, workshop) it actually refers to? The terminology
   review's guess is German Raum, Schlafplatz, or Workshop, depending on the
   actual scope — this needs to be checked case by case.

## Resolution

Re-checked `spec/architecture/labels-and-constraints.md` and
`spec/architecture/data-model.md`: `space` does not appear as a resolver
scope, or in any other typed-entity-kind position, in either file. A
repository-wide search finds `space` used only in unrelated prose (a
non-breaking space rule in the German translation guidelines, and "until
space exists" in a release-control table row) — neither is a resolver scope.
The loose terminology this issue flagged is no longer present; scopes are
already expressed with the existing typed kinds (`room`, `place`, `workshop`,
etc.). No spec change needed.
