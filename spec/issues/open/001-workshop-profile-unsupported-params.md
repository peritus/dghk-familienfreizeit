---
id: "001"
title: Active profile passes workshop-assignment parameters the module doesn't define
status: needs-decision
severity: build-blocking
category: module:workshop-assignment
source: coherence-audit-2026-09-19, spec-review-2026-09-19
related_decisions: []
opened: 2026-09-19
---

# Active profile passes workshop-assignment parameters the module doesn't define

## Problem

[`profiles/familienfreizeit-2027.example.ts:443-444`](../../profiles/familienfreizeit-2027.example.ts) calls `workshopAssignment({…})` with
`co_assignment_tag: 'workshop-with'` and `cancel_under_subscribed: true`.
[`modules/workshop-assignment.md:25-30`](../../modules/workshop-assignment.md) declares `WorkshopAssignmentParams` as
exactly `objectives`, `top_n`, `rank_weights`, `fill_unassigned`; the
validation table at `:38-43` lists the same four fields. [`modules/contract.md:147`](../../modules/contract.md)
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
places `WorkshopCancelled` ownership in the workshops module. `workshop-with`
also appears in family-facing controls with no corresponding module tag.

## Recommendation

Before M2: either drop `co_assignment_tag` and `cancel_under_subscribed` from
the active profile, or define their module semantics, diagnostics and tests
in [`workshop-assignment.md`](../../modules/workshop-assignment.md)/[`workshops.md`](../../modules/workshops.md). Do not reintroduce automatic cancellation or co-assignment
implicitly — if that capability is wanted, it needs to go through decision
review since it contradicts the existing "cancellation is an explicit domain
decision" language. Profile composition must reject unknown parameters, and
the real profile must typecheck once its builders exist.

## Open questions

1. Is `co_assignment_tag` a feature [`workshop-assignment.md`](../../modules/workshop-assignment.md) should regain, or residue to drop
   from the profile?
2. Drop `cancel_under_subscribed`, or reopen the cancellation-derivation rule
   in [`workshops.md`](../../modules/workshops.md) §5 (which [`AGENTS.md`](../../../AGENTS.md) would route through decision review)?

## Related files

- [profiles/familienfreizeit-2027.example.ts](../../profiles/familienfreizeit-2027.example.ts)
- [modules/workshop-assignment.md](../../modules/workshop-assignment.md)
- [modules/workshops.md](../../modules/workshops.md)
- [modules/contract.md](../../modules/contract.md)
- [profiles/contract.md](../../profiles/contract.md)
- [architecture/events.md](../../architecture/events.md)
