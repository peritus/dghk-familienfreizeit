---
id: "002"
title: Active profile's floor values fail their own module's kebab-case validation
status: open
severity: build-blocking
category: module:room-inventory
source: coherence-audit-2026-09-19
related_decisions: [D18]
related_files:
  - ../profiles/familienfreizeit-2027.example.ts
  - ../profiles/familienfreizeit-2027.md
  - ../modules/room-inventory.md
  - ../../decisions.md
opened: 2026-09-19
---

# Active profile's floor values fail their own module's kebab-case validation

## Problem

`../profiles/familienfreizeit-2027.example.ts:384` declares `floors: ['ground', '1',
'2']` (copy keys at `:390-392`; documented at
`../profiles/familienfreizeit-2027.md:92`). `../modules/room-inventory.md:50` requires:
"| `floors` | `['ground']` | non-empty, unique, **kebab-case** |". D18
(`../../decisions.md:334`) puts enum values under kebab-case and `:381` says
"the profile builder **rejects vocabulary identifiers that are not
kebab-case**". `'1'` and `'2'` are not kebab-case identifiers. The derived
capability at `:158` (`room.label('floor') === 'ground'`) depends on this
enum, so the mismatch is load-bearing, not cosmetic.

## Recommendation

Rename the numeric floor values to kebab-case identifiers (e.g. `first`/
`second`, or `floor-1`/`floor-2`) in the active profile — this does not
require a decision-review, since it's the profile conforming to an already
adopted rule (D18), not a change to it. The alternative — exempting numeric
enum values from D18's kebab-case rule in `room-inventory.md` §3 — would be a decision
change and should only be taken if there's a real reason floor numbers need
to render as bare digits somewhere.

## Open questions

1. Rename to `first`/`second` (or `floor-1`/`floor-2`), or exempt numeric
   enum values in `room-inventory.md` §3 and D18?
