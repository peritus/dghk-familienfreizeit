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

## Recommendation

Keep fixed placement semantics and the read-only review as implemented. Clarify
whether the deferred UI-13 contract includes authoring and clearing fixed
workshop placements. Do not promote this scope to M8 without explicit scope
approval and review of affected binding decisions.

## Open questions

1. Does deferred UI-13 cover authoring and clearing the `fixed-placement` label,
   or should this operation remain without an organiser control?

## Related files

- [roadmap.md](../../roadmap.md)
- [modules/workshop-attendance.md](../../modules/workshop-assignment.md)
- [deferred UI-13 contract](../../deferred-ideas/organiser-placement-overrides-ui.md)
- [docs/modules/official-workshops.md](../../../docs/modules/official-workshops.md)
- [docs/modules/workshop-scheduling.md](../../../docs/modules/workshop-scheduling.md)
- [docs/modules/workshop-assignment.md](../../../docs/modules/workshop-assignment.md)
