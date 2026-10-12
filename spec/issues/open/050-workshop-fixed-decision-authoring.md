---
id: "050"
title: Clarify organiser authoring for fixed workshop placements
status: open
severity: gap
category: module:workshops
source: documentation implementation audit
related_milestones: [M8]
opened: 2026-10-08
---

# Clarify organiser authoring for fixed workshop placements

## Problem

[M8](../../roadmap.md#m8--organiser-authored-workshop-programme) requires organisers to
inspect explicitly fixed placements and attendance. Fixed attendance can now be
created and cleared from the allocation screen through paired generic
`needs`/`provides` labels. The workshop programme review still has no controls to
create or clear the `fixed-placement` decision. The accepted but deferred
[UI-13 organiser-decisions contract](../../deferred-ideas/organiser-placement-overrides-ui.md)
mentions workshop-specific structured values, but does not say whether it covers
fixed placement authoring. M8 requires inspection, not authoring, so the open
question is whether UI-13 should cover these controls or another accepted scope
is needed.

## Evidence

The active workshop and attendance contracts describe fixed-decision semantics in
[official workshops](../../../docs/modules/official-workshops.md) and
[workshop attendance](../../modules/workshop-assignment.md). The implemented
[attendance controls and review](../../../docs/modules/workshop-assignment.md)
support authoring and clearing; the
[placement review](../../../docs/modules/workshop-scheduling.md) remains read-only.

The previous year's course plan was made by editing a course-to-slot table by
hand until a score stopped improving; see the
[Kurszuordnung_V2.xlsx analysis](../../prior-art/kurszuordnung-v2.md). In this
repository the only way to apply such a plan is a `fixed-placement` decision on
each workshop. The
[previous-year fixture test](../../../test/solver/workshop-assignment-kurszuordnung-v2.test.ts)
applies the hand-made plan and the best plan found by exhaustive search as fixed
placements and reproduces their outcomes exactly: 61 and 64 of 66 children with
two courses, against 59 under automatic placement. Without an organiser control,
those decisions can only be written as raw label events.

The [demand-aware scheduling proposal](../../deferred-ideas/demand-aware-workshop-scheduling.md#6-single-placement-path)
keeps fixed placements as the only organiser override of the placement stage and
rejects a separate plan-suggestion path. Authoring therefore stays the only way
for an organiser to choose a slot plan, with or without demand-aware placement.

## Recommendation

Keep fixed placement semantics and the read-only review as implemented. Clarify
whether the deferred UI-13 contract includes authoring and clearing fixed
workshop placements. Do not promote this scope to M8 without explicit scope
approval and review of affected binding decisions.

## Open questions

1. Does deferred UI-13 cover authoring and clearing the `fixed-placement` label,
   or should this operation remain without an organiser control?
2. Is fixed placement authoring needed before demand-aware placement exists,
   given that it is currently the only way to apply a better slot plan than
   first-feasible placement?

## Related files

- [roadmap.md](../../roadmap.md)
- [modules/workshop-attendance.md](../../modules/workshop-assignment.md)
- [deferred UI-13 contract](../../deferred-ideas/organiser-placement-overrides-ui.md)
- [docs/modules/official-workshops.md](../../../docs/modules/official-workshops.md)
- [docs/modules/workshop-scheduling.md](../../../docs/modules/workshop-scheduling.md)
- [docs/modules/workshop-assignment.md](../../../docs/modules/workshop-assignment.md)
- [Kurszuordnung_V2.xlsx analysis](../../prior-art/kurszuordnung-v2.md)
- [demand-aware workshop scheduling](../../deferred-ideas/demand-aware-workshop-scheduling.md)
