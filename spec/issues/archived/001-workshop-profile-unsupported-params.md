---
id: "001"
title: Active profile passes workshop-assignment parameters the module doesn't define
status: resolved
severity: build-blocking
category: module:workshop-assignment
source: coherence-audit-2026-09-19, spec-review-2026-09-19
related_decisions: []
opened: 2026-09-19
---

# Active profile passes workshop-assignment parameters the module doesn't define

## Problem

[`profiles/familienfreizeit-2027.example.ts:443-444`](../../profiles/familienfreizeit-2027.example.ts) calls `workshopAssignment({…})` with
`cancel_under_subscribed: true`.
[`modules/workshop-assignment.md:25-30`](../../modules/workshop-assignment.md) declares `WorkshopAssignmentParams` as
the documented workshop-assignment parameters; the
validation table lists the same fields. [`modules/contract.md:147`](../../modules/contract.md)
fails the build when "a parameter fails its schema", and
[`profiles/contract.md:12-13`](../../profiles/contract.md) confirms "The builder validates the
composition at build time." This is the only module-parameter mismatch in
the whole profile — every other module call matches its document field for
field — and it means the sole active profile cannot compile against its own
module contracts.

`cancel_under_subscribed` additionally asks for a derivation two other
passages forbid: [`modules/workshops.md:95-96`](../../modules/workshops.md) — "Cancellation is an explicit
domain decision; the solver never derives cancellation from attendance or
capacity" — reinforced at [`modules/workshop-assignment.md:51-52`](../../modules/workshop-assignment.md) and by [`architecture/events.md:164`](../../architecture/events.md), which
places `WorkshopCancelled` ownership in the workshops module.

## Recommendation

Before M2: either drop `cancel_under_subscribed` from the active profile, or
define its module semantics, diagnostics and tests in
[`workshop-assignment.md`](../../modules/workshop-assignment.md)/[`workshops.md`](../../modules/workshops.md).
Do not reintroduce automatic cancellation implicitly — it needs to go through
decision review since it contradicts the existing "cancellation is an explicit
domain decision" language. Profile composition must reject unknown parameters,
and the real profile must typecheck once its builders exist.

## Open questions

None. The unsupported parameter is removed from the illustrative active
profile. Automatic cancellation remains out of scope; any future
reintroduction requires a separate decision review.

## Resolution

Removed `cancel_under_subscribed` from `workshopAssignment(...)`. The profile
now matches the four parameters defined by the workshop-assignment contract and
does not imply solver-derived cancellation.

## Related files

- [profiles/familienfreizeit-2027.example.ts](../../profiles/familienfreizeit-2027.example.ts)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [modules/workshops.md](../../modules/workshops.md)
- [modules/contract.md](../../modules/contract.md)
- [profiles/contract.md](../../profiles/contract.md)
- [architecture/events.md](../../architecture/events.md)
