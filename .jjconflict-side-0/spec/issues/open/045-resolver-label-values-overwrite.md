---
id: "045"
title: Fixed resolver labels keep only their last value
status: open
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

## Recommendation

1. Treat the five fixed resolver keys as `zero-or-more` when no schema
   overrides them, and keep replacement for other keys without a schema. Keep
   the existing single list of fixed keys as the source, rather than repeating
   it in `fold.ts` and `resolver.ts`.
2. State the cardinality of the fixed resolver keys in
   [labels and constraints §2](../../architecture/labels-and-constraints.md#2-representation),
   and record the implemented behavior in
   [derived world](../../../docs/architecture/derived-world.md).
3. Report an unscheduled workshop's reason as the rule that rejects every
   candidate when one exists, otherwise the most frequent rule.
4. Add regression coverage:
   - two `provides` values on one entity both produce capabilities;
   - `LabelCleared` with a value removes only that value;
   - on the prototype dataset only `wks_schmieden` is unscheduled, with
     `hard.missing-capability`;
   - pinning two families to one room keeps both tokens.

## Open questions

1. Is a restatement of the same `needs`/`provides` value a no-op, or does it
   update strength and note on the existing label?
2. Should `excludes` and `separates-from` share the multi-valued default, or do
   they need a profile schema first?

## Related files

- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [modules/workshop-space.md](../../modules/workshop-space.md)
- [modules/workshop-scheduling.md](../../modules/workshop-scheduling.md)
- [modules/room-assignment.md](../../modules/room-assignment.md)
