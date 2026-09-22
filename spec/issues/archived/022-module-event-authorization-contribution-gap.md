---
id: "022"
title: Module events have no authorization contribution path
status: resolved
severity: gap
category: kernel
source: M4 readiness assessment
related_decisions: []
opened: 2026-09-21
---

# Module events have no authorization contribution path

## Problem

[`modules/contract.md`](../../modules/contract.md) §3.1 says the `events`
contribution carries "Event type, zod payload schema, fold function, append
invariants, and **the authorisation rule**." [Issue 021](../archived/021-module-owned-entity-fold-boundary.md)
implemented the first four — `ModuleContributions.events` now carries
`{ type, payload, fold }` and composes into `derive`'s dispatch — but not the
authorisation rule. There is still no way for a module to declare who may
append its event types.

`src/auth/authorization.ts`'s `canAppendEvent` only has explicit branches for
the kernel's own seven event types. For anything else, a family principal
falls into this fallback:

```ts
const entityId =
  event.type === 'PersonAdded' || event.type === 'PersonUpdated'
    ? (event as unknown as PersonAdded | PersonUpdated).payload.family_id
    : event.type === 'PersonWithdrawn'
      ? (event as unknown as PersonWithdrawn).payload.person_id
      : (event as unknown as LabelSet | LabelCleared).payload.entity_id
```

For a module event like `BuildingAdded`, this casts the payload to
`LabelSet | LabelCleared` and reads a `.entity_id` field that doesn't exist —
`undefined`. `familyForEntity(world, undefined)` then resolves to `null`,
which never equals `principal.family_id`, so the family principal is denied.
An organiser principal returns `true` unconditionally at the top of the
function regardless of event type.

## Evidence

[`modules/room-inventory.md`](../../modules/room-inventory.md) §5 states "All
inventory events are organiser-only" — for that specific module, the
fallback's accidental denial of family principals happens to be the right
outcome. But it is an accident of the payload shape not matching
`LabelSet | LabelCleared`, not a designed rule: nothing in
`ModuleContributions.events` lets a module say "organiser-only" or "family
may append this for entities it owns" the way kernel events do. The
[materials](../../modules/materials.md) catalogue entry ("Material requests,
commitments, and fulfilment") strongly implies at least some future module
event types are meant to be family-authored, at which point this fallback
would need to positively authorize a family principal it currently has no
mechanism to recognize — silently denying every family-authored module event
regardless of intent, with no test to catch the gap because no such module
exists yet.

## Recommendation

Extend `ModuleContributions.events` with an authorization field per event
(for example `authorize(principal, payload, world) => boolean`, or a coarser
`organiser_only: boolean` if per-module authorization logic turns out to
never need more than that), and thread it into `canAppendEvent`'s dispatch
for non-kernel event types the same way `event_fold_dispatch` was composed in
`defineOccasionProfile`. Design this before or alongside the first real
module event (room-inventory's `BuildingAdded`), not after, so the
mechanism has a real caller to validate it against rather than only a
synthetic one.

## Open questions

1. Should the authorization rule be a pure predicate function (module-owned,
   like `fold`), or a small closed vocabulary (`organiser-only`,
   `family-owns-entity`, …) the kernel interprets, matching how
   `LabelSchema.family_writable` works for labels today?

## Resolution

Implemented the pure-predicate option: `ModuleContributions.events` now
requires `authorize: (principal, payload, world) => boolean` per event
(`src/config/define.ts`), typed against a structural `ModuleEventPrincipal`
kept independent of the auth module's I/O-adjacent `Principal` type
(`src/events/fold.ts`). `defineOccasionProfile`'s `validationView` composes a
single-owner `event_authorize_dispatch` map from selected modules' declared
rules, the same way `event_fold_dispatch` already worked.

`canAppendEvent` (`src/auth/authorization.ts`) now recognizes exactly the
kernel's own five entity-touching event types
(`PersonAdded`/`PersonUpdated`/`PersonWithdrawn`/`LabelSet`/`LabelCleared`)
and dispatches every other event type to `config.event_authorize_dispatch`,
fixing the broken payload cast described above. A module event with no
declared rule now **fails closed** (denied) rather than accidentally denying
or, worse, silently permitting once a payload shape happens to line up with
`LabelSet`/`LabelCleared`'s fields. An organiser still bypasses per-event
authorization entirely, unchanged from before — nothing in this issue asked
for that to become per-module configurable.

Proven in `test/config/authorization.test.ts`: a module event with no
declared rule denies a family principal; a module event dispatches to its own
declared predicate (both allow and deny); an organiser is unaffected by a
module's declared rule. `test/events/module-fold-boundary.test.ts`'s fixture
modules all now declare `authorize`, required by the type.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [modules/room-inventory.md](../../modules/room-inventory.md)
- [architecture/events.md](../../architecture/events.md)
