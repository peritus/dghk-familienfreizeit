---
id: "002"
title: Active profile's floor values fail their own module's kebab-case validation
status: resolved
severity: build-blocking
category: module:room-inventory
source: coherence-audit-2026-09-19
related_decisions: [D18]
opened: 2026-09-19
---

# Active profile's floor values fail their own module's kebab-case validation

## Problem

[`profiles/familienfreizeit-2027.example.ts:384`](../../profiles/familienfreizeit-2027.example.ts) declares `floors: ['ground', '1',
'2']` (copy keys at `:390-392`; documented at
[`profiles/familienfreizeit-2027.md:92`](../../profiles/familienfreizeit-2027.md)). [`modules/room-inventory.md:50`](../../modules/room-inventory.md) requires:
"| `floors` | `['ground']` | non-empty, unique, **kebab-case** |". D18
([`decisions.md:334`](../../../decisions.md)) puts enum values under kebab-case and `:381` says
"the profile builder **rejects vocabulary identifiers that are not
kebab-case**". `'1'` and `'2'` are not kebab-case identifiers. The derived
capability at `:158` (`room.label('floor') === 'ground'`) depends on this
enum, so the mismatch is load-bearing, not cosmetic.

## Recommendation

Rename the numeric floor values to kebab-case identifiers (e.g. `first`/
`second`, or `floor-1`/`floor-2`) in the active profile — this does not
require a decision-review, since it's the profile conforming to an already
adopted rule (D18), not a change to it. The alternative — exempting numeric
enum values from D18's kebab-case rule in [`room-inventory.md`](../../modules/room-inventory.md) §3 — would be a decision
change and should only be taken if there's a real reason floor numbers need
to render as bare digits somewhere.

## Resolution

Renamed `'1'`/`'2'` to `'first'`/`'second'` — reads naturally next to the
existing `'ground'` value and avoids the `floor-1`/`floor` stutter that
would result from the other option, since the property these values fill is
itself already named `floor`.

Updated in three places:
- [`profiles/familienfreizeit-2027.example.ts`](../../profiles/familienfreizeit-2027.example.ts): the `floors` array and the
  `copy.floors` object keys.
- [`profiles/familienfreizeit-2027.md`](../../profiles/familienfreizeit-2027.md): the documented `floor` value list.
- [`modules/room-inventory.md:150`](../../modules/room-inventory.md): a KDL illustration used `floor="1"`, the same
  violation in example form; updated to `floor="first"`.

A repository-wide search confirmed no other file sets a bare `'1'`/`'2'`
floor value (the unrelated `room-adjacency.md` `same_floor: 1 | 2 | 3` is a
deferred-idea numeric distance parameter, not this enum, and was left
untouched). No decision change was needed — the profile now conforms to the
kebab-case rule it was already violating.

## Related files

- [profiles/familienfreizeit-2027.example.ts](../../profiles/familienfreizeit-2027.example.ts)
- [profiles/familienfreizeit-2027.md](../../profiles/familienfreizeit-2027.md)
- [modules/room-inventory.md](../../modules/room-inventory.md)
- [decisions.md](../../../decisions.md)
