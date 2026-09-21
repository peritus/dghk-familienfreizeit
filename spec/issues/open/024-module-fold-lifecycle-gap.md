---
id: "024"
title: Module folds lack lifecycle operations and source ordering
status: open
severity: build-blocking
category: kernel
source: M4 readiness assessment
related_decisions: [D2, D11, D26]
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

## Related files

- [modules/contract.md](../../modules/contract.md)
- [modules/room-inventory.md](../../modules/room-inventory.md)
- [architecture/data-model.md](../../architecture/data-model.md)
- [archived issue 021](../archived/021-module-owned-entity-fold-boundary.md)
