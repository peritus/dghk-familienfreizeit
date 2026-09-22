---
id: "024"
title: Module folds lack lifecycle operations and source ordering
status: resolved
severity: build-blocking
category: kernel
source: M4 readiness assessment
related_decisions: [D2, D11, D26, D27]
opened: 2026-09-21
---

# Module folds lack lifecycle operations and source ordering

## Problem

The module fold capability can only create an entity and set a label. It cannot
retire an entity, clear or replace a module-owned label, or preserve the
event-supplied ordering key when it creates an entity. The kernel therefore
assigns every module entity its creation sequence as `sort_key`.

The [room inventory module](../../modules/room-inventory.md) cannot implement
its required lifecycle with that capability: its update events are full
restatements, `BedRemoved` retires a bed and its derived places, and its
inventory collections are ordered by source `sort_key`. The current fold
boundary proves creation safely, but does not provide the operations M4 needs
to update and retire its typed entities.

## Evidence

| Required behavior | Missing executable operation |
|---|---|
| `BuildingUpdated`, `RoomUpdated`, and `BedUpdated` are full restatements. | A module fold cannot clear a prior module-owned label before replacing the restated label set. |
| `BedRemoved` retires its bed and every derived place; reducing `sleeps` retires the extra place. | A module fold cannot set an entity's `retired_seq` or remove an active derived place. |
| Buildings, rooms, beds, and places have deterministic source ordering. | `createEntity` accepts `seq`, not a source `sort_key`, and the kernel constructs module entities with `sort_key: seq`. |
| `place` is fold-derived while buildings, rooms, and beds are caller-generated. | A contribution declares only an id and prefix; it does not state the kind's identity mode. |

The existing [module fold boundary issue](../archived/021-module-owned-entity-fold-boundary.md)
explicitly deferred the caller-generated/derived identity distinction until the
first fold-derived kind, naming room inventory's places as that case.

## Recommendation

Extend the guarded module-fold capability only with the lifecycle operations
needed by a real module: create an entity with its declared source ordering,
retire one of the module's declared entity kinds, and replace or clear only the
module's declared label keys. Add the caller-generated versus fold-derived
identity mode to entity-kind contributions and enforce it at the capability
boundary. Prove the extension with room-inventory lifecycle tests covering
restatement, bed removal, place retirement, and source ordering; do not expose
the mutable world to modules.

## Open questions

1. Should a module fold receive one atomic `replaceLabels` operation for each
   event-defined restatement scope, or individually guarded clear/set operations
   whose use the event fold controls?

## Resolution

While scoping this, resolving "retire an entity" surfaced a broader question:
the kernel's existing retirement model (`Entity.retired_seq`,
`Label.cleared_seq` tombstones kept forever and filtered at every read site)
was itself unnecessary complexity, not a requirement this issue had to build
on. That became [D27](../../../decisions.md#d27--entities-and-labels-are-hard-removed-on-retirementclear-history-is-re-derived-not-tombstoned):
entities and labels are now hard-removed from the live world on
retirement/clear, since historical/reviewed views already work by
re-deriving over a truncated event slice at a specific `seq` — nothing needs
the *current* world to remember what used to be true. This is a larger change
than the module-fold capability alone: `Entity`/`Label`/`KernelWorld` lost
their tombstone fields, `resolver.ts` and `world.ts`'s `diff`/`project` were
simplified accordingly, and `PersonWithdrawn` now hard-removes rather than
flags (`src/events/fold.ts`, `src/events/resolver.ts`, `src/events/world.ts`).

Against that model, the module fold capability
(`src/events/fold.ts`'s `ModuleFoldCapability`) gained:

- `createEntity(kind, id, seq, sortKey?)` — `sortKey` defaults to `seq` when
  omitted, otherwise the fold's own declared source ordering is used as
  `sort_key` directly.
- `retireEntity(kind, id)` — hard-removes the entity and every label it
  holds, guarded against the module's own declared kinds like `createEntity`.
- `replaceLabels(entityId, values)` — the atomic option from the open
  question: clears every live label under each write's key and sets its new
  value in one guarded call, so a fold can never clear without setting.

Cross-kind id collisions — the reason a ledger of retired ids would otherwise
be needed — are instead prevented structurally: every entity id must start
with its own kind's declared prefix (kernel-reserved `fam_`/`per_`; module
prefixes already validated globally unique at profile build in
`validateModules`). `registerEntity` enforces this at creation, which is what
made a permanent id ledger unnecessary once retirement stopped tombstoning.

The caller-generated/derived identity mode was added as declarative metadata
(`ModuleContributions.entity_kinds[].identity?: 'caller-generated' | 'derived'`,
defaulting to `'caller-generated'`) but is **not yet capability-enforced**:
doing so meaningfully needs `event_mappings` (which fields on an event are
identity-only), and that contribution kind is explicitly deferred in
[issue 023](../open/023-narrow-module-contributions-shape.md) until a real module
needs it. Recorded here rather than guessed at.

Proven with a synthetic `fixture-widgets-lifecycle` module (not the real
`room-inventory` module, matching issue 021's precedent) in
`test/events/module-fold-boundary.test.ts`: source ordering distinct from
`seq`, an atomic full-label restatement, hard removal of an entity and its
labels on retirement, and guard rejection of `retireEntity`/`replaceLabels`
calls outside a module's own declared kinds/keys. Building the real
`room-inventory` module against this mechanism remains separate, out-of-scope
work.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [modules/room-inventory.md](../../modules/room-inventory.md)
- [architecture/data-model.md](../../architecture/data-model.md)
- [archived issue 021](../archived/021-module-owned-entity-fold-boundary.md)
- [decisions.md#d27](../../../decisions.md#d27--entities-and-labels-are-hard-removed-on-retirementclear-history-is-re-derived-not-tombstoned)
