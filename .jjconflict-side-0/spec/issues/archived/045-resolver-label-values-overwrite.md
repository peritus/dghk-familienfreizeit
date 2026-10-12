---
id: "045"
title: Fixed resolver labels keep only their last value
status: resolved
severity: contract-contradiction
category: kernel
source: review of the workshop list reports against the prototype dataset
related_decisions: [D6, D11]
related_milestones: [M8]
opened: 2026-10-06
---

# Fixed resolver labels keep only their last value

## Problem

The fixed resolver keys `needs`, `provides`, `excludes`, `groups-with`, and
`separates-from` have no label schema. `setConfiguredLabel` replaces every
live label under a key unless the key's schema declares `zero-or-more`, so a
missing schema means replace. Each `LabelSet` for one of these keys therefore
removes every earlier value of that key on the same entity. See
[`src/events/fold.ts`](../../../src/events/fold.ts#L783) and the fixed key
list at [`src/events/fold.ts`](../../../src/events/fold.ts#L825).

The rest of the system treats these keys as multi-valued:

- [D11](../../../decisions.md#d11--resolver-mechanisms-and-vocabulary-live-in-code-organiser-values-live-in-the-event-log)
  lets organisers add concrete matching values with `LabelSet` and remove them
  with `LabelCleared`. `LabelCleared` takes a value, which is only meaningful
  when several values can coexist.
- The [free-form matching values](../../architecture/labels-and-constraints.md#free-form-matching-values)
  section pairs a `needs` token with a `provides` token on the target without
  saying that a new token removes existing ones.
- The room board writes one `provides=<family>_room` token per pinned family and
  clears a pin by value. See
  [`assignment-board.tsx`](../../../src/modules/room-assignment/app/screens/assignment-board.tsx#L82-L109).
- Workshop spaces are documented as having resolver-backed capabilities, in the
  plural. See [workshop-space](../../modules/workshop-space.md).

## Evidence

On the workshop prototype dataset
([`prototype-dataset.kdl`](../../../test/fixtures/workshop-assignment/prototype-dataset.kdl)),
spaces declare several `provides` values. Atelier, for example, provides
`Tische` and `Brennofen`. After derivation each space has exactly one
capability:

| Space | Declared `provides` | Derived capabilities |
|---|---|---|
| Atelier | Tische, Brennofen | Brennofen |
| Halle | Matten, Musikanlage, viel Platz | viel Platz |
| Saal | Bühne, Tische, viel Platz | viel Platz |
| Seminarraum | Tische, Beamer | Beamer |

No space keeps `Tische`, `Matten`, `Bühne`, or `Musikanlage`. Twelve of the 33
workshops come out unscheduled: Zirkus, Spiele, Schmuck, Theater, Filzen,
Sport, Schmieden, Musik, Chor, Aquarell, Handyfoto, and Band. Each one is
rejected with `hard.missing-capability` for all 80 slot/space candidates.
Schmieden needs `Esse`, which no space declares, so it is the only workshop
whose unscheduled status the data intends.

The scheduler reports the first rejection of the first candidate as the
reason, so all twelve show `hard.space-occupied`. That rejection applies only
to some candidates; the binding cause is missing capability. See
[`src/modules/workshop-scheduling/index.ts`](../../../src/modules/workshop-scheduling/index.ts#L390).
The programme view then tells organisers that every suitable room slot is
occupied.

The downstream effect on the same dataset: 150 attendance assignments for 140
people, 26 people with no workshop, and 33 `unassigned` entries.

The same code path affects the room board. Pinning a second family to a room
replaces the first family's `provides` token on that room, and pinning a family
replaces any other `needs` value the family already holds. A test does not yet
cover this.

## Resolution

All five fixed resolver keys now default to `zero-or-more`; an explicit label
schema can override the default. The fold and resolver share one fixed-key set.
Repeating the same value updates its metadata, and clearing one value preserves
other values under that key.

Unscheduled workshop diagnostics now prefer a rule that rejects every candidate.
When no rule is universal, the reason is the most frequent rejection, with ties
resolved by the first rule encountered during candidate traversal.

Regression coverage verifies multiple capabilities, schema overrides,
same-value metadata updates, value-specific clears, two family room pins, and
the prototype dataset's sole unscheduled workshop (`wks_schmieden`) with
`hard.missing-capability`. See [derived world tests](../../../test/events/derived-world.test.ts),
[room assignment tests](../../../test/events/room-assignment.test.ts), and the
[prototype dataset solver test](../../../test/solver/workshop-assignment-prototype-dataset.test.ts).

## Related files

- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [modules/workshop-space.md](../../modules/workshop-space.md)
- [implemented workshop scheduling](../../../docs/modules/workshop-scheduling.md)
- [modules/room-assignment.md](../../modules/room-assignment.md)
