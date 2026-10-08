---
id: "021"
title: Module-owned entity and event contributions have no fold boundary
status: resolved
severity: build-blocking
category: kernel
source: M4 implementation investigation
related_decisions: [D2, D11, D26]
opened: 2026-09-21
---

# Module-owned entity and event contributions have no fold boundary

## Problem

The kernel's event parser and `derive`/`applyEvent` fold
([`architecture/events.md`](../../architecture/events.md),
[`architecture/data-model.md`](../../architecture/data-model.md) §1) are a
closed union of the kernel's own seven event types and two entity kinds
(`family`, `person`). [`modules/contract.md`](../../modules/contract.md) §3
already specifies that a selected module contributes `entity_kinds` and
`events` — each event with its own payload schema and fold function — through
`ModuleContributions`, and §3.1 is explicit that a contributed fold function
"may create entity identity and emit labels; it may not emit derived
results," with entity-kind ids scoped so "the fold rejects an id reused under
another kind." None of this has an executable path today: `ModuleContributions`
carries only bare `{ id }` / `{ type }` records with no schema or fold
callback, and nothing in `defineOccasionProfile` or `derive` composes a
selected module's contributions into the event parser or the fold.

Building any module that owns its own entities (room inventory, workshops,
materials, …) requires this mechanism first. Adding module event types
directly to the kernel's closed union instead — the shortcut a previous,
now-abandoned attempt took — reintroduces exactly the coupling
[modules/contract.md](../../modules/contract.md) §4 forbids: "An unselected
module contributes nothing: no entity kind, event type, ..." stops being true
the moment the kernel itself knows a module-specific type, because the type
then replays and validates regardless of which profile selected it.

## Evidence

| Required behavior (module contract) | Missing executable boundary |
|---|---|
| A selected module contributes its own entity kinds and event types with a payload schema and fold function (§3, §3.1). | `ModuleContributions.entity_kinds`/`.events` carry no schema or fold callback; nothing merges them into the parser or fold. |
| An unselected module contributes no event type or entity kind (§4.2); an event of a type no selected module defines fails replay. | The event parser (`src/events/types.ts`) is a closed, compile-time union — there is no per-profile parser to fail against. |
| A contributed fold function may create entity identity and emit labels, and the fold rejects an id reused under another kind (§3, §3.1). | `derive`/`applyEvent` (`src/events/fold.ts`) mutate a fixed `MutableWorld` shape with two hardcoded kernel kinds; there is no generic per-kind entity store and no scoped capability a module's fold could safely receive. |

## Recommendation

Before any module that owns entities can be implemented, extend
`ModuleContributions.events` to carry `{ type, payload: ZodType, fold }` and
`.entity_kinds` to carry `{ id, prefix, identity }`, matching
[modules/contract.md](../../modules/contract.md) §3.1 exactly.
`defineOccasionProfile` should compose, from the selected modules, a merged
event-payload-schema map and a single-owner event-type→fold dispatch table
(failing the build on a duplicate event type or entity-kind/prefix
collision, extending the existing duplicate-contribution checks), and
`derive`/`applyEvent` should fall back to that dispatch table for any event
type outside the kernel's own seven. The dispatch table should hand a
module's fold function a narrow capability — create an entity of one of that
module's own declared kinds, set a label under one of its own declared keys —
rather than the raw mutable world, so the "may create identity and emit
labels, may not emit derived results" boundary is enforced by construction,
not by convention. `World` needs a generic per-kind entity bucket
alongside its existing `families`/`persons` fields for module-owned entities
to land in.

This should be built and proven against a synthetic module invented purely
for the test (one entity kind, one event), not against a real inventory
module — building the actual `room-inventory` module is separate,
already-scoped M4 work and should not gate this boundary landing.

## Open questions

None.

## Resolution

Implemented as recommended, proven against a synthetic `fixture-widgets`
module rather than a real one:

- `ModuleContributions.entity_kinds` now carries `{ id, prefix }` and
  `.events` carries `{ type, payload: ZodType<JsonValue>, fold }`
  (`src/config/define.ts`). The `identity` (`caller-generated` vs `derived`)
  distinction from the recommendation above was **not** added — no module
  yet needs fold-derived ids (room-inventory's `place` kind will be the
  first), so it's left for whoever builds that to add rather than speculated
  on now.
- `src/events/types.ts`'s `Event`/`parseEvent` opened from a closed
  `KernelEvent` union to `KernelEvent | { type: string; payload: JsonValue }`,
  parameterized by an optional merged schema map (`kernelPayloadSchemas` by
  default).
- `src/events/fold.ts` gained `World.entities_by_kind` (one sorted
  collection per kind, kernel and module alike), `ModuleFoldCapability`
  (`createEntity`, `setLabel`), and `guardModuleFold`, which wraps a raw
  module fold function so every capability call is checked against that
  module's own declared kinds/keys before it reaches real world state —
  the actual "may create identity and emit labels" enforcement, done by
  construction rather than convention. A single `entities_by_id` map now
  backs "an id reused under another kind" for kernel and module entities
  alike.
- `defineOccasionProfile`'s `validationView` (`src/config/define.ts`) composes
  the merged `event_payload_schemas` and `event_fold_dispatch` from selected
  modules, wrapping each module's fold in `guardModuleFold`; `validateModules`
  now reserves the kernel's own entity kinds/event types against module
  shadowing and rejects a cross-module entity-kind prefix collision, extending
  the existing duplicate-contribution checks.
- Proven by `test/events/module-fold-boundary.test.ts`: a selected synthetic
  module's event creates an entity and a label through the composed dispatch;
  an event type no selected module defines still fails replay (§4.2); a fold
  attempting to touch an undeclared entity kind or label key is rejected; an
  id reused under another kind is rejected.

Building a real `room-inventory` module against this mechanism remains
separate, out-of-scope work.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [architecture/data-model.md](../../architecture/data-model.md)
- [architecture/events.md](../../architecture/events.md)
