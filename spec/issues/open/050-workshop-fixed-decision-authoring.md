---
id: "050"
title: Clarify organiser authoring for fixed workshop decisions
status: open
severity: gap
category: module:workshops
source: documentation implementation audit
related_milestones: [M8]
opened: 2026-10-08
---

# Clarify organiser authoring for fixed workshop decisions

## Problem

[M8](../../roadmap.md#m8--organiser-authored-workshop-programme) requires organisers to
inspect explicitly fixed placements and attendance. The event-level decisions
are implemented and the organiser review shows them, but the current screens have
no controls to create or clear `WorkshopAttendanceFixed` or `fixed-placement`
decisions. The accepted but deferred [UI-13 organiser-decisions contract](../../deferred-ideas/organiser-placement-overrides-ui.md)
mentions workshop-specific structured values, but does not say whether it covers
these full-restatement operations. M8 requires inspection, not authoring, so the
decision is whether UI-13 covers these controls or another accepted scope is needed.

## Evidence

The active event and attendance contracts describe fixed-decision semantics in
[official workshops](../../modules/official-workshops.md) and
[workshop attendance](../../modules/workshop-assignment.md). The implemented
[attendance review](../../../docs/modules/workshop-assignment.md) and
[placement review](../../../docs/modules/workshop-scheduling.md) are read-only.

## Recommendation

Keep the event semantics and read-only review as implemented. Clarify whether
the deferred UI-13 contract includes authoring and clearing fixed workshop
attendance and placement. Do not promote this scope to M8 without explicit scope
approval and review of affected binding decisions.

## Open questions

1. Does deferred UI-13 cover the full-restatement `WorkshopAttendanceFixed` event
   and the `fixed-placement` label, or should either operation remain without an
   organiser authoring control?

## Related files

- [roadmap.md](../../roadmap.md)
- [modules/official-workshops.md](../../modules/official-workshops.md)
- [modules/workshop-attendance.md](../../modules/workshop-assignment.md)
- [deferred UI-13 contract](../../deferred-ideas/organiser-placement-overrides-ui.md)
- [docs/modules/official-workshops.md](../../../docs/modules/official-workshops.md)
- [docs/modules/workshop-scheduling.md](../../../docs/modules/workshop-scheduling.md)
- [docs/modules/workshop-assignment.md](../../../docs/modules/workshop-assignment.md)
