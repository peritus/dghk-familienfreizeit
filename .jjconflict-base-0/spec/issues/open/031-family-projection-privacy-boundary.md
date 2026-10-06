---
id: "031"
title: Family world projection retains organiser-only derived data
status: needs-decision
severity: privacy
category: kernel
source: semantic-coherence-sweep-after-fix
related_decisions: [D15]
related_milestones: [M10]
opened: 2026-09-25
---

# Family world projection retains organiser-only derived data

## Problem

The family projection filters families, people, labels, constraints, and
capabilities by visible entity, but starts from a spread copy of the complete
world. That leaves `diagnostics` and `summaries` from the organiser world in the
family result. Constraint values and derived capabilities can also retain
references or facts whose sensitivity was determined from hidden labels.

The current family endpoint is an intentional M10 placeholder returning only a
family id, so this is a latent boundary failure rather than a confirmed live
leak. It becomes a concrete privacy defect when the endpoint starts returning the
projected world, diffs, badges, or reports.

## Evidence

- D15 requires server-side privacy projection before `GET /api/family/view` and
  forbids exposing organiser labels, notes, solver traces, or metadata; see
  [`decisions.md`](../../../decisions.md) lines 248–253.
- [`world.ts`](../../../src/events/world.ts) lines 70–91 spreads the full world,
  filters selected collections, but does not replace `diagnostics` or `summaries`.
- The same function retains relation values and filters capabilities only by
  holder entity, not by the sensitivity of their source facts.
- [`worker/index.ts`](../../../src/worker/index.ts) lines 258–262 currently return
  only `{ family_id }`, so the risk is not yet exercised by the live endpoint.

## Recommendation

Define an explicit family-world allowlist rather than shallow-copying the
organiser world. Recompute or filter every derived collection, including
diagnostics, summaries, capabilities, constraints, indexes, relation values,
and metadata. Add adversarial tests containing restricted labels, hidden entity
ids, diagnostics, and module summaries before M10 exposes the projection.

## Open questions

1. Which diagnostics and world summaries, if any, are intentionally family-visible?
2. Should family-visible relation values be redacted, omitted, or replaced with
   stable non-identifying status values when their target is outside the family?

## Related files

- [decisions.md](../../../decisions.md)
- [src/events/world.ts](../../../src/events/world.ts)
- [src/events/fold.ts](../../../src/events/fold.ts)
- [src/worker/index.ts](../../../src/worker/index.ts)
- [application/family-view.md](../../application/family-view.md)
- [application/release-control.md](../../application/release-control.md)
